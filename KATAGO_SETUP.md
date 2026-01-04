# KataGo 本地部署指南

本文档说明如何将 LongGo 项目从 Gemini AI 迁移到本地 KataGo。

## 🎯 架构说明

```
前端 (React/Vite)  →  HTTP API  →  Node.js 服务器  →  GTP 协议  →  KataGo
   (端口 3000)                        (端口 3001)                    (本地进程)
```

## 📋 前置要求

- macOS 系统（已针对 M1/M2 芯片优化）
- Node.js 16+ 和 npm
- Homebrew 包管理器

## 🚀 快速开始

### 方法一：自动安装（推荐）

运行自动安装脚本：

```bash
bash scripts/setup-katago.sh
```

该脚本会自动完成：
1. ✅ 检查并安装 KataGo
2. ✅ 下载神经网络模型（约 200MB）
3. ✅ 生成配置文件
4. ✅ 安装 Node.js 服务器依赖
5. ✅ 测试 KataGo 是否正常工作

### 方法二：手动安装

#### 1. 安装 KataGo

```bash
brew install katago
```

验证安装：
```bash
katago version
```

#### 2. 下载模型文件

```bash
mkdir -p server/models
cd server/models
curl -L -O https://github.com/lightvector/KataGo/releases/download/v1.13.2/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz
mv kata1-b18c384nbt-s7709731328-d3715293823.bin.gz katago_model.bin.gz
cd ../..
```

#### 3. 生成配置文件

```bash
katago genconfig -model server/models/katago_model.bin.gz -output server/katago_config.cfg
```

#### 4. 安装服务器依赖

```bash
cd server
npm install
cd ..
```

## 🎮 运行项目

### 方法一：一键启动（推荐）

```bash
bash scripts/start-all.sh
```

这会同时启动：
- KataGo 服务器（端口 3001）
- 前端开发服务器（端口 3000）

### 方法二：分别启动

**终端 1 - 启动 KataGo 服务器：**
```bash
npm run server
```

**终端 2 - 启动前端：**
```bash
npm run dev
```

## 🔍 验证安装

### 1. 检查 KataGo 服务器状态

```bash
curl http://localhost:3001/api/health
```

预期输出：
```json
{
  "status": "ready",
  "message": "KataGo 运行正常"
}
```

### 2. 测试 AI 分析

```bash
curl -X POST http://localhost:3001/api/ai-move \
  -H "Content-Type: application/json" \
  -d '{
    "board": [[0,0,0],[0,0,0],[0,0,0]],
    "size": 9,
    "player": 1
  }'
```

## 📁 项目结构

```
long-go/
├── services/
│   └── katagoService.ts      # 前端 API 客户端
├── server/
│   ├── katagoServer.js        # Node.js GTP 服务器
│   ├── katago_config.cfg      # KataGo 配置
│   ├── package.json           # 服务器依赖
│   └── models/
│       └── katago_model.bin.gz # 神经网络模型
├── scripts/
│   ├── setup-katago.sh        # 自动安装脚本
│   └── start-all.sh           # 一键启动脚本
└── App.tsx                    # 主应用（已更新导入）
```

## ⚙️ 配置说明

### KataGo 配置 (`server/katago_config.cfg`)

关键参数：
- `maxVisits`: 500 - 每步最大访问次数
- `numSearchThreads`: 4 - 搜索线程数
- `rules`: chinese - 使用中国规则

可根据机器性能调整这些参数。

### 服务器配置 (`server/katagoServer.js`)

环境变量：
- `KATAGO_PATH`: KataGo 可执行文件路径（默认：katago）
- `KATAGO_CONFIG`: 配置文件路径
- `KATAGO_MODEL`: 模型文件路径

## 🐛 常见问题

### 1. KataGo 未找到

**问题**：`katago: command not found`

**解决**：
```bash
brew install katago
# 或检查 PATH
echo $PATH
```

### 2. 模型文件缺失

**问题**：`Error: Model file not found`

**解决**：重新下载模型文件或运行安装脚本

### 3. 端口被占用

**问题**：`Error: listen EADDRINUSE: address already in use :::3001`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :3001
# 杀死进程
kill -9 <PID>
```

### 4. 服务器启动慢

**原因**：KataGo 首次启动需要加载模型到内存

**正常情况**：首次启动约需 5-10 秒

## 🎯 性能优化

### Mac M1/M2 优化

KataGo 已针对 Apple Silicon 优化，利用 Unified Memory 架构：
- 无需独立显卡
- 内存共享，速度快
- 功耗低

### 调整搜索强度

编辑 `server/katago_config.cfg`：

```cfg
# 快速模式（适合实时对弈）
maxVisits = 300
numSearchThreads = 2

# 标准模式（默认）
maxVisits = 500
numSearchThreads = 4

# 强力模式（适合深度分析）
maxVisits = 1000
numSearchThreads = 8
```

## 📊 与 Gemini 的对比

| 特性 | Gemini AI | KataGo 本地 |
|------|-----------|-------------|
| 成本 | 按 API 调用收费 | 完全免费 |
| 速度 | 依赖网络 | 本地毫秒级 |
| 隐私 | 数据上传云端 | 完全本地 |
| 离线 | ❌ 需要网络 | ✅ 可离线 |
| 棋力 | 约业余 5 段 | 职业水平 |
| 稳定性 | 依赖服务商 | 完全自主 |

## 🔄 回滚到 Gemini（如需要）

如果需要切换回 Gemini AI：

1. 恢复依赖：
```bash
npm install @google/genai@^1.34.0
```

2. 修改 `App.tsx`：
```typescript
import { getAIMove } from './services/geminiService';
```

3. 配置环境变量：
```bash
echo "GEMINI_API_KEY=your_key" > .env.local
```

## 📝 更新日志

### v0.2.0 - KataGo 集成
- ✅ 移除 Gemini AI 依赖
- ✅ 集成本地 KataGo
- ✅ 创建 Node.js GTP 服务器
- ✅ 添加自动安装脚本
- ✅ 保持原有 UI 和功能不变

## 🤝 贡献

如有问题或建议，欢迎提交 Issue 或 PR。

## 📄 许可证

MIT License
