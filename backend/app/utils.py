"""
工具函数：坐标转换、棋盘解析等
"""
from typing import List, Tuple, Dict
import random


# GTP 坐标字母（跳过 I）
GTP_LETTERS = "ABCDEFGHJKLMNOPQRST"


def coordinate_to_gtp(x: int, y: int, size: int) -> str:
    """
    将数组坐标转换为 GTP 格式
    
    Args:
        x: X 坐标（0-18）
        y: Y 坐标（0-18）
        size: 棋盘大小
        
    Returns:
        GTP 格式坐标，如 'A19', 'D16'
    """
    col = GTP_LETTERS[x]
    row = size - y
    return f"{col}{row}"


def gtp_to_coordinate(gtp: str, size: int) -> Tuple[int, int]:
    """
    将 GTP 格式坐标转换为数组坐标
    
    Args:
        gtp: GTP 格式坐标，如 'A19', 'D16'
        size: 棋盘大小
        
    Returns:
        (x, y) 元组
    """
    col = GTP_LETTERS.index(gtp[0].upper())
    row = size - int(gtp[1:])
    return (col, row)


def board_to_gtp(board: List[List[int]], size: int) -> List[Dict[str, str]]:
    """
    将棋盘数组转换为 GTP 着法列表
    
    Args:
        board: 棋盘数组，0=空，1=黑，2=白
        size: 棋盘大小
        
    Returns:
        着法列表，格式：[{'color': 'B', 'coord': 'A19'}, ...]
    """
    moves = []
    for y in range(size):
        for x in range(size):
            stone = board[y][x]
            if stone != 0:
                color = 'B' if stone == 1 else 'W'
                coord = coordinate_to_gtp(x, y, size)
                moves.append({'color': color, 'coord': coord})
    return moves


def get_strategic_reason(winrate: float, score: float) -> str:
    """
    根据胜率和目数生成战略理由
    
    Args:
        winrate: 胜率（0-100）
        score: 目数领先
        
    Returns:
        战略理由描述
    """
    if winrate > 70:
        if score > 10:
            return "优势局面，扩大领先"
        else:
            return "胜率领先，稳健发展"
    elif winrate >= 55:
        return "均势局面，争夺要点"
    elif winrate >= 45:
        return "局面复杂，寻求变化"
    else:
        if score < -10:
            return "劣势局面，积极搏杀"
        else:
            return "落后局面，寻求转机"


def select_move_by_level(moves: List[Dict], ai_level: str) -> Dict:
    """
    根据 AI 等级选择着法
    
    Args:
        moves: 候选着法列表
        ai_level: AI 等级（master/expert/intermediate/beginner）
        
    Returns:
        选中的着法
    """
    if not moves:
        return None
    
    # 确定目标 order
    if ai_level == "master":
        target_order = 0
    elif ai_level == "expert":
        target_order = 1
    elif ai_level == "intermediate":
        target_order = 2
    elif ai_level == "beginner":
        # 随机选择第 3-4 个
        target_order = random.choice([3, 4])
    else:
        target_order = 0
    
    # 查找对应 order 的着法
    for move in moves:
        if move.get('order') == target_order:
            return move
    
    # 如果没找到，返回最后一个
    return moves[-1]
