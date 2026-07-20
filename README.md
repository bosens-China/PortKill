# PortKill 🎯

PortKill 是一款基于 Electron 和 React 构建的现代跨平台桌面应用程序，旨在帮助您优雅地管理和强制终止系统端口。从此告别“端口已被占用 (Port already in use)”的烦恼！

## ✨ 核心特性

- **实时监控**：使用单次原生命令扫描监听端口，每 5 秒在后台更新状态。
- **智能展示**：未被占用的端口以 `--` 优雅展示，保持界面整洁。
- **批量操作**：支持多选端口，一键批量终止进程或移出监控列表。
- **原生进程管理**：底层采用原生系统命令（`lsof`/`netstat`, `kill`/`taskkill`），不依赖第三方模块，安全可靠。
- **配置持久化**：自定义监控端口、主题偏好和语言设置自动保存在 `localStorage` 中。
- **动态主题**：内置深色与浅色模式，支持自动跟随系统主题。
- **国际化 (i18n)**：完美支持简体中文和英文，并能自动匹配系统语言。
- **系统托盘与后台常驻**：关闭窗口后驻留托盘，随时待命。

## 🚀 技术栈

- **框架**: Electron + Vite
- **前端**: React 19 (开启 React Compiler)
- **UI 组件库**: Ant Design
- **样式**: UnoCSS + 原生 CSS
- **国际化**: i18next + react-i18next
- **构建工具**: pnpm

## 📦 本地开发

### 系统要求

- Node.js 20 或更高版本
- pnpm（版本以 `package.json` 的 `packageManager` 字段为准）
- macOS 已内置 `lsof`
- Linux 需要预先安装 `lsof`，例如 Debian/Ubuntu 可执行 `sudo apt install lsof`

### 启动项目

1. **克隆项目**

```bash
git clone https://github.com/yliu/PortKill.git
cd PortKill
```

2. **安装依赖** (请确保已安装 pnpm)

```bash
pnpm install
```

3. **重新编译 Electron 二进制文件** (按需)

```bash
pnpm rebuild electron
```

4. **启动开发服务器**

```bash
pnpm dev
```

## 🛠️ 打包构建

本项目已配置自动化 CI/CD，发布新版本时会自动在 GitHub Releases 构建各平台安装包。如需本地手动打包：

```bash
# Mac
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

## ⚠️ 平台说明

### Windows

Windows 没有与 POSIX `SIGTERM` 完全等价的通用进程结束机制。“结束”会先使用不带
`/F` 的 `taskkill` 尝试正常关闭；控制台程序可能只支持“强制结束”，应用会在这种情况
下给出明确提示。

### Linux

Deb 安装包会声明 `lsof` 依赖。AppImage 无法自动安装系统依赖，如果系统缺少 `lsof`，
应用会在界面中提示安装。由于 Snap 的严格沙箱无法可靠扫描和终止宿主机进程，项目不
提供 Snap 包。

### macOS

项目目前由个人开发者维护，没有加入 Apple Developer Program，因此发布的 DMG 会以
`unsigned` 标记且未经过 Apple 公证。首次打开时如被 Gatekeeper 阻止，请在 Finder 中
右键应用并选择“打开”，或前往“系统设置 → 隐私与安全性”确认打开。请只从本项目的
GitHub Releases 下载产物。

## 📝 开源协议

本项目基于 [MIT License](LICENSE) 开源。  
Copyright (c) 2026 yliu.
