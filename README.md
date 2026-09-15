# AIπ｜AI圆周派 · 逐镜拉片与同步审片

[English case study & delivery guide](docs/case-study.en.md)

把成片整理成一镜一行的镜头表，结合完整语言记录、导演解读和复拍建议，在同一个工作台对照原片阅读，再导出同步审片视频。

![《归雾镇》第一集 · AIπ 逐镜工作台实测截图](docs/case-workbench-preview.png)

视频来源：饭团鱼子酱（钱叔_）提供。

## 两个技能

| 技能 | 用途 |
| --- | --- |
| `aipi-film-study` · 逐镜拉片 | 测量真实帧时间、检测候选切点、抽取双帧、关联跨镜对白、生成镜头表和交互报告 |
| `aipi-sync-video` · 同步审片 | 按源帧数合成当前镜头说明、对白、导演分析与复拍建议，保留完整原声 |

工作台支持播放定位、自动跟随、手动滚动暂停跟随、全文搜索、关键帧放大、逐句文本和表格优先布局。导演解读与可见画面分开记录，跨镜句子完整显示。

自动检测生成候选，仍需要看片补切或合并。本项目不内置语音识别或字幕识别模型，识别与逐段核对使用宿主已有能力。`pending` 不代表没有对白，字幕核实也不等于音轨已经完整听审。

## 安装技能

从 [Releases 下载页](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest)选择对应安装包，或复制源码中 `skills/` 下的两个完整技能目录。四个技能 ZIP 包含相同的两套执行代码；平铺包补充 WorkBuddy 所需元数据，`*-claude.zip` 使用标准元数据并保留技能名顶层目录，供 Claude 上传或解压安装。

| 宿主 | 安装入口 | 详细说明 |
| --- | --- | --- |
| Codex 桌面本地任务 / CLI / IDE | 内置安装器，或用户 / 项目 `.agents/skills/` | [Codex 安装与使用](docs/codex.md) |
| Claude Code | 用户 / 项目 `.claude/skills/` | [Claude Code 指南](docs/claude.md) |
| Claude 网页 / 桌面聊天 / Cowork | 上传 `*-claude.zip`；先确认实际会话具备运行依赖 | [Claude 各入口说明](docs/claude.md) |
| WorkBuddy | 技能管理中上传平铺 ZIP 并启用 | [WorkBuddy 指南](docs/workbuddy.md) |
| Cursor / VS Code Copilot | 复制到对应技能目录 | [其他宿主指南](docs/other-hosts.md) |

[安装总览与选包](docs/installation.md) · [依赖配置](docs/prerequisites.md) · [使用流程与排错](docs/usage.md)

本项目需要宿主能够读取素材、执行命令和保存文件。安装技能不等于已配置视频工具或声音识别；各宿主客户端的实际可用性以首次验证为准。

## 拉片案例

[《归雾镇》第一集](docs/case-study.md)，时长约 3 分 33 秒。案例按一镜一行整理为 93 镜，包含 74 条语言记录、186 张关键帧，以及每镜的导演分析和复拍建议。

下载包包含原片、播放联动报告、同步审片视频、`study.json`、逐镜 CSV 和逐句 SRT，可用于对照看片、查阅镜头和复拍准备。

在 [Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载 `aipi-guiwu-episode01-case.zip`，完整解压后进入 `aipi-guiwu-episode01-case/`：打开 `report.html` 对照原片阅读，或播放 `AIπ同步审片-参考版.mp4`。同页提供 `aipi-guiwu-episode01-case.sha256` 校验文件。

台词与唱腔仍有待核内容，定稿前请结合原片确认。

[中文交付说明](docs/case-study.md) · [English delivery guide](docs/case-study.en.md)

**For English readers:** The *Guiwu Town* (《归雾镇》) Episode 1 package includes 93 shots, 74 language entries, 186 keyframes, an interactive report, director's notes, reshoot suggestions and a synchronized review video. The report and analysis are in Chinese; the [English guide](docs/case-study.en.md) covers the files and viewing steps.

## 调用示例

> 使用 AI圆周派 · 逐镜拉片（aipi-film-study）拉这条片子。一镜一行，核对完整对白、画外音、唱腔和片尾；每镜写画面观察、人物意图、情绪变化、调度、剪辑判断及复拍建议。生成播放联动报告、逐镜 CSV 和逐句 SRT。未确认内容保留待核，不用摘要替代原文。

> 使用 AI圆周派 · 同步审片（aipi-sync-video），用最终 study.json 和同一条原片导出同步视频。先执行生产检查；只有明确需要待核参考版时才使用 --reference。

## 本地运行

完整项目需要 **Node.js 22+、FFmpeg、ffprobe**；同步导出和网页回归还需要 **Chrome/Chromium** 与中文字体。没有 npm 运行依赖，不需要 `npm install`。仅使用拉片核心时 Node.js 18+ 即可；打包安装 ZIP 需要 Python 3。

开发者可先生成三镜合成测试素材，检查工具链：

```sh
npm run demo
```

打开生成的 `examples/demo/report.html`。这是 FFmpeg 生成的开发测试素材，仅用于工具自测；公开实片案例请下载上面的《归雾镇》案例包。

处理自己的原片：

```sh
node skills/aipi-film-study/scripts/engine.mjs probe input.mp4
node skills/aipi-film-study/scripts/engine.mjs detect input.mp4 --out work/study.json
node skills/aipi-film-study/scripts/engine.mjs frames work/study.json --video input.mp4 --out work/frames
# 在生成的 work/study.frames.json 中完成画面、语言及导演记录，再进行核对。
node skills/aipi-film-study/scripts/engine.mjs validate work/study.frames.json --production
node skills/aipi-film-study/scripts/report.mjs work/study.frames.json --out work/report.html
node skills/aipi-film-study/scripts/engine.mjs table work/study.frames.json --out work/shots.csv
node skills/aipi-film-study/scripts/engine.mjs subtitles work/study.frames.json --out work/dialogue.srt
node skills/aipi-sync-video/scripts/export.mjs work/study.frames.json --video input.mp4 --out work/review.mp4
```

生产检查失败时按具体原因补核；不要改标签伪装完成。需要查看尚未核完的数据时，在同步导出命令末尾添加 `--reference`，每张信息面板都会保留参考标记。

[数据格式](skills/aipi-film-study/references/study-format.md) · [语言核对与导演记录](skills/aipi-film-study/references/review-method.md) · [开发与验证](docs/development.md)

## 时间轴和输出边界

- 拉片引擎保留实测 PTS，支持可变帧率及非零起点抽帧；音频早于首视频帧的素材目前明确拒绝。
- 网页播放要求零起点；同步视频首版还要求实际验证过的恒定帧率。不能静默改速后套用旧切点。
- 同步视频按源时长播放，短镜可以暂停阅读。正文放不下时明确报错，可增加面板尺寸，不会静默截字。
- 可复制的音轨保留原包；其他编码可能转码。每轨起点、时长和音频参数都会检查。声音信号完整不代表转写已经穷尽。
- 本机完整回归基于 macOS。CI 验证 Linux 的核心命令和打包；Windows 及其他宿主需当地实测。

## 开源许可

Copyright © 2026 **AIπ（AI圆周派）**。应用代码、界面与工作流文档采用 [MIT License](LICENSE)。外部运行工具和用户素材各自保留其权利，见 [第三方说明](THIRD_PARTY_NOTICES.md)。
