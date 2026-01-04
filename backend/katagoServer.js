const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// KataGo 进程管理
let katagoProcess = null;
let isReady = false;
let pendingRequests = [];
let isProcessingAIRequest = false; // 添加请求锁

// 启动 KataGo GTP 进程
function startKataGo() {
  console.log('正在启动 KataGo...');
  
  // 查找 KataGo 配置文件
  const katagoPath = process.env.KATAGO_PATH || path.join(__dirname, 'bin', 'katago');
  const configPath = process.env.KATAGO_CONFIG || path.join(__dirname, 'katago_config.cfg');
  const modelPath = process.env.KATAGO_MODEL || path.join(__dirname, 'models', 'katago_model.bin.gz');
  
  katagoProcess = spawn(katagoPath, [
    'gtp',
    '-model', modelPath,
    '-config', configPath
  ]);

  katagoProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // 只在关键时刻打印日志
    // 检查是否准备就绪
    if (output.includes('GTP ready')) {
      isReady = true;
      console.log('✅ KataGo 已就绪');
      processPendingRequests();
    }
    
    // 处理响应
    handleKataGoResponse(output);
  });

  katagoProcess.stderr.on('data', (data) => {
    const output = data.toString();
    
    // 检查是否准备就绪（GTP ready 消息在 stderr 中）
    if (output.includes('GTP ready')) {
      isReady = true;
      console.log('✅ KataGo 已就绪');
      processPendingRequests();
    }
    
    // KataGo 的正常启动信息也会输出到 stderr，需要区分
    const normalPatterns = [
      'KataGo v',
      'Using',
      'rules',
      'Initializing',
      'Loaded',
      'Model name',
      'GTP ready',
      'beginning main protocol loop',
      'nnRandSeed',
      'After dedups',
      'nnModelFile',
      'backend thread',
      'Model version',
      'CPU thread',
      'Eigen',
      'OpenCL',
      'CUDA',
      'useFP16',
      'useNHWC'
    ];
    
    const isNormalLog = normalPatterns.some(pattern => output.includes(pattern));
    
    // 检查是否是被截断的日志（只包含时间戳或不完整的内容）
    const isTruncatedLog = output.trim().length < 30 && /^\d{4}-\d{2}-\d{2}/.test(output.trim());
    
    // 只打印关键的启动信息
    if (!isNormalLog && !isTruncatedLog) {
      // 只有在不是正常日志且不是截断日志时才报错
      console.error('❌ KataGo 错误:', output.trim());
    }
    // 其他正常日志和截断日志静默处理，不输出
  });

  katagoProcess.on('close', (code) => {
    console.log(`KataGo 进程退出，代码: ${code}`);
    isReady = false;
  });
}

// GTP 命令队列管理
const commandQueue = [];
let isProcessingCommand = false;
let responseBuffer = '';
let bufferWarningShown = false; // 标记是否已显示缓冲区警告

