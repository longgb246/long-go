# 渐进围棋 LongGo - 专业 AI 围棋应用

<div align="center">

![版本](https://img.shields.io/badge/版本-0.1-blue.svg)
![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg?logo=vite)

一款融合传统围棋与前沿 AI 技术的现代化围棋应用，专业级棋局分析，支持多种棋盘规格和深度战略洞察。

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用说明](#使用说明) • [技术架构](#技术架构) • [开发指南](#开发指南)

</div>

---

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [界面预览](#界面预览)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [使用说明](#使用说明)
- [项目结构](#项目结构)
- [技术架构](#技术架构)
- [技术栈](#技术栈)
- [API 集成](#api-集成)
- [开发指南](#开发指南)
- [构建部署](#构建部署)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [开源协议](#开源协议)
- [致谢](#致谢)

---

## 🎯 项目简介

**渐进围棋（LongGo）** 是一款现代化的 Web 围棋应用，将传统围棋玩法与尖端 AI 分析技术完美结合。基于 React 和 TypeScript 构建，集成 KataGo 引擎提供专业级棋局分析、着法建议和战略洞察。
### 核心亮点

- 🎮 **多种棋盘规格**：支持 9×9、13×13 和 19×19 三种标准棋盘
- 🤖 **AI 智能分析**：实时着法建议与胜率计算
- 📊 **专业数据指标**：目数估计、形势判断、战略推理
- 🎨 **优雅界面设计**：传统美学与现代用户体验的完美融合
- ⚡ **实时引擎响应**：毫秒级 AI 反馈，专业级分析质量
- 🌐 **跨平台支持**：在任何现代浏览器中流畅运行

---

## ✨ 功能特性

### 对弈模式

- **人机对弈（引擎分析模式）**：与 KataGo AI 引擎对弈，支持多个难度等级
- **双人对弈（本地模式）**：本地双人练习模式

### AI 能力

- **着法建议**：提供最优着法推荐，标准坐标标记
- **胜率分析**：实时计算黑白双方胜率概率
- **目数估计**：精确的地盘和领先目数预测
- **战略推理**：专业术语解读（见合、手筋、势、先手等）
- **深度分析模式**：随时请求详细局面评估

### 棋局功能

- **标准围棋规则**：完整实现提子机制和打劫规则
- **着手历史**：追踪和回顾对局进程
- **提子计数器**：实时统计双方提子数
- **最后着手标记**：可视化高亮最近一手棋
- **AI 提示可视化**：棋盘上直接显示建议着点

### 用户界面

- **响应式设计**：针对桌面端和移动端优化
- **实时日志**：实况棋局解说和引擎分析
- **专业美学**：传统围棋棋盘风格与现代化打磨
- **流畅动画**：顺滑的过渡效果和视觉反馈

---

## 🎬 界面预览

### 应用主界面

应用采用分栏式设计：
- **左侧面板**：游戏控制、AI 分析指标、实时引擎日志
- **右侧面板**：可交互的围棋棋盘与落子操作

### AI 分析展示

![AI 分析展示](sources/imgs/img_02.jpg)

- 动态进度条可视化胜率
- 目数领先估计
- 提子数统计
- 专业术语的战略推理说明

---

## 📦 环境要求

开始之前，请确保已安装以下环境：

- **Node.js**：16.x 或更高版本
- **npm**：7.x 或更高版本（随 Node.js 一起安装）
- **Python**：3.8 或更高版本（后端服务需要）
- **KataGo**：AI 引擎（后端会自动配置）

---

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/long-go.git
cd long-go
```

### 2. 安装依赖

**前端依赖：**

```bash
cd frontend
npm install
```

这将安装所有必需的包：
- `react` & `react-dom`：UI 框架
- `vite`：构建工具和开发服务器
- `typescript`：类型安全
- `@vitejs/plugin-react`：Vite 的 React 支持

**后端依赖：**

```bash
cd backend
pip install -r requirements.txt
```

---

## ⚙️ 配置说明

### 后端配置

后端服务默认运行在 `http://localhost:3001`，KataGo 引擎会自动配置和启动。

### 前端配置

前端默认连接到 `http://localhost:3001/api` 获取 AI 分析。

配置文件位于 `frontend/vite.config.ts`：

```typescript
{
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
}
```

---

## 🎮 使用说明

### 开发模式

**1. 启动后端服务（KataGo 引擎）：**

```bash
cd backend
python main.py
```

后端服务将在 `http://localhost:3001` 运行

**2. 启动前端开发服务器：**

```bash
cd frontend
npm run dev
```

前端应用将在 `http://localhost:3000` 运行

### 对弈操作

1. **选择棋盘规格**：在 9×9、13×13 或 19×19 中选择
2. **选择对弈模式**：
   - **引擎分析**：与 AI 对弈
   - **双人对弈**：本地双人模式
3. **落子**：点击交叉点放置棋子
4. **请求分析**：点击"请求引擎分析"获取 AI 建议
5. **查看指标**：实时监控胜率和目数估计

### AI 分析功能

AI 提供以下信息：
- **坐标**：标准记谱法的建议着点（如 Q16）
- **胜率**：获胜概率（0-100%）
- **目数领先**：估计的点数优势
- **战略推理**：对着法的专业解读

---

## 📁 项目结构

```
long-go/
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── Board.tsx   # 主棋盘组件
│   │   │   └── Stone.tsx   # 单个棋子渲染
│   │   ├── logic/          # 游戏逻辑
│   │   │   └── goEngine.ts # 围棋规则实现
│   │   ├── services/       # 外部服务
│   │   │   └── katagoService.ts # KataGo API 集成
│   │   ├── types.ts        # TypeScript 类型定义
│   │   ├── App.tsx         # 主应用组件
│   │   └── index.tsx       # 应用入口
│   ├── vite.config.ts      # Vite 配置
│   ├── tsconfig.json       # TypeScript 配置
│   └── package.json        # 前端依赖
├── backend/                # 后端服务
│   ├── main.py            # Flask 服务器
│   ├── katago_engine.py   # KataGo 引擎封装
│   └── requirements.txt   # Python 依赖
├── sources/               # 资源文件
│   └── imgs/             # 效果图
└── README.md             # 本文件
```

### 核心文件说明

**前端：**
- **`App.tsx`**：主游戏逻辑、状态管理和 UI 布局
- **`types.ts`**：游戏状态、着手和 AI 响应的 TypeScript 接口
- **`logic/goEngine.ts`**：核心围棋规则（提子检测、着手验证）
- **`services/katagoService.ts`**：KataGo API 集成，用于 AI 分析
- **`components/Board.tsx`**：可交互的棋盘渲染和着手处理

**后端：**
- **`main.py`**：Flask API 服务器，处理前端请求
- **`katago_engine.py`**：KataGo 引擎封装和通信

---

## 🏗️ 技术架构

### 组件层次结构

```
App（主应用）
├── Sidebar（侧边栏：控制与分析）
│   ├── 游戏设置
│   ├── AI 指标展示
│   └── 引擎日志
└── Board（棋盘）
    └── Stone 组件（棋子）
```

### 状态管理

应用使用 React 的 `useState` 和 `useEffect` Hooks 进行状态管理：

- **GameState（游戏状态）**：棋盘局面、当前玩家、着手历史
- **AI State（AI 状态）**：提示、分析数据、思考状态
- **UI State（界面状态）**：日志、动画、用户交互

### 数据流

1. 用户点击棋盘 → `handleMove()` 验证并更新状态
2. 状态变化触发 AI 回合（如果在人机模式）
3. `getAIMove()` 调用后端 API 传递棋盘局面
4. 后端通过 KataGo 引擎计算最佳着法
5. AI 响应更新棋盘并显示分析
6. UI 通过动画和日志反映新状态

---

## 🛠️ 技术栈

### 前端技术

- **React 19.2.3**：基于 Hooks 的 UI 框架
- **TypeScript 5.8.2**：类型安全开发
- **Vite 6.2.0**：快速构建工具和开发服务器
- **Tailwind CSS**：实用优先的样式（通过内联类）

### AI 与后端

- **KataGo**：世界顶级开源围棋 AI 引擎
- **Flask**：Python Web 框架，提供 RESTful API
- **Python 3.8+**：后端服务运行环境

### 开发工具

- **@vitejs/plugin-react**：React Fast Refresh 支持
- **@types/node**：Node.js 类型定义

---

## 🤖 API 集成

### KataGo 服务

`katagoService.ts` 模块处理所有 AI 交互：

```typescript
export const getAIMove = async (
  board: Stone[][],
  size: BoardSize,
  player: Stone,
  aiLevel: string
): Promise<AIHint | null>

export const getAIAnalysis = async (
  board: Stone[][],
  size: BoardSize,
  player: Stone
): Promise<{ moves: AIHint[]; bestMove: AIHint } | null>
```

### API 端点

- **`POST /api/ai-move`**：获取 AI 的下一步着法
- **`POST /api/ai-analysis`**：获取多步候选着法分析
- **`GET /api/health`**：检查 KataGo 服务状态

### API 请求流程

1. 前端将棋盘状态转换为数字数组（0=空, 1=黑, 2=白）
2. 发送 POST 请求到后端 API
3. 后端调用 KataGo 引擎进行分析
4. KataGo 返回着法建议、胜率、目数等数据
5. 后端解析并格式化响应
6. 前端接收并更新 UI

### 响应数据结构

```typescript
{
  x: number,            // 横坐标
  y: number,            // 纵坐标
  winRate: number,      // 胜率 0-100
  scoreLead: number,    // 目数领先
  visits: number,       // 访问次数
  order: number,        // 推荐顺序
  reason: string        // 战略解释
}
```

---

## 💻 开发指南

### 代码规范

- **TypeScript**：启用严格模式
- **React**：函数式组件配合 Hooks
- **命名规范**：变量使用 camelCase，组件使用 PascalCase
- **注释**：函数使用 JSDoc 风格

### 添加新功能

1. 在 `types.ts` 中定义类型
2. 在相应模块中实现逻辑
3. 更新 UI 组件
4. 使用不同棋盘规格和场景测试

### 调试技巧

- 使用 React DevTools 检查组件
- 查看浏览器控制台的 API 错误
- 监控网络标签页的 Gemini API 调用

---

## 📦 构建部署

### 生产构建

```bash
npm run build
```

这将在 `dist/` 目录创建优化后的构建产物。

### 预览生产构建

```bash
npm run preview
```

### 部署选项

- **Vercel**：Vite 应用零配置部署
- **Netlify**：拖放或 Git 集成
- **GitHub Pages**：使用 Actions 的静态托管
- **自定义服务器**：使用任何 Web 服务器提供 `dist/` 文件夹

### 部署注意事项

- 确保后端服务和 KataGo 引擎正确配置
- 前端需要能够访问后端 API 地址
- 建议使用 Docker 容器化部署以简化环境配置

---

## 🐛 常见问题

### 常见问题解答

**后端服务无法启动**
- 检查 Python 版本是否 >= 3.8
- 确保所有 Python 依赖已安装
- 查看后端日志了解详细错误信息

**AI 无响应**
- 确认后端服务正在运行（`http://localhost:3001`）
- 检查浏览器控制台的 API 错误
- 验证网络连接
- 查看后端日志确认 KataGo 引擎状态

**棋盘无法渲染**
- 清除浏览器缓存
- 检查控制台的 JavaScript 错误
- 确保所有依赖已安装

**构建错误**
- 删除 `node_modules` 和 `package-lock.json`
- 重新运行 `npm install`
- 检查 Node.js 版本兼容性

---

## 🤝 贡献指南

欢迎贡献！请遵循以下指南：

1. **Fork** 本仓库
2. **创建**特性分支（`git checkout -b feature/AmazingFeature`）
3. **提交**更改（`git commit -m '添加某个很棒的功能'`）
4. **推送**到分支（`git push origin feature/AmazingFeature`）
5. **开启** Pull Request

### 开发规范

- 编写清晰、有文档的代码
- 遵循现有代码风格
- 提交前充分测试
- 添加新功能时更新 README

---

## 📄 开源协议

本项目采用 MIT 协议 - 详见 LICENSE 文件。

---

## 🙏 致谢

- **KataGo 项目**：提供世界顶级的开源围棋 AI 引擎
- **围棋社区**：提供丰富的战略深度和宝贵建议
- **React 团队**：提供优秀的 UI 框架
- **Vite 团队**：提供极速构建工具
- **Flask 社区**：提供简洁高效的 Web 框架

---

## 📞 联系与支持

- **问题反馈**：[GitHub Issues](https://github.com/yourusername/long-go/issues)
- **讨论交流**：[GitHub Discussions](https://github.com/yourusername/long-go/discussions)

---

<div align="center">

**用 ❤️ 为围棋爱好者和 AI 学习者打造**

⭐ 如果觉得有帮助，请给个 Star！

</div>