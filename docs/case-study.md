# 完整案例：三种构图节奏

[下载最新案例包与校验文件](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest)。选择 `aipi-demo-case.zip` 和 `aipi-demo-case.sha256`，解压后进入 `aipi-demo-case/` 文件夹，再打开 `report.html`；同步视频是 `review.mp4`。目录可整体移动，文件之间使用相对路径。

这是一段由[演示生成器](../examples/create-demo.mjs)创作的几何动画：12 秒、24fps、288 帧、3 镜，含 4 条英文画面字幕。案例同时提供中文逐镜观察、导演分析、复拍建议、CSV、SRT 和同步审片视频。没有私人影片、人物素材、在线模型调用或外部媒体下载。

![同步视频实际画面](case-sync-preview.png)

| 镜头 | 画面与导演思路 | 可尝试的复拍方法 |
| --- | --- | --- |
| G01 · 0–4秒 | 金色方块沿水平方向移动。右侧留白让观众等待后续动作，固定细线让速度容易辨认。 | 固定机位和曝光，只移动主体；右侧保留足够空画面。 |
| G02 · 4–8秒 | 大形体保持静止，小方块从右靠近。大小、动静和缩短的间距共同建立张力。 | 先定位大形体，再标出水平移动轨迹；结束时保留清楚的间隙。 |
| G03 · 8–12秒 | 三个方块从不同高度逐渐归位，把前两镜的运动收束到共同水平线上。 | 从最终等距阵列倒推起点，按距离分配速度，让形体同时靠齐。 |

这些分析依据合成动画的生成参数，是示范性的视觉解读。第一条字幕 `GIVE THE SHAPE ROOM TO MOVE.` 从 0.5 秒持续到 4.4 秒，跨过 G01/G02 的切点。两行镜头记录和同步面板均保留全文；独立字幕表及 SRT 中只有一个 D01 事件。切点改变显示归属，不拆散或重复创建原始字幕事件。

原片带的是生成的静音音轨，英文说明没有配音。声音状态仍为 `pending`，字幕为 `uncertain`，审核状态为 `not-reviewed`。生产检查会拒绝此案例；同步导出显式使用 `--reference`，画面持续显示“参考版 · 含待核项 · 未通过生产验收”。静音信号复制一致不能说明完成了真实影片听审。

## 查看与验证

案例包包含 `demo.mp4`、`study.json`、6 张关键帧及清单、`report.html`、`shots.csv`、`dialogue.srt`、`review.mp4`、三张实际成片截图，以及简短说明、`verification.json` 和 `LICENSE`。原创合成案例由 AIπ（AI圆周派）署名，采用 MIT 许可证；转载或分发时保留版权与许可声明。它不包含浏览器配置、构建日志、开发者绝对路径或私人影片。同步视频保留原速；信息卡较长时可以暂停阅读。

构建会完整解码两条视频，核对 288 帧、音轨和切点前后实际画面，检查中文及字幕全文是否进入面板，比较原片与同步视频解码后的静音 PCM；随后移动解压，验证资源身份、报告引用和浏览器镜头定位。每次构建的机器检查写入验证摘要；`preview/` 供人工检查排版，脚本不会把自动检查写成人工目视结论。

若浏览器限制直接打开本地媒体，进入解压后的 `aipi-demo-case/` 目录运行：

```sh
python3 -m http.server 8000
```

再打开 `http://127.0.0.1:8000/report.html`。

校验 ZIP 时，另开终端并切换到**同时保存下载的 `aipi-demo-case.zip` 和 `aipi-demo-case.sha256` 的目录**，不要在解压后的案例文件夹中执行。macOS 或装有 `shasum` 的环境可运行：

```sh
shasum -a 256 -c aipi-demo-case.sha256
```

其他系统可使用同类 SHA-256 校验工具，将 ZIP 的摘要与 `.sha256` 文件中的值比较。

## 从仓库复现

先按[安装说明](installation.md)准备 Node.js 22+、带 libx264/AAC 的 FFmpeg 与 ffprobe、Chrome/Chromium、可显示中文的字体，以及 Python 3 标准库。然后在仓库根目录运行：

```sh
npm run case
# 或直接运行
node examples/build-case.mjs
# 显式指定浏览器
node examples/build-case.mjs --chrome "/path/to/chrome"
```

[案例构建脚本](../examples/build-case.mjs)复用原演示生成器，并调用仓库现有的分析、报告和同步导出代码。ZIP 和校验文件输出到 `dist/`，中间文件留在已忽略的 `work/case-build/`。可用 `--out` 和 `--work` 指定其他输出目录。详细开发说明见[开发文档](development.md)，代码和技能入口见[仓库首页](../README.md)。
