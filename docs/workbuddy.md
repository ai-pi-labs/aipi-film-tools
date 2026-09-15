# 在 WorkBuddy 安装与使用

将两个 AIπ 技能分别导入 WorkBuddy：`aipi-film-study` 负责逐镜分析，`aipi-sync-video` 负责根据分析数据导出同步视频。安装后先做一次短验证，再处理完整影片。

本文于 2026-09-15 核对 WorkBuddy 官方文档。本项目已检查发布 ZIP 的结构与解压后脚本入口；尚未在 WorkBuddy 客户端完成实际导入、自动调用和视频导出验收。

## 1. 下载与导入

从 [GitHub Releases](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载同一版本的两个附件：

| 安装包 | 用途 |
| --- | --- |
| [aipi-film-study.zip](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest/download/aipi-film-study.zip) | 一镜一行、完整语言记录、导演分析、复拍建议、交互报告 |
| [aipi-sync-video.zip](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest/download/aipi-sync-video.zip) | 根据最终逐镜数据合成同步审片 MP4 |

进入 WorkBuddy 的“技能”页面，选择“添加技能 → 上传技能”，分别选择这两个 ZIP。导入后，在“已安装”列表找到对应技能并确认开关已启用。官方说明导入器会自动完成技能配置，关闭技能会暂停模型调用，重新启用即可恢复。[WorkBuddy 技能安装与开关说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

使用上面的独立附件，无需重新压缩。v1.0.1 平铺包会补充官方开放平台要求的根级 `description_zh`、`description_en`、`version`、`author` 元数据；源码和 Claude 包采用标准 `metadata`。脚本与工作流正文相同。GitHub 自动生成的 `Source code (zip)` 是整个源码仓库，不能当作单个技能包直接使用。

本项目两个 ZIP 的根目录均直接包含 `SKILL.md`、`LICENSE`、`RIGHTS.txt` 和 `scripts/`、`ui/`、`tests/`、`references/`。WorkBuddy 开发文档要求技能目录包含 `SKILL.md`，用 YAML 元数据与 Markdown 正文定义技能，并说明了脚本和参考资料目录。官方页没有进一步明确 ZIP 外层目录的解析规则，因此以本项目提供的独立包为准。[WorkBuddy 技能结构说明](https://open.workbuddy.cn/docs/skill)

安装位置由 WorkBuddy 管理。执行脚本时，应从宿主实际加载的 `SKILL.md` 定位同目录资源，不猜测隐藏目录，也不套用其他应用的安装路径。

## 2. 确认执行环境

完整使用两个技能需要下列工具在 **WorkBuddy 实际执行命令的环境** 中可用。导入技能不会自动安装这些工具。

| 工具 | 用途与检查 |
| --- | --- |
| Node.js 22+ | 执行两个技能；运行 `node --version` |
| FFmpeg、ffprobe | 解码、测量、抽帧、编码；运行 `ffmpeg -version`、`ffprobe -version` |
| Chrome 或 Chromium | 将同步信息面板渲染成图像；可用 `--chrome` 或 `AIPI_CHROME` 指定可执行文件 |
| 中文字体 | 确保报告和同步面板正常显示中文，例如系统中文字体或 Noto Sans CJK |

核心逐镜脚本单独支持 Node.js 18+，但同步导出和完整开发验证要求 22+。两技能均不需要安装 npm 运行依赖。示例与常规 MP4 导出还需要 FFmpeg 构建支持相应编码器；缺失编码器时以命令的具体报错处理。项目依赖范围见[安装总览](installation.md)与[开发说明](development.md)。

可先向 WorkBuddy 发送：

```text
请检查已安装的 aipi-film-study 和 aipi-sync-video。
读取各自实际加载的 SKILL.md，告诉我版本与脚本位置。
在当前任务的执行环境检查 Node.js、FFmpeg、ffprobe、Chrome/Chromium 和中文字体，
运行两个入口的 --help，逐项报告实际结果。缺少的工具列出来，不要把未执行写成已通过。
```

这里需要宿主提供本地文件读写与命令执行能力。若当前模式只能阅读附件，或者命令环境无法访问原片，应先选择可执行本地任务的环境并使用可访问的素材路径。另一应用能运行这些命令，不代表 WorkBuddy 的 PATH、字体和文件权限已经相同。

## 3. 如何触发

在已启用技能的任务中，用自然语言明确点名技能，并提供原片可访问的路径及输出目录。官方支持在对话中调用已安装的技能；本文不假定某种专用斜杠命令。[WorkBuddy 技能调用说明](https://open.workbuddy.cn/docs/skill)

完整拉片提示词：

```text
请使用 aipi-film-study 拉片「输入视频的完整路径」，结果写入「输出目录」。
保持原片一镜一行，复核真实切点，保留单帧镜、跨镜续句、短应答、画外音、唱词和片尾发言。
每镜写画面观察、景别、运镜、完整语言记录、导演分析和可执行的复拍建议。
输出 study.json、参考帧、随播放定位滚动的 HTML、CSV 和 SRT。
核对全片声音与字幕，分别记录证据；无法听清或尚未核完的内容保留待核。
运行普通检查与生产检查，汇报实际结果，不得为了通过检查删句或改成已审核。
```

同步视频提示词：

```text
请使用 aipi-sync-video，以「最终 study.json 路径」和「对应原片路径」导出同步审片 MP4。
保持源画幅、源节奏和完整原声，显示每镜完整对白、导演分析与复拍建议。
先执行默认生产检查，完成后检查实际成片的帧数、音轨、单帧镜和最长文字镜。
如果内容审核未完成，先保留并报告具体阻断项。
```

需要预览待核数据时，可另加“这次允许用 `--reference` 导出明确标注待核的参考版”。该参数保留参考状态，不会让数据成为已完成的生产交付。

技能包没有内置 ASR、OCR、语音模型或在线服务凭据。听辨与字幕识别需要宿主已有能力或人工复核；字幕读对不等于音轨已听核，命令成功也不等于对白没有遗漏。

## 4. 最小可用性验证

先运行以下入口命令，把占位目录替换为 WorkBuddy 实际读取到的技能目录：

```sh
node "<逐镜技能目录>/scripts/engine.mjs" --help
node "<同步技能目录>/scripts/export.mjs" --help
```

两条命令应输出 AIπ 帮助并正常退出。这仅证明入口可以加载；还需实际跑一段素材。

已导入 ZIP 的用户可以给 WorkBuddy 一段 2–10 秒、零起点、恒定帧率的本地视频，要求它执行 `probe → detect → frames → report`，读取 `frames` 返回的新数据文件后再生成报告。打开生成的 HTML，确认原片与帧图可见，播放时镜号和列表随时间变化。自动检测只是候选底稿，空白分析和待核声音应继续显示为未完成。

只想查看成果，可从 [Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载 `aipi-guiwu-episode01-case.zip` 与 `aipi-guiwu-episode01-case.sha256`。解压进入 `aipi-guiwu-episode01-case/`，打开 `report.html` 或 `AIπ同步审片-参考版.mp4`。已导入技能 ZIP 的用户可直接查看这些文件，无需另取源码或重新生成案例。

这个实片案例复用已测试的《归雾镇》第一集成果，约 3 分 33 秒、93 镜、74 条语言记录、5104 帧。实际播放报告和同步视频，检查原画幅、中文、镜号联动及全文。全音轨审核尚未完成，现有语言记录与技术检查不能证明全部对白已经听核，因此保留参考状态。具体文件与核对范围见[实片案例](case-study.md)。

开发或依赖排查时，可下载或克隆[完整仓库](https://github.com/ai-pi-labs/aipi-film-tools)，在仓库根目录执行：

```sh
npm run demo
```

它只生成合成测试素材，用于工具自测，不是公开实片案例；输出在 `examples/demo/`，保留待核状态。这个脚本仅随源码提供，不在单个技能 ZIP 内，也不能验证真实影片的对白听写能力。

## 5. 保存、更新与卸载

原片、`study.json`、参考帧与报告应放在用户选定的项目目录中；分享可播放报告时保留文件相对关系，整体复制目录。CSV 和 SRT 可单独导出，MP4 另附检查清单。需要 XLSX 时由宿主的表格能力转换同一份数据，本技能没有内置表格软件运行时。

安装新版本前，保存项目输出，并备份自己改过的技能文件。从 Releases 下载同一版本的两个 ZIP。官方页未说明同名本地 ZIP 的覆盖升级规则：若客户端提供更新或替换入口，按其实际提示处理；没有该入口时，可先卸载旧技能，再按上面的流程导入新版。更新后核对加载版本，重跑入口和短素材验证。

暂时不用可关闭技能；完全移除则在“已安装”列表执行卸载。关闭保留技能文件，卸载删除技能及开关记录。项目输出应独立保存，不作为技能安装文件的一部分。[WorkBuddy 关闭与卸载说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

## 6. 常见区别与验证边界

| 情况 | 判断与处理 |
| --- | --- |
| 把 ZIP 拖到普通聊天附件里 | 可作为这次任务的文件输入；不能据此认定已完成技能安装。去技能管理页导入，并检查已安装列表及启用状态。 |
| 已安装，但回复只给泛泛分析 | 明确点名技能，要求读取实际 `SKILL.md`、执行入口并给出生成文件；检查当前任务是否允许执行本地命令。 |
| 终端可用，WorkBuddy 报找不到工具 | 在 WorkBuddy 自己的命令环境重新查 PATH 和可执行文件；浏览器可显式指定。 |
| 字幕完整，但生产检查仍失败 | 阅读具体阻断项。字幕证据不能替代全音轨核对；实片案例尚未完成全音轨审核，保留参考状态。 |
| 可变帧率或非零起点视频不能同步导出 | 当前同步路线要求零起点 CFR。需要时生成独立规范副本，再重新分析；不能直接套用旧时间码。 |

目前已验证的是本项目的包结构、解压入口与开发环境中的引擎、报告、同步流程。WorkBuddy 的模型选技、客户端权限、浏览器发现和各操作系统环境仍需按本文在目标设备确认；本指南不把官方支持本地导入等同于本项目已完成 WorkBuddy 全流程实测。
