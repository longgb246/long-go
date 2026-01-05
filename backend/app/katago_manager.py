"""
KataGo 进程管理器
负责启动、通信、命令队列管理
"""

import asyncio
import os
import re
from typing import Optional, List, Dict, Set
from pathlib import Path
import logging

from .utils import (
    coordinate_to_gtp,
    gtp_to_coordinate,
    board_to_gtp,
    get_strategic_reason,
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 常量
MAX_BUFFER_SIZE = 50 * 1024 * 1024  # 50MB
COMMAND_TIMEOUT = 30  # 30秒超时
ANALYZE_SILENCE_TIMEOUT = 2  # 2秒静默检测


class KataGoManager:
    """KataGo 进程管理器"""

    def __init__(self):
        self.process: Optional[asyncio.subprocess.Process] = None
        self.is_ready = False
        self.command_queue: asyncio.Queue = asyncio.Queue()
        self.is_processing = False
        self.response_buffer = ""
        self.buffer_warning_shown = False
        self.request_lock = asyncio.Lock()
        self.current_command: Optional[Dict] = None  # 当前正在处理的命令
        self.stderr_tree_buffer = ""  # 用于捕获 stderr 的搜索树输出
        self.capturing_tree = False  # 是否正在捕获搜索树

        # 获取路径配置
        backend_dir = Path(__file__).parent.parent
        self.katago_path = os.getenv("KATAGO_PATH", str(backend_dir / "bin" / "katago"))
        self.config_path = os.getenv(
            "KATAGO_CONFIG", str(backend_dir / "katago_config.cfg")
        )
        self.model_path = os.getenv(
            "KATAGO_MODEL", str(backend_dir / "models" / "katago_model.bin.gz")
        )

        # 正常日志模式（用于过滤 stderr 输出）
        self.normal_patterns = [
            "KataGo v",
            "Using",
            "rules",
            "Initializing",
            "Loaded",
            "Model name",
            "GTP ready",
            "beginning main protocol loop",
            "nnRandSeed",
            "After dedups",
            "nnModelFile",
            "backend thread",
            "Model version",
            "CPU thread",
            "Eigen",
            "OpenCL",
            "CUDA",
            "useFP16",
            "useNHWC",
            # 配置输出
            "Running with following config:",
            "allowResignation",
            "analysisWideRootNoise",
            "chosenMoveTemperature",
            "fpuReductionMax",
            "lagBuffer",
            "logAllGTPCommunication",
            "logFile",
            "logSearchInfo",
            "logToStderr",
            "maxPlayouts",
            "maxTime",
            "maxVisits",
            "nnCacheSizePowerOfTwo",
            "nnMaxBatchSize",
            "nnMutexPoolSize",
            "numAnalysisThreads",
            "numGameThreads",
            "numSearchThreads",
            "policyOptimism",
            "resignConsecTurns",
            "resignThreshold",
            "rootFpuReductionMax",
            "rootPolicyOptimism",
            "rootSymmetryPruning",
            "uncertaintyCoeff",
            "uncertaintyExponent",
            "useUncertainty",
            "GTP Engine starting",
            # 配置警告
            "WARNING: Config had unused keys",
            "WARNING: Unused key",
            # 搜索输出
            "MoveNum:",
            "HASH:",
            "Time taken:",
            "Root visits:",
            "New playouts:",
            "NN rows:",
            "NN batches:",
            "NN avg batch size:",
            "PV:",
            "Tree:",
            "---White",
            "---Black",
            "koSIMPLE",
            "LCB",
            "WF",
            "PSV",
            # 棋盘显示（包含棋盘坐标和棋子）
            "A B C D E F G H J K L M N O P Q R S T",
            ". . .",
            "X",
            "O",
            "@",
        ]

    async def start(self):
        """启动 KataGo 进程"""
        logger.info("正在启动 KataGo...")

        try:
            self.process = await asyncio.create_subprocess_exec(
                self.katago_path,
                "gtp",
                "-model",
                self.model_path,
                "-config",
                self.config_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            # 启动输出监听任务
            asyncio.create_task(self._read_stdout())
            asyncio.create_task(self._read_stderr())
            asyncio.create_task(self._process_command_queue())

            logger.info("KataGo 进程已启动")

        except Exception as e:
            logger.error(f"启动 KataGo 失败: {e}")
            raise

    async def _read_stdout(self):
        """读取标准输出"""
        while self.process and self.process.stdout:
            try:
                line = await self.process.stdout.readline()
                if not line:
                    break

                output = line.decode("utf-8", errors="ignore")
                await self._handle_response(output)

            except Exception as e:
                logger.error(f"读取 stdout 错误: {e}")
                break

    async def _read_stderr(self):
        """读取标准错误输出"""
        while self.process and self.process.stderr:
            try:
                line = await self.process.stderr.readline()
                if not line:
                    break

                output = line.decode("utf-8", errors="ignore")

                # 检查是否就绪
                if "GTP ready" in output:
                    self.is_ready = True
                    logger.info("✅ KataGo 已就绪")
                    continue

                # 捕获搜索树输出（用于 genmove 的候选着法解析）
                if "---White" in output or "---Black" in output:
                    self.capturing_tree = True
                    self.stderr_tree_buffer = output
                    continue

                if self.capturing_tree:
                    # 继续捕获搜索树行
                    # 搜索树行的特征：
                    # 1. 以坐标开头（如 "R5  :"）- 候选着法
                    # 2. 以 ": T" 开头 - 根节点汇总（跳过）
                    # 3. 空行或其他 - 搜索树结束
                    if re.match(r"^[A-Z]\d+\s+:", output):
                        # 候选着法行
                        self.stderr_tree_buffer += output
                    elif re.match(r"^:\s+T\s+", output):
                        # 根节点汇总行，跳过但继续捕获
                        continue
                    else:
                        # 搜索树结束
                        self.capturing_tree = False
                        # 如果当前命令需要搜索树数据，保存它
                        if self.current_command and self.current_command.get(
                            "need_tree"
                        ):
                            self.current_command["tree_data"] = self.stderr_tree_buffer
                        self.stderr_tree_buffer = ""
                # 过滤正常日志
                is_normal = any(pattern in output for pattern in self.normal_patterns)
                is_truncated = len(output.strip()) < 30 and re.match(
                    r"^\d{4}-\d{2}-\d{2}", output.strip()
                )

                if not is_normal and not is_truncated and output.strip():
                    logger.error(f"{output.strip()}")

            except Exception as e:
                logger.error(f"读取 stderr 错误: {e}")
                break

    async def _handle_response(self, output: str):
        """处理 KataGo 响应"""
        self.response_buffer += output

        # 缓冲区大小限制
        if len(self.response_buffer) > MAX_BUFFER_SIZE:
            if not self.buffer_warning_shown:
                logger.warning(
                    f"⚠️ 响应缓冲区过大 ({len(self.response_buffer) // 1024 // 1024}MB)，自动截断"
                )
                self.buffer_warning_shown = True

            # 保留最后的完整行
            last_newline = self.response_buffer.rfind(
                "\n", 0, int(MAX_BUFFER_SIZE * 0.8)
            )
            if last_newline != -1:
                self.response_buffer = self.response_buffer[last_newline + 1 :]
            else:
                self.response_buffer = self.response_buffer[-25 * 1024 * 1024 :]

        # 检查是否有当前正在处理的命令
        if not self.current_command:
            return

        # 所有命令都使用普通响应处理（不再特殊处理 kata-analyze）
        await self._handle_normal_response(self.current_command)

    async def _handle_normal_response(self, cmd: Dict):
        """处理普通 GTP 命令响应"""
        # 检查双换行符
        double_newline_index = self.response_buffer.find("\n\n")

        if double_newline_index != -1:
            # 提取完整响应
            response = self.response_buffer[:double_newline_index].strip()
            self.response_buffer = self.response_buffer[double_newline_index + 2 :]

            # 取消超时定时器
            if "timeout_timer" in cmd:
                cmd["timeout_timer"].cancel()

            if not cmd["future"].done():
                cmd["future"].set_result(response)

            self.is_processing = False
            self.current_command = None

            # 递归处理缓冲区中可能存在的其他响应
            if "\n\n" in self.response_buffer:
                await self._handle_response("")

    async def _timeout_handler(self, cmd: Dict, delay: float):
        """超时处理器"""
        try:
            await asyncio.sleep(delay)

            if not cmd["future"].done():
                cmd["future"].set_exception(Exception("KataGo 响应超时"))

            self.response_buffer = ""
            self.is_processing = False
            self.current_command = None

        except asyncio.CancelledError:
            pass

    async def _process_command_queue(self):
        """处理命令队列"""
        while True:
            if self.is_processing:
                await asyncio.sleep(0.1)
                continue

            try:
                cmd = await self.command_queue.get()
                self.is_processing = True
                self.current_command = cmd

                # 创建超时定时器
                cmd["timeout_timer"] = asyncio.create_task(
                    self._timeout_handler(cmd, COMMAND_TIMEOUT)
                )

                # 发送命令
                if self.process and self.process.stdin:
                    self.process.stdin.write((cmd["command"] + "\n").encode())
                    await self.process.stdin.drain()
                else:
                    if not cmd["future"].done():
                        cmd["future"].set_exception(Exception("KataGo 进程未启动"))
                    self.is_processing = False
                    self.current_command = None

            except Exception as e:
                logger.error(f"命令队列处理错误: {e}")
                if "cmd" in locals() and not cmd["future"].done():
                    cmd["future"].set_exception(e)
                self.is_processing = False
                self.current_command = None

    async def send_command(self, command: str, need_tree: bool = False) -> str:
        """
        发送 GTP 命令

        Args:
            command: GTP 命令字符串
            need_tree: 是否需要捕获 stderr 的搜索树输出

        Returns:
            命令响应
        """
        if not self.is_ready:
            raise Exception("KataGo 未就绪")

        future = asyncio.Future()
        cmd = {"command": command, "future": future, "need_tree": need_tree}

        await self.command_queue.put(cmd)

        # 等待命令完成
        result = await future

        # 如果需要搜索树数据，等待更长时间确保 stderr 完全捕获
        if need_tree:
            await asyncio.sleep(1.5)  # 增加到 1.5 秒
            tree_data = cmd.get("tree_data", "")
            return {"stdout": result, "tree": tree_data}

        return result

    async def get_ai_move(
        self, board: List[List[int]], size: int, player: int, ai_level: str
    ) -> Dict:
        """
        获取 AI 着法（使用 genmove + stderr 搜索树解析）

        Args:
            board: 棋盘数组
            size: 棋盘大小
            player: 当前玩家（1=黑，2=白）
            ai_level: AI 等级

        Returns:
            着法信息字典
        """
        # 清空棋盘
        logger.info("[API] 清空棋盘...")
        await self.send_command("clear_board")
        await self.send_command(f"boardsize {size}")

        # 重建棋盘状态
        moves = board_to_gtp(board, size)
        logger.info(f"[API] 重建棋盘状态: {len(moves)} 步棋")
        for move in moves:
            await self.send_command(f"play {move['color']} {move['coord']}")

        # 确定玩家颜色
        player_color = "B" if player == 1 else "W"

        # 使用 genmove 并捕获 stderr 搜索树
        result = await self.send_command(f"genmove {player_color}", need_tree=True)

        # 解析 stdout 响应（最终选择的着法）
        stdout_result = result["stdout"] if isinstance(result, dict) else result
        match = re.search(r"=\s*([A-Z]\d+|pass|resign)", stdout_result, re.IGNORECASE)

        if not match:
            raise Exception("无法获取 AI 着法")

        move_str = match.group(1).upper()

        if move_str in ["PASS", "RESIGN"]:
            return {
                "x": -1,
                "y": -1,
                "winRate": 50.0,
                "scoreLead": 0.0,
                "reason": "AI 选择停着" if move_str == "PASS" else "AI 认输",
            }

        # 解析 stderr 搜索树获取候选着法
        tree_data = result.get("tree", "") if isinstance(result, dict) else ""
        candidate_moves = self._parse_search_tree(tree_data, size) if tree_data else []

        # 如果没有候选着法，使用 stdout 的结果
        if not candidate_moves:
            logger.warning("[API] 未找到搜索树数据，使用 genmove 结果")
            x, y = gtp_to_coordinate(move_str, size)
            return {
                "x": x,
                "y": y,
                "winRate": 50.0,
                "scoreLead": 0.0,
                "reason": "KataGo 推荐",
            }

        # 根据 AI 等级选择着法
        selected_move = self._select_move_by_level(candidate_moves, ai_level)
        return selected_move

    async def get_ai_analysis(
        self, board: List[List[int]], size: int, player: int
    ) -> Dict:
        """
        获取多步推荐分析（使用 genmove + stderr 搜索树解析）

        Args:
            board: 棋盘数组
            size: 棋盘大小
            player: 当前玩家

        Returns:
            分析结果字典
        """
        # 清空棋盘并设置棋盘大小
        await self.send_command("clear_board")
        await self.send_command(f"boardsize {size}")

        # 设置棋盘状态
        moves = board_to_gtp(board, size)
        for move in moves:
            await self.send_command(f"play {move['color']} {move['coord']}")

        # 请求 AI 分析
        player_color = "B" if player == 1 else "W"

        # 使用 genmove 并捕获 stderr 搜索树
        result = await self.send_command(f"genmove {player_color}", need_tree=True)

        # 解析 stderr 搜索树获取所有候选着法
        tree_data = result.get("tree", "") if isinstance(result, dict) else ""
        candidate_moves = self._parse_search_tree(tree_data, size) if tree_data else []

        if not candidate_moves:
            raise Exception("无法获取分析结果")

        # 返回所有候选着法（最多 10 个）
        top_moves = candidate_moves[:10]

        logger.info(f"✅ [API] 返回 {len(top_moves)} 个候选着法")

        return {"moves": top_moves, "bestMove": top_moves[0]}

    def _parse_search_tree(self, tree_data: str, size: int) -> List[Dict]:
        """
        解析 stderr 搜索树输出

        格式示例：
        ---White(^)---
        R5  : T  28.90c W  28.68c S   0.44c ( +1.8 L  +1.1) LCB   27.11c P 31.01% WF 147.2 PSV     217 N      51  --  R5 P4

        Args:
            tree_data: stderr 搜索树数据
            size: 棋盘大小

        Returns:
            候选着法列表
        """
        try:
            lines = tree_data.split("\n")
            moves = []
            seen_positions: Set[str] = set()

            for line in lines:
                # 匹配搜索树行：R17 : T  28.83c W  28.59c S   0.42c ( +1.7 L  +1.1) LCB   27.12c P 39.58% WF 195.7 PSV     194 N      70
                # 关键字段：坐标、T、W、S、L、N
                # 注意：括号内的格式是 "( +1.7 L  +1.1)" 有空格
                match = re.search(
                    r"^([A-Z]\d+)\s+:\s+T\s+([-\d.]+)c\s+W\s+([-\d.]+)c\s+S\s+([-\d.]+)c\s+\(\s+([-+\d.]+)\s+L\s+([-+\d.]+)\s*\).*?N\s+(\d+)",
                    line,
                )

                if match:
                    move_str = match.group(1)  # 如 R5
                    total_score = float(match.group(2))  # T 值
                    winrate_centipawns = float(match.group(3))  # W 值（厘兵）
                    score_centipawns = float(match.group(4))  # S 值
                    score_lead = float(match.group(6))  # L 值
                    visits = int(match.group(7))  # N 值

                    # 转换坐标
                    x, y = gtp_to_coordinate(move_str, size)
                    position_key = f"{x},{y}"

                    # 去重
                    if position_key in seen_positions:
                        continue
                    seen_positions.add(position_key)

                    # 将 W 值（厘兵）转换为胜率百分比
                    # W 值是相对于 50% 的偏移，单位是厘兵（centipawns）
                    # 大约 100 厘兵 ≈ 10% 胜率变化
                    winrate = 50.0 + (winrate_centipawns / 10.0)
                    winrate = max(0.0, min(100.0, winrate))  # 限制在 0-100

                    moves.append(
                        {
                            "x": x,
                            "y": y,
                            "winRate": round(winrate, 1),
                            "scoreLead": round(score_lead, 1),
                            "visits": visits,
                            "order": len(moves),  # 按出现顺序
                            "reason": get_strategic_reason(winrate, score_lead),
                        }
                    )

            logger.info(f"📊 [解析] 从搜索树解析出 {len(moves)} 个候选着法")
            if moves:
                for i, move in enumerate(moves[:5]):  # 只打印前 5 个
                    logger.info(
                        f"   [{i}] 位置: ({move['x']}, {move['y']}), 胜率: {move['winRate']}%, visits: {move['visits']}"
                    )
            else:
                logger.warning(f"[解析] 未能解析出候选着法，搜索树数据前 : {tree_data}")

            return moves

        except Exception as e:
            logger.error(f"[解析] 解析搜索树时出错: {e}")
            logger.error(f"[解析] 搜索树数据前 : {tree_data}")
            return []

    def _select_move_by_level(self, moves: List[Dict], ai_level: str) -> Dict:
        """根据 AI 等级选择着法"""
        if not moves:
            return None

        # 确定目标 order
        if ai_level == "master":
            target_order = 0
        elif ai_level == "expert":
            target_order = 1
        elif ai_level == "intermediate":
            target_order = 2
        else:
            target_order = 0

        # 查找对应 order 的着法
        for move in moves:
            if move["order"] == target_order:
                return move

        # 如果没找到，返回最后一个
        return moves[-1]

    async def stop(self):
        """停止 KataGo 进程"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            logger.info("KataGo 进程已停止")
