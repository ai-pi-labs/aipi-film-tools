<p align="center">
  <img src="docs/assets/aipi-banner.svg" alt="AIπ · AI圆周派 — 逐镜拉片与同步审片" width="100%">
</p>

<h1 align="center">AIπ · 逐镜拉片与同步审片</h1>

<p align="center"><strong>逐镜读懂画面，把分析带到拍摄现场。</strong><br>Shot by shot. From study to reshoot.</p>

<p align="center">
  <a href="https://github.com/ai-pi-labs/aipi-film-tools/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ai-pi-labs/aipi-film-tools?style=flat-square&amp;label=release&amp;color=ca9442"></a>
  <a href="LICENSE"><img alt="Code license: MIT" src="https://img.shields.io/badge/code-MIT-343c47?style=flat-square"></a>
  <a href="docs/installation.md"><img alt="Codex · Claude · WorkBuddy" src="https://img.shields.io/badge/Codex%20%C2%B7%20Claude%20%C2%B7%20WorkBuddy-skills-343c47?style=flat-square"></a>
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="docs/installation.md"><strong>安装指南</strong></a> ·
  <a href="https://github.com/ai-pi-labs/aipi-film-tools/releases/latest"><strong>下载技能</strong></a> ·
  <a href="docs/case-study.md"><strong>查看案例</strong></a> ·
  <a href="docs/usage.md"><strong>使用说明</strong></a>
</p>

---

把成片整理成一镜一行的镜头表，在同一个工作台对照原片阅读对白、导演分析和复拍建议，再导出带逐镜说明的同步审片视频。

## 先看效果

《归雾镇》第一集 · **93 镜** · **74 条语言记录** · **186 张关键帧**

同步审片节选 · 20 秒。点击播放，可全屏查看。

https://github.com/user-attachments/assets/1bc328aa-76be-46f8-963d-f42e6e55c0a1

视频来源：饭团鱼子酱（钱叔_）提供。

[查看案例交付说明](docs/case-study.md) · [下载完整案例包](https://github.com/ai-pi-labs/aipi-film-tools/releases/download/v1.0.1/aipi-guiwu-episode01-case.zip)

<details>
<summary>展开查看逐镜工作台</summary>

![《归雾镇》第一集 · 播放联动工作台](docs/case-workbench-preview.png)

点击镜头定位原片，播放时自动高亮并滚动跟随。支持全文搜索、关键帧放大、跨镜对白全文，以及展开阅读导演分析。手动滚动时暂缓跟随，方便细读。

</details>

台词与唱腔仍有待核内容，定稿前请结合原片确认。

## 两个技能，一套工作流

| 技能 | 你能得到什么 |
| --- | --- |
| **逐镜拉片** · `aipi-film-study` | 镜头切点、入出双帧、逐镜表格、语言记录、导演分析、复拍建议与播放联动报告 |
| **同步审片** · `aipi-sync-video` | 原片与逐镜说明同屏播放，保留完整画幅与原声，方便看片、讨论与复拍准备 |

导演解读与可见画面分开记录；跨镜句子保留全文。自动检测提供候选切点，画面和声音需结合原片复核。

## 安装与开始使用

从 [Releases](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 选择安装包，按对应宿主指南安装两个技能。

| 宿主 | 安装方式 | 指南 |
| --- | --- | --- |
| Codex 桌面本地任务 / CLI / IDE | 安装器，或复制完整技能目录到 `.agents/skills/` | [Codex](docs/codex.md) |
| Claude Code | 复制完整技能目录到 `.claude/skills/` | [Claude](docs/claude.md) |
| Claude 网页 / 桌面聊天 / Cowork | 上传 `*-claude.zip`，确认会话运行能力 | [Claude](docs/claude.md) |
| WorkBuddy | 技能管理中上传平铺 ZIP 并启用 | [WorkBuddy](docs/workbuddy.md) |
| Cursor / VS Code Copilot | 复制到对应技能目录 | [其他宿主](docs/other-hosts.md) |

平铺包是 `aipi-film-study.zip`、`aipi-sync-video.zip`；Claude 上传包是 `aipi-film-study-claude.zip`、`aipi-sync-video-claude.zip`。两种包使用相同执行代码，目录结构与宿主元数据不同。

完整运行需要 **Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium 和中文字体**。本项目不内置 ASR/OCR，语言识别与核对使用宿主已有能力。

[选包与安装总览](docs/installation.md) · [配置运行依赖](docs/prerequisites.md) · [使用流程与排错](docs/usage.md)

## 直接这样调用

**逐镜拉片**

> 使用 aipi-film-study 拉这条片子。一镜一行，核对对白、画外音、唱腔和片尾；每镜写画面观察、人物意图、情绪变化、空间调度、剪辑判断与复拍建议。输出播放联动报告、CSV 和 SRT，未确认内容保留待核。

**同步审片**

> 使用 aipi-sync-video，基于最终 study.json 和同一条原片导出同步视频，保留原声与完整分析。先执行生产检查；若需要待核参考版，请明确标记。

## 案例文件怎么用

解压 `aipi-guiwu-episode01-case.zip`，进入同名文件夹：打开 `report.html` 看工作台，播放 `AIπ同步审片-参考版.mp4` 看同步视频，或用表格软件打开逐镜 CSV。只查看成品无需安装技能。

[中文交付说明](docs/case-study.md) · [English delivery guide](docs/case-study.en.md)

<details>
<summary>开发者：本地命令、数据格式与运行边界</summary>

### 本地运行

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

### 时间轴和输出边界

- 拉片引擎保留实测 PTS，支持可变帧率及非零起点抽帧；音频早于首视频帧的素材目前明确拒绝。
- 网页播放要求零起点；同步视频首版还要求实际验证过的恒定帧率。不能静默改速后套用旧切点。
- 同步视频按源时长播放，短镜可以暂停阅读。正文放不下时明确报错，可增加面板尺寸，不会静默截字。
- 可复制的音轨保留原包；其他编码可能转码。每轨起点、时长和音频参数都会检查。声音信号完整不代表转写已经穷尽。
- 本机完整回归基于 macOS。CI 验证 Linux 的核心命令和打包；Windows 及其他宿主需当地实测。


</details>

## 开源许可

Copyright © 2026 **AIπ（AI圆周派）**。应用代码、界面与工作流文档采用 [MIT License](LICENSE)。外部运行工具和用户素材各自保留其权利，见 [第三方说明](THIRD_PARTY_NOTICES.md)。