function handleKataGoResponse(output) {
  responseBuffer += output;
  
  // 防止缓冲区无限增长：限制最大 50MB（增加限制以支持大规模分析）
  const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB
  if (responseBuffer.length > MAX_BUFFER_SIZE) {
    // 只在第一次超过限制时打印警告
    if (!bufferWarningShown) {
      console.warn(`⚠️  响应缓冲区过大 (${Math.round(responseBuffer.length / 1024 / 1024)}MB)，自动截断保留最新数据`);
      bufferWarningShown = true;
    }
    // 找到最后一个完整的换行符，确保不会截断到行中间
    const lastNewlineIndex = responseBuffer.lastIndexOf('\n', MAX_BUFFER_SIZE * 0.8);
    if (lastNewlineIndex !== -1) {
      // 从最后一个完整行开始保留数据
      responseBuffer = responseBuffer.substring(lastNewlineIndex + 1);
    } else {
      // 如果找不到换行符，保留最后 25MB
      responseBuffer = responseBuffer.slice(-25 * 1024 * 1024);
    }
  }
  
  // 检查是否有待处理的命令
  if (commandQueue.length === 0 || !commandQueue[0].pending) {
    return;
  }
  
  const cmd = commandQueue[0];
  
  // 特殊处理 kata-analyze 命令
  if (cmd.command.startsWith('kata-analyze')) {
    // kata-analyze 响应格式：先输出 =\n，然后持续输出 info move 行
    // 检测分析是否完成：当 0.5 秒内没有新数据输出时，认为分析完成
    
    // 检查是否已经开始接收数据（有 = 标记）
    if (responseBuffer.includes('=')) {
      // 清除之前的完成检测定时器
      if (cmd.analyzeCompleteTimer) {
        clearTimeout(cmd.analyzeCompleteTimer);
      }
      
      // 清除并重置 30 秒超时定时器（因为还在持续接收数据）
      if (cmd.timeout) {
        clearTimeout(cmd.timeout);
      }
      cmd.timeout = setTimeout(() => {
        const failedCmd = commandQueue.shift();
        if (failedCmd && failedCmd.analyzeCompleteTimer) {
          clearTimeout(failedCmd.analyzeCompleteTimer);
        }
        if (failedCmd) {
          failedCmd.reject(new Error('KataGo 响应超时'));
        }
        responseBuffer = ''; // 清空缓冲区
        isProcessingCommand = false;
        processNextCommand();
      }, 30000);
      
      // 设置新的完成检测定时器：2 秒内没有新数据就认为完成
      cmd.analyzeCompleteTimer = setTimeout(() => {
        const fullResponse = responseBuffer.trim();
        responseBuffer = '';
        bufferWarningShown = false; // 重置警告标记，为下次分析做准备
        
        const completedCmd = commandQueue.shift();
        if (completedCmd && completedCmd.timeout) {
          clearTimeout(completedCmd.timeout);
        }
        
        // 统计最大 visits 用于日志
        const lines = fullResponse.split('\n');
        let maxVisits = 0;
        for (const line of lines) {
          if (line.includes('info move')) {
            const match = line.match(/visits\s+(\d+)/);
            if (match) {
              const visits = parseInt(match[1]);
              if (visits > maxVisits) {
                maxVisits = visits;
              }
            }
          }
        }
        
        console.log(`✅ [kata-analyze] 分析完成，最大 visits: ${maxVisits}，数据大小: ${Math.round(fullResponse.length / 1024)}KB`);
        if (completedCmd) {
          completedCmd.resolve(fullResponse);
        }
        
        // 处理下一个命令
        isProcessingCommand = false;
        processNextCommand();
      }, 2000); // 2 秒内没有新数据就认为完成（增加等待时间以确保 KataGo 有足够时间输出数据）
    }
    return;
  }
  
  // 普通 GTP 命令：= result\n\n 或 ? error\n\n（以双换行结束）
  const doubleNewlineIndex = responseBuffer.indexOf('\n\n');
  
  if (doubleNewlineIndex !== -1) {
    // 提取完整响应
    const response = responseBuffer.substring(0, doubleNewlineIndex).trim();
    responseBuffer = responseBuffer.substring(doubleNewlineIndex + 2);
    
    commandQueue.shift();
    clearTimeout(cmd.timeout);
    
    // 检查响应类型（去除前导空白后检查）
    const trimmedResponse = response.trim();
    if (trimmedResponse.startsWith('=')) {
      cmd.resolve(trimmedResponse);
    } else if (trimmedResponse.startsWith('?')) {
      cmd.reject(new Error(`GTP 错误: ${trimmedResponse.substring(1).trim()}`));
    } else {
      // 非标准响应，仍然认为命令已完成，避免超时
      cmd.resolve(trimmedResponse);
    }
    
    // 处理下一个命令
    processNextCommand();
    
    // 递归处理缓冲区中可能存在的其他响应
    if (responseBuffer.includes('\n\n')) {
      handleKataGoResponse('');
    }
  }
}

// 处理队列中的下一个命令
function processNextCommand() {
  if (commandQueue.length === 0 || isProcessingCommand) {
    isProcessingCommand = false;
    return;
  }
  
  isProcessingCommand = true;
  const cmd = commandQueue[0];
  cmd.pending = true;
  
  // 设置 30 秒超时定时器
  cmd.timeout = setTimeout(() => {
    const failedCmd = commandQueue.shift();
    if (failedCmd.analyzeCompleteTimer) {
      clearTimeout(failedCmd.analyzeCompleteTimer);
    }
    failedCmd.reject(new Error('KataGo 响应超时'));
    isProcessingCommand = false;
    processNextCommand();
  }, 30000);
  
  try {
    katagoProcess.stdin.write(cmd.command + '\n');
    // 命令发送不再打印日志
  } catch (error) {
    const failedCmd = commandQueue.shift();
    clearTimeout(failedCmd.timeout);
    if (failedCmd.analyzeCompleteTimer) {
      clearTimeout(failedCmd.analyzeCompleteTimer);
    }
    failedCmd.reject(error);
    isProcessingCommand = false;
    processNextCommand();
  }
}

