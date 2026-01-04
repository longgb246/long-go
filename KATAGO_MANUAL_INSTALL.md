# KataGo 手动安装指南（macOS 12 适配版）

由于你的 macOS 12 系统 Swift 版本较低，无法通过 Homebrew 编译安装 KataGo。请按照以下步骤手动安装预编译版本。

## 🚨 问题原因

- **Swift 版本**：系统 Swift 5.6.1，KataGo 需要 5.9+
- **macOS 版本**：macOS 12 属于 Homebrew Tier 3 支持
- **解决方案**：使用预编译的二进制文件

## 📥 方法一：手动下载安装（推荐）

### 步骤 1: 下载 KataGo

**最新版本：v1.16.0**

请访问 KataGo 官方发布页面选择适合你系统的版本：

```
https://github.com/lightvector/KataGo/releases/latest
```

**推荐下载（macOS）：**

对于 macOS 系统，请下载以下文件之一：

1. **OpenCL 版本**（推荐，兼容性最好）：
   - 文件名：`katago-v1.16.0-opencl-macos-x64.zip`
   - 直接下载链接：`https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip`

2. **Eigen 版本**（纯 CPU，无需 GPU）：
   - 文件名：`katago-v1.16.0-eigen-macos-x64.zip`
   - 直接下载链接：`https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-eigen-macos-x64.zip`

**使用 curl 下载（推荐 OpenCL 版本）：**

```bash
cd ~/Downloads
curl -L -O https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip
```

### 步骤 2: 解压并安装

```bash
# 解压文件
cd ~/Downloads
unzip katago-v1.16.0-opencl-macos-x64.zip

# 创建安装目录
mkdir -p ~/katago/bin

# 移动可执行文件
mv katago ~/katago/bin/

# 添加执行权限
chmod +x ~/katago/bin/katago

# 添加到 PATH（添加到 ~/.zshrc）
echo 'export PATH="$HOME/katago/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 验证安装
katago version
```

### 步骤 3: 下载神经网络模型

**推荐模型（从 katagotraining.org 下载）：**

```bash
# 创建模型目录
mkdir -p ~/katago/models
cd ~/katago/models

# 方式一：下载最新的 b18 模型（推荐，约 200MB）
curl -L -O https://media.githubusercontent.com/media/lightvector/KataGo/master/python/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz

# 方式二：从 katagotraining.org 下载（可能更快）
# 访问 https://katagotraining.org/ 查看最新模型
```

**备用下载地址（如果上面的链接失败）：**

```bash
# 使用 GitHub 镜像
curl -L https://ghproxy.com/https://media.githubusercontent.com/media/lightvector/KataGo/master/python/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -o kata1-b18c384nbt-s7709731328-d3715293823.bin.gz
```

### 步骤 4: 生成配置文件

```bash
cd ~/katago
katago genconfig -model models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -output gtp_config.cfg
```

### 步骤 5: 配置项目

```bash
# 回到项目目录
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go

# 创建符号链接到项目
mkdir -p server/models
ln -s ~/katago/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz server/models/katago_model.bin.gz
ln -s ~/katago/gtp_config.cfg server/katago_config.cfg

# 或者直接复制
cp ~/katago/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz server/models/katago_model.bin.gz
cp ~/katago/gtp_config.cfg server/katago_config.cfg
```

## 📥 方法二：使用项目内置脚本（需要先完成方法一的步骤1-2）

安装好 KataGo 可执行文件后，运行：

```bash
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go

# 安装服务器依赖
cd server && npm install && cd ..

# 测试 KataGo
katago version
```

## 🧪 验证安装

### 1. 检查 KataGo 是否可用

```bash
which katago
katago version
```

预期输出类似：
```
KataGo v1.13.2
```

### 2. 测试 GTP 模式

```bash
echo "boardsize 19" | katago gtp -model ~/katago/models/kata1-b18c384nbt-s7709731328-d3715293823.bin.gz -config ~/katago/gtp_config.cfg
```

应该看到类似输出：
```
= 

```

### 3. 检查项目文件

```bash
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go
ls -lh server/models/
ls -lh server/katago_config.cfg
```

## 🚀 启动项目

### 方式一：分别启动

**终端 1 - 启动 KataGo 服务器：**
```bash
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go
npm run server
```

**终端 2 - 启动前端：**
```bash
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go
npm run dev
```

### 方式二：一键启动

```bash
cd /Users/longguangbin/0_Work/Codes/git_codes/long-go
bash scripts/start-all.sh
```

## 🔍 访问应用

打开浏览器访问：`http://localhost:3000`

## ❓ 常见问题

### Q1: 下载速度慢或失败

**解决方案**：使用国内镜像或代理

```bash
# 使用 ghproxy 镜像下载 KataGo
cd ~/Downloads
curl -L https://ghproxy.com/https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip -o katago.zip

# 或者直接在浏览器中访问
# https://ghproxy.com/https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-opencl-macos-x64.zip
```

**备选方案**：使用 Eigen 版本（纯 CPU，文件更小）

```bash
curl -L https://github.com/lightvector/KataGo/releases/download/v1.16.0/katago-v1.16.0-eigen-macos-x64.zip -o katago.zip
```

### Q2: katago: command not found

**解决方案**：重新加载 shell 配置

```bash
source ~/.zshrc
# 或者重启终端
```

### Q3: 模型文件下载失败

**解决方案**：手动从浏览器下载

访问：https://github.com/lightvector/KataGo/tree/master/python/models

下载 `kata1-b18c384nbt-s7709731328-d3715293823.bin.gz` 文件

### Q4: Permission denied

**解决方案**：添加执行权限

```bash
chmod +x ~/katago/bin/katago
```

## 📞 需要帮助？

如果遇到问题，请提供以下信息：

```bash
# 系统信息
sw_vers

# KataGo 状态
which katago
katago version

# 文件检查
ls -lh ~/katago/
ls -lh server/models/
```

## 🎯 下一步

安装完成后，参考 `KATAGO_SETUP.md` 了解如何使用项目。
