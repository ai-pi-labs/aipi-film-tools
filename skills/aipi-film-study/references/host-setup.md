# 安装与宿主检查

安装目录以实际加载的 SKILL.md 为准。将该文件所在目录作为技能根目录，使用其中 scripts/ 下的入口；不要根据另一应用的隐藏目录猜测路径。

| 宿主 | 本地目录或导入方式 |
| --- | --- |
| Codex | 用户 ~/.agents/skills/ 或项目 .agents/skills/；也可让内置 skill-installer 安装并报告实际路径 |
| Claude Code | 用户 ~/.claude/skills/ 或项目 .claude/skills/ |
| Claude 网页/桌面技能管理 | 使用带同名顶层目录的 *-claude.zip；会话运行环境单独检查 |
| WorkBuddy | 技能 → 添加技能 → 上传技能，导入项目平铺 ZIP 并启用 |
| Cursor / VS Code Copilot | 使用各宿主支持的技能目录；保留两个独立技能文件夹 |

完整逐平台步骤、更新与卸载见 [公开安装指南](https://github.com/ai-pi-labs/aipi-film-tools/blob/main/docs/installation.md)。

## 首次运行

在宿主实际执行命令的环境内检查：

```sh
node --version
ffmpeg -version
ffprobe -version
```

完整流程统一准备 Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium 和中文字体；只执行拉片核心可使用 Node.js 18+。无 npm 运行依赖。浏览器位置可由同步导出参数 --chrome 或 AIPI_CHROME 环境变量指定。

先从当前技能目录运行对应入口的 --help：逐镜拉片为 scripts/engine.mjs，同步审片为 scripts/export.mjs。再用短素材或 [已测试实片案例（保留待核项）](https://github.com/ai-pi-labs/aipi-film-tools/blob/main/docs/case-study.md) 检查实际输出。

技能导入不会安装媒体工具，也不会增加 ASR、OCR 或音频理解能力。视觉理解、语言转写和核对由宿主已有能力或用户选定的服务承担；无证据时保留待核，不用“脚本成功”代替内容审核。

本机、WSL、远程机器和云端会话是不同运行环境。云端看见说明不代表能读取电脑上的视频或调用电脑上的 FFmpeg；输出写入任务实际可访问的工作目录。需要外部识别服务时按用户选择与授权使用，不自行上传原片。

HTML、原片和帧图整体保留相对路径，使用普通浏览器离线打开。平台兼容路线不等于已经在所有客户端实测，首次使用报告实际工具、输出和未完成项。