// 发送 GTP 命令到 KataGo（使用队列）
function sendGTPCommand(command) {
  return new Promise((resolve, reject) => {
    if (!isReady) {
      reject(new Error('KataGo 未就绪'));
      return;
    }
    
    // 创建命令对象，但不立即设置超时
    // 超时将在 processNextCommand 中设置
    const cmdObj = {
      command,
      resolve,
      reject,
      timeout: null,
      pending: false
    };
    
    commandQueue.push(cmdObj);
    
    // 如果当前没有正在处理的命令，立即开始处理
    if (!isProcessingCommand) {
      processNextCommand();
    }
  });
}

// 处理待处理的请求
function processPendingRequests() {
  while (pendingRequests.length > 0 && isReady) {
    const request = pendingRequests.shift();
    request();
  }
}

// 将棋盘转换为 GTP 格式
function boardToGTP(board, size) {
  const moves = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stone = board[y][x];
      if (stone !== 0) { // 0 表示空位
        const color = stone === 1 ? 'B' : 'W'; // 1=黑，2=白
        const coord = coordinateToGTP(x, y, size);
        moves.push({ color, coord });
      }
    }
  }
  return moves;
}

// 坐标转换为 GTP 格式 (A1, B2, etc.)
function coordinateToGTP(x, y, size) {
  const letters = 'ABCDEFGHJKLMNOPQRST'; // 跳过 I
  const col = letters[x];
  const row = size - y;
  return col + row;
}

// GTP 坐标转换为数组索引
function gtpToCoordinate(gtp, size) {
  const letters = 'ABCDEFGHJKLMNOPQRST';
  const col = letters.indexOf(gtp[0]);
  const row = size - parseInt(gtp.slice(1));
  return { x: col, y: row };
}

// 解析 kata-analyze 返回的多个候选着法
function parseKataAnalyze(result, size) {
  try {
    const lines = result.split('\n');
    const moves = [];
    const seenPositions = new Set(); // 添加去重集合
    
    for (const line of lines) {
      if (line.includes('info move')) {
        const moveMatch = line.match(/move ([A-Z]\d+|pass|resign)/i);
        const visitsMatch = line.match(/visits (\d+)/);
        const winrateMatch = line.match(/winrate ([\d.]+)/);
        const scoreMatch = line.match(/scoreMean ([-\d.]+)/);
        const orderMatch = line.match(/order (\d+)/);
        
        if (moveMatch && visitsMatch) {
          const moveStr = moveMatch[1].toUpperCase();
          
          if (moveStr === 'PASS' || moveStr === 'RESIGN') {
            continue; // 跳过 pass 和 resign
          }
          
          const coord = gtpToCoordinate(moveStr, size);
          const positionKey = `${coord.x},${coord.y}`;
          
          // 打印原始 GTP 坐标和转换后的坐标
          console.log(`🔍 [解析] GTP: ${moveStr} → 坐标: (${coord.x}, ${coord.y})`);
          
          // 去重：跳过重复坐标
          if (seenPositions.has(positionKey)) {
            console.warn(`⚠️  [解析] 跳过重复坐标: GTP=${moveStr}, 坐标=(${coord.x}, ${coord.y})`);
            continue;
          }
          seenPositions.add(positionKey);
          
          const visits = parseInt(visitsMatch[1]);
          const winrate = winrateMatch ? parseFloat(winrateMatch[1]) * 100 : 50;
          const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
          const order = orderMatch ? parseInt(orderMatch[1]) : moves.length;
          
          moves.push({
            x: coord.x,
            y: coord.y,
            winRate: Math.round(winrate * 10) / 10,
            scoreLead: Math.round(score * 10) / 10,
            visits: visits,
            order: order,
            reason: getStrategicReason(winrate, score)
          });
        }
      }
    }
    
    // 按 order 排序
    moves.sort((a, b) => a.order - b.order);
    
    // 打印详细的解析结果
    console.log(`📊 [解析] 解析出 ${moves.length} 个候选着法：`);
    moves.forEach((move, index) => {
      console.log(`   [${index}] 位置: (${move.x}, ${move.y}), order: ${move.order}, 胜率: ${move.winRate}%, visits: ${move.visits}`);
    });
    
    return moves;
  } catch (error) {
    console.error('[解析] 解析 kata-analyze 结果时出错:', error);
    return [];
  }
}

