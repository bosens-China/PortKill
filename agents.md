# PortKill AI Agent 开发指南

## 技术栈
- **框架**: Electron + Vite
- **前端**: React 19 (开启 `babel-plugin-react-compiler`), Antd (动态主题), UnoCSS
- **国际化**: i18next + react-i18next
- **包管理**: pnpm
- **CI/CD**: GitHub Actions
- **自动化发布**: Google Release Please (遵循 Conventional Commits)

## 核心开发规则
1. **原生进程管理**: 严禁安装第三方库（如 `find-process`）来扫描或查杀端口。必须在主进程中使用 `child_process.exec` 调用原生系统命令：
   - *Mac/Linux*: `lsof` 和 `kill`
   - *Windows*: `netstat` 和 `taskkill`
2. **状态持久化**: 用户添加的自定义端口、界面语言 (i18n) 以及主题偏好保存在渲染进程的 `localStorage` 中，且支持默认跟随系统。
3. **后台常驻**: 点击关闭窗口时必须调用 `mainWindow.hide()`，仅通过系统托盘 (Tray) 唤醒或彻底退出。
4. **UI 开发限制**: 
   - 增加的新文本必须使用 `t('key')` 从语言字典中读取。
   - 确保组件样式支持深浅两套主题（依赖 `theme.darkAlgorithm` / `theme.defaultAlgorithm` 切换）。
   - **表格与数据展示**: 监听的端口必须全量常驻展示，未被占用的端口显示 `--` 并禁用查杀按钮。不可将未被占用的端口从表格中移除。
   - **交互设计**: 长列表需启用 Antd `Table` 的原生分页 (带有 `showTotal`)；需提供筛选下拉框（支持全部/已被占用/未被占用）；提供多选能力与批量操作（隐藏式批量工具栏，靠右对齐）。
   - **二次确认**: 敏感操作（查杀、取消监听、恢复默认等）必须配有二次确认，可采用 `Modal` 或 `Popconfirm`，部分操作需支持“不再提示”。
5. **持续集成与发布**: 
   - **版本号管理**: 严禁手动修改 `package.json` 中的版本号。版本号升级由 `release-please` 基于提交信息 (Conventional Commits) 自动处理。
   - **自动化打包**: 合并 Release PR 后，GitHub Actions 会自动触发跨平台 (Mac, Windows, Linux) 打包，并将产物上传至 GitHub Releases。
6. **代码规范**:
   - **文件行数限制**: 单个代码文件（如组件、页面、Hooks等）**严禁超过 400 行**。如果功能过于复杂，必须主动将其拆分为更小的模块或抽离独立组件。
