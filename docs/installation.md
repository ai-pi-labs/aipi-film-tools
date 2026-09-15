# 安装总览

先选宿主，再按对应入口安装。技能负责工作流程与脚本；Node.js、FFmpeg、Chrome 等工具需要在**实际执行命令的环境**里准备好。

| 使用环境 | 安装方式 | 使用指南 |
| --- | --- | --- |
| Codex 桌面本地任务、CLI、IDE 扩展 | 复制两个技能目录到 `~/.agents/skills/` 或项目 `.agents/skills/`；也可使用内置安装器 | [Codex](codex.md) |
| Claude Code | 复制到 `~/.claude/skills/` 或项目 `.claude/skills/` | [Claude Code](claude.md) |
| Claude 网页、普通桌面聊天、Cowork | 在技能管理入口上传 `*-claude.zip`；运行依赖以会话环境检查为准 | [Claude 各入口差异](claude.md) |
| WorkBuddy | 从技能管理入口导入平铺 ZIP，并启用 | [WorkBuddy](workbuddy.md) |
| Cursor | 项目 `.cursor/skills/` 或个人 `~/.cursor/skills/` | [其他宿主](other-hosts.md) |
| VS Code GitHub Copilot | 项目 `.github/skills/` 或个人 `~/.copilot/skills/` | [其他宿主](other-hosts.md) |
| 其他支持 Agent Skills 的本地代理 | 按其文档加载完整技能目录，再检查文件与命令能力 | [通用适配](other-hosts.md) |

各宿主的官方依据列在对应指南。格式兼容不等于每个平台的客户端都已实测。

## 下载哪个文件

从 [最新 Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载：

| 附件 | 适用方式 | 解压后结构 |
| --- | --- | --- |
| `aipi-film-study.zip` | WorkBuddy 专用导入 | 根目录有 `SKILL.md` |
| `aipi-sync-video.zip` | 同上 | 根目录有 `SKILL.md` |
| `aipi-film-study-claude.zip` | Claude 技能上传；Codex 等也可解压安装完整文件夹 | `aipi-film-study/SKILL.md` |
| `aipi-sync-video-claude.zip` | 同上 | `aipi-sync-video/SKILL.md` |
| `aipi-guiwu-episode01-case.zip` | 《归雾镇》第一集实片案例，无需作为技能安装 | `aipi-guiwu-episode01-case/` 内含原片、数据、报告、表格、字幕与同步参考视频 |
| `SHA256SUMS`、`manifest.json` | 核对四个技能包与包内文件 | 校验文本 |
| `aipi-guiwu-episode01-case.sha256` | 核对实片案例包 | 校验文本 |

两种技能 ZIP 的执行脚本和工作流正文相同。平铺包为 WorkBuddy 额外加入根级 `description_zh`、`description_en`、`version`、`author` 等字段；源码目录和带顶层目录的包使用标准 `metadata`。不要把整个源码仓库 ZIP 当作一个技能导入，也不要把两个技能解压进同一个文件夹。正确目录关系为：

```text
宿主的技能根目录/
├── aipi-film-study/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   └── ui/
└── aipi-sync-video/
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── ui/
```

## 从安装到首次使用

只想查看成果时，下载上述实片案例包及校验文件，解压进入 `aipi-guiwu-episode01-case/`，打开 `report.html` 或 `AIπ同步审片-参考版.mp4`。案例复用已测试的《归雾镇》第一集成果：约 3 分 33 秒、93 镜、74 条语言记录、5104 帧。当前仍是参考版，尚未完成全音轨审核；这些数量不代表对白已经全部听核。案例内容与使用边界见[实片案例说明](case-study.md)。

1. 按 [运行环境](prerequisites.md) 检查 Node.js 22+、FFmpeg、ffprobe；同步视频另需 Chrome/Chromium 和中文字体。
2. 按宿主指南安装两个技能，开启一个能执行命令、读写项目文件的任务。
3. 先让代理报告实际加载的 `SKILL.md` 路径，并执行两个入口的 `--help`。
4. 按 [使用流程](usage.md) 处理影片，或先下载 [实片案例](case-study.md) 看结果。
5. 生产交付前完成画面与声音核对；命令成功并不证明对白没有遗漏。

## 更新与卸载

记录最初安装的目录和版本（`SKILL.md` 中的 `metadata.version`）。升级时先把自己修改过的技能目录移到技能扫描范围外备份，再整体替换该目录，避免旧文件残留或同名技能重复出现。只在一个选定的用户级或项目级目录安装同一技能。

上传型宿主按其实际更新/卸载入口操作；目录型宿主移除对应的两个技能文件夹即可。素材、报告和同步视频存放在独立项目目录，卸载技能不会要求删除它们。

## 验证范围

核心及报告契约在 macOS 本机与 Linux CI 验证；同步导出、浏览器交互与实片案例的技术流程在本机验证。Claude、WorkBuddy、Cursor、Copilot 的安装路线依据官方文档整理，未逐一完成客户端内端到端验收。Windows、WSL、容器和远程机器需要各自执行最小验证。

[返回首页](../README.md) · [使用流程与提示词](usage.md) · [实片案例](case-study.md)