// 根据 AI 等级选择着法
function selectMoveByLevel(moves, aiLevel) {
  if (moves.length === 0) return null;
  
  let targetOrder;
  switch (aiLevel) {
    case 'master':
      targetOrder = 0; // 最优
      break;
    case 'expert':
      targetOrder = 1; // 次优
      break;
    case 'intermediate':
      targetOrder = 2; // 第三
      break;
    case 'beginner':
      // 随机选择第 3-4 个
      targetOrder = Math.random() < 0.5 ? 3 : 4;
      break;
    default:
      targetOrder = 0;
  }
  
  // 找到对应 order 的着法
  const move = moves.find(m => m.order === targetOrder);
  
  // 如果没找到（比如只有 2 个候选），返回最后一个
  return move || moves[moves.length - 1];
}

// API: 获取 AI 着法（支持难度等级）
app.post('/api/ai-move', async (req, res) => {
  const startTime = Date.now();
  try {
    const { board, size, player, aiLevel = 'master' } = req.body;
    
    if (!isReady) {
      console.warn('[API] KataGo 未就绪');
      return res.status(503).json({ error: 'KataGo 未就绪，请稍后重试' });
    }

    // 检查是否有正在处理的请求
    if (isProcessingAIRequest) {
      console.warn('[API] 有请求正在处理中，拒绝新请求');
      return res.status(429).json({ error: '服务繁忙，请稍后重试' });
    }

    // 设置请求锁
    isProcessingAIRequest = true;

    try {
      // 清空棋盘
      console.log('[API] 清空棋盘...');
      await sendGTPCommand('clear_board');
      await sendGTPCommand(`boardsize ${size}`);
    
      // 设置棋盘状态
      const moves = boardToGTP(board, size);
      console.log(`[API] 重建棋盘状态: ${moves.length} 步棋`);
      for (const move of moves) {
        await sendGTPCommand(`play ${move.color} ${move.coord}`);
      }
      
      // 请求 AI 分析
      const playerColor = player === 1 ? 'B' : 'W';
      
      // 根据 AI 等级决定使用的方法和 visits 参数
      let visits;
      let useGenmove = false;
      
      switch (aiLevel) {
        case 'beginner':
          // 初级：直接使用 genmove
          useGenmove = true;
          break;
        case 'intermediate':
          // 中级：kata-analyze 1 次
          visits = 1;
          break;
        case 'expert':
          // 高级：kata-analyze 1 次
          visits = 1;
          break;
        case 'master':
          // 大师：kata-analyze 1 次
          visits = 1;
          break;
        default:
          visits = 1;
      }
      
      if (useGenmove) {
        // 初级：直接使用 genmove
        const moveResult = await sendGTPCommand(`genmove ${playerColor}`);
      const moveMatch = moveResult.match(/=\s*([A-Z]\d+|pass|resign)/i);
      
      if (moveMatch) {
        const moveStr = moveMatch[1].toUpperCase();
        
        if (moveStr === 'PASS' || moveStr === 'RESIGN') {
          return res.json({
            x: -1,
            y: -1,
            winRate: 50,
            scoreLead: 0,
            reason: moveStr === 'PASS' ? 'AI 选择停着' : 'AI 认输'
          });
        }
        
        const coord = gtpToCoordinate(moveStr, size);
        
        return res.json({
          x: coord.x,
          y: coord.y,
            winRate: 50,
            scoreLead: 0,
            reason: 'KataGo 推荐'
          });
        }
        
        return res.status(500).json({ error: '无法获取 AI 着法' });
      }
      
      // 中级/高级/大师：使用 kata-analyze
      const analyzeResult = await sendGTPCommand(`kata-analyze ${playerColor} ${visits}`);
      
      // 解析多个候选着法
      const candidateMoves = parseKataAnalyze(analyzeResult, size);
      
      if (candidateMoves.length === 0) {
        console.warn('[API] 未找到候选着法，尝试使用 genmove');
        // 降级到 genmove
        const moveResult = await sendGTPCommand(`genmove ${playerColor}`);
        const moveMatch = moveResult.match(/=\s*([A-Z]\d+|pass|resign)/i);
        
        if (moveMatch) {
          const moveStr = moveMatch[1].toUpperCase();
          
          if (moveStr === 'PASS' || moveStr === 'RESIGN') {
            return res.json({
              x: -1,
              y: -1,
              winRate: 50,
              scoreLead: 0,
              reason: moveStr === 'PASS' ? 'AI 选择停着' : 'AI 认输'
            });
          }
          
          const coord = gtpToCoordinate(moveStr, size);
          return res.json({
            x: coord.x,
            y: coord.y,
            winRate: 50,
            scoreLead: 0,
            reason: 'KataGo 推荐'
          });
      }
      
      return res.status(500).json({ error: '无法获取 AI 着法' });
      }
      
      // 根据 AI 等级选择着法
      const selectedMove = selectMoveByLevel(candidateMoves, aiLevel);
      
      res.json(selectedMove);
    } finally {
      // 释放请求锁
      isProcessingAIRequest = false;
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[API] 处理 AI 请求时出错 (耗时 ${elapsed}ms):`, error);
    // 确保释放锁
    isProcessingAIRequest = false;
    res.status(500).json({ error: error.message });
  }
});

// API: 获取多步推荐分析（用于学习）
app.post('/api/ai-analysis', async (req, res) => {
  const startTime = Date.now();
  console.log('📥 [API] 收到多步推荐分析请求');
  
  try {
    const { board, size, player } = req.body;
    
    if (!isReady) {
      console.warn('[API] KataGo 未就绪');
      return res.status(503).json({ error: 'KataGo 未就绪，请稍后重试' });
    }

    // 检查是否有正在处理的请求
    if (isProcessingAIRequest) {
      console.warn('[API] 有请求正在处理中，拒绝新请求');
      return res.status(429).json({ error: '服务繁忙，请稍后重试' });
    }

    // 设置请求锁
    isProcessingAIRequest = true;

    try {
      // 清空棋盘并设置棋盘大小
      await sendGTPCommand('clear_board');
      await sendGTPCommand(`boardsize ${size}`);
    
      // 设置棋盘状态
      const moves = boardToGTP(board, size);
      for (const move of moves) {
        await sendGTPCommand(`play ${move.color} ${move.coord}`);
      }
      
      // 请求 AI 分析
      const playerColor = player === 1 ? 'B' : 'W';
      
      // 使用 kata-analyze 获取多个候选着法（使用 50 次访问，快速获取多个候选）
      const analyzeResult = await sendGTPCommand(`kata-analyze ${playerColor} 50`);
      
      // 解析多个候选着法
      const candidateMoves = parseKataAnalyze(analyzeResult, size);
      
      if (candidateMoves.length === 0) {
        return res.status(500).json({ error: '无法获取分析结果' });
      }
      
      // 只返回前 5 个候选着法
      const topMoves = candidateMoves.slice(0, 5);
      
      console.log(`✅ [API] 返回 ${topMoves.length} 个候选着法`);
      
      res.json({
        moves: topMoves,
        bestMove: topMoves[0]
      });
    } finally {
      // 释放请求锁
      isProcessingAIRequest = false;
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[API] 处理分析请求时出错 (耗时 ${elapsed}ms):`, error);
    // 确保释放锁
    isProcessingAIRequest = false;
    res.status(500).json({ error: error.message });
  }
});


// 根据胜率和目数生成战略理由
function getStrategicReason(winrate, score) {
  if (winrate > 70) {
    return score > 10 ? '优势局面，扩大领先' : '胜率领先，稳健发展';
  } else if (winrate > 55) {
    return '均势局面，争夺要点';
  } else if (winrate > 45) {
    return '局面复杂，寻求变化';
  } else {
    return score < -10 ? '劣势局面，积极搏杀' : '落后局面，寻求转机';
  }
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: isReady ? 'ready' : 'starting',
    message: isReady ? 'KataGo 运行正常' : 'KataGo 正在启动...'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`KataGo 服务器运行在 http://localhost:${PORT}`);
  startKataGo();
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭 KataGo...');
  if (katagoProcess) {
    katagoProcess.kill();
  }
  process.exit(0);
});
