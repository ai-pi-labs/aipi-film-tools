# 使用流程与可复制提示词

先完成 [宿主安装](installation.md) 和 [依赖检查](prerequisites.md)。首次查看成果可直接下载 [《归雾镇》第一集实片案例](case-study.md)。下文的提示词对多个宿主通用；点名方式按各宿主指南调整。

从 [Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载 `aipi-guiwu-episode01-case.zip` 与 `aipi-guiwu-episode01-case.sha256`，解压进入 `aipi-guiwu-episode01-case/`，打开 `report.html` 或 `AIπ同步审片-参考版.mp4`。案例复用已测试成果，无需源码或重新生成：约 3 分 33 秒、93 镜、74 条语言记录、5104 帧。全音轨审核尚未完成，因此保留参考状态；已记录的语言数量不代表全部对白已经听核。

## 1. 提供原片和输出位置

推荐把素材放在宿主当前项目中，例如 `input.mp4`，并指定 `work/本片/` 为输出位置。远程或云端任务需要使用该环境能访问的素材副本，不能把电脑上的绝对路径当作云端附件。

发送：

```text
使用 AI圆周派 · 逐镜拉片（aipi-film-study）分析 input.mp4，输出到 work/本片/。
先检查工具和素材的帧率、时长、音轨，再逐镜分析。
保持原片一镜一行；长镜里的动作变化不要拆成多个镜头，单帧闪切也不要合并掉。
逐句核对对白、画外音、唱腔、跨镜续句和片尾，保留说话人、时间与来源。
每镜写可见画面、人物意图、情绪变化、调度、剪辑判断和复拍建议。
输出播放联动报告、逐镜 CSV 和逐句 SRT；未核实的内容明确待核，不用摘要替代原文。
```

切点检测会生成候选。代理还需要看片修正边界、填入分析并核对声音；本项目没有“一条命令自动完整听写全片”的内置模型。

## 2. 审阅结果

打开报告，检查视频播放能否带动当前镜头和列表，手动读表时能否暂停跟随。点击镜号应落在本镜首帧。查看最长对白、跨镜句子、最短镜头、导演分析和片尾是否完整。

| 文件 | 用途 |
| --- | --- |
| 最终 `study.json` | 唯一结构化依据，记录镜头、语言、分析、来源和审核状态 |
| `frames/` | 各镜首尾关键帧及身份记录 |
| `report.html` | 对照原片播放的工作台 |
| `shots.csv` | 一镜一行，供表格工具读取 |
| `dialogue.srt` | 按独立句子时间导出的字幕 |
| `review.mp4` | 带当前镜头信息与原声的同步审片视频 |

文件名可自定。抽帧命令可能返回 `study.frames.json` 等新数据文件，应以后续实际使用的最终文件为准，不要继续编辑旧底稿。

报告依赖原片与关键帧。复制/分享时保持它们与 HTML 的相对位置；仅发送 HTML 不会自动附带影片。GitHub 源码页也不会直接执行 HTML，可以把案例解压到本地后打开。

## 3. 导出同步视频

正式交付请求：

```text
使用 aipi-sync-video，根据最终 study.json 和同一条原片导出同步审片视频。
先检查生产条件。完整保留原画幅、原声、全部逐句文本、导演分析和复拍建议。
导出后核对完整解码、片长、视频帧数、音轨以及最短镜与最长文本。
如果仍有待核项，给出具体位置和补核要求，不把它们改成已完成。
```

如有意先看待核参考版：

```text
这次需要参考版，允许保留未核项。请用 --reference 导出，保留参考标识，
并列出未解决的声音和画面问题；不要宣称已经完成生产审核。
```

## 4. 直接运行命令

在源码仓库根目录执行；安装到宿主目录时，把 `skills/...` 替换为实际技能文件夹路径。包含空格的路径使用引号。

```sh
node skills/aipi-film-study/scripts/engine.mjs probe input.mp4
node skills/aipi-film-study/scripts/engine.mjs detect input.mp4 --out work/study.json
node skills/aipi-film-study/scripts/engine.mjs frames work/study.json --video input.mp4 --out work/frames
```

随后读取命令返回的数据文件，看片、听音并完善记录。以下假设最终文件为 `work/study.frames.json`：

```sh
node skills/aipi-film-study/scripts/engine.mjs validate work/study.frames.json --production
node skills/aipi-film-study/scripts/report.mjs work/study.frames.json --out work/report.html
node skills/aipi-film-study/scripts/engine.mjs table work/study.frames.json --out work/shots.csv
node skills/aipi-film-study/scripts/engine.mjs subtitles work/study.frames.json --out work/dialogue.srt
node skills/aipi-sync-video/scripts/export.mjs work/study.frames.json --video input.mp4 --out work/review.mp4
```

`validate --production` 失败时先补核。若明确需要参考导出，在最后一条命令添加 `--reference`；它不会把未完成的数据变为生产完成。

## 5. 修改和重新生成

修改对白、切点或导演文字后，重新生成受影响的 HTML、CSV、SRT 和同步视频。输入视频变化后重新测量帧时间与素材身份。同步导出首版要求零起点、经实测确认的恒定帧率；不要改速后沿用旧切点。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 只读了说明，没有生成文件 | 确认会话有命令执行、文件读写和视觉/声音核对能力，并明确要求运行入口 |
| 报告中视频或图片空白 | 检查相对路径及素材是否一起复制；优先从完整输出文件夹打开 |
| 对白不全但技术检查通过 | 回到逐句语言表和音轨覆盖记录补核；信号完整不等于转写完整 |
| 中文显示成方框 | 在渲染浏览器实际运行的环境安装中文字体，再生成面板 |
| 同步导出提示文字过长 | 依据 `--help` 调整面板尺寸；不删掉对白或把导演文字截断 |
| Claude/Cowork/云端能加载技能但不能编码 | 按当前执行环境检查工具，必要时把编码步骤移到本地，说明剩余边界 |

[数据约定](../skills/aipi-film-study/references/study-format.md) · [语言核对方法](../skills/aipi-film-study/references/review-method.md) · [实片案例](case-study.md)
