# PortKill 🎯

PortKill 是一款基于 Electron 和 React 构建的现代跨平台桌面应用程序，旨在帮助您优雅地管理和强制终止系统端口。从此告别“端口已被占用 (Port already in use)”的烦恼！

## ✨ 核心特性

- **实时监控**：在后台轮询系统端口，对性能零影响。
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

## 📝 开源协议

本项目基于 [MIT License](LICENSE) 开源。  
Copyright (c) 2026 yliu.
