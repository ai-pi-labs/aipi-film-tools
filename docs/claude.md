# 在 Claude 中安装与使用

本项目更适合在**本地 Claude Code** 中处理原片：Node.js、FFmpeg、浏览器和素材可以放在同一执行环境。Claude 网页、桌面 Chat 与 Cowork 也能加载自定义技能，但加载成功并不等于具备完整的视频运行环境。

本文于 **2026-09-15** 核对 Anthropic 官方文档。项目命令已经过本地验证；尚未在 Claude Code、Claude Chat 或 Cowork 客户端完成端到端验收。下面区分官方支持的安装机制与本项目仍需现场检查的能力。

## 先选入口

| 使用入口 | 技能安装位置或方式 | 本项目的使用条件 |
| --- | --- | --- |
| 本地 Claude Code | 个人 `~/.claude/skills/`，或项目 `.claude/skills/` | 推荐。运行工具、素材权限和输出目录均需在该会话可用 |
| Claude 网页 / 桌面普通 Chat | `Customize → Skills` 上传 Claude 专用 ZIP | 先检查沙箱内的工具和文件访问；不能直接套用本机安装路径 |
| Cowork | 启用 Claude 账号中的技能；通过桌面应用连接本地文件 | 不能把本地文件访问等同于本地 shell 或依赖可用 |

Claude Code 的个人、项目技能目录见[官方加载位置](https://code.claude.com/docs/en/skills#choose-where-skills-load)；Chat 上传入口见[官方使用说明](https://support.claude.com/en/articles/12512180-use-skills-in-claude)。Cowork 不读取你电脑上的 `~/.claude/skills/`，使用账号启用的技能，见[官方 Cowork 与云会话说明](https://code.claude.com/docs/en/skills#use-skills-in-cowork-and-cloud-sessions)。

## Claude Code：安装到本机

先按 [Claude Code 官方安装说明](https://code.claude.com/docs/en/setup)准备客户端并登录。然后下载本仓库完整源码，或在已装 Git 的终端执行：

```sh
git clone https://github.com/ai-pi-labs/aipi-film-tools.git
cd aipi-film-tools
```

以下安装命令从**仓库根目录**执行，复制整个技能目录，包括 `scripts/`、`references/`、`ui/` 等文件；只复制 `SKILL.md` 不能运行视频工具。

### macOS / Linux / WSL

个人安装对该机器上的本地 Claude Code 项目生效。仅供一个项目使用时，改用注释中的目标路径，两种安装位置选一个即可。以下命令先检查两个目标；任何一个已存在时均停止，先备份并移出旧目录后再重试。

```sh
(
  set -eu
  aipi_target="$HOME/.claude/skills"
  # 项目安装：将上一行改为目标项目的绝对路径，例如：
  # aipi_target="/path/to/your-project/.claude/skills"

  for aipi_skill in aipi-film-study aipi-sync-video; do
    test -f "skills/$aipi_skill/SKILL.md"
    if [ -e "$aipi_target/$aipi_skill" ] || [ -L "$aipi_target/$aipi_skill" ]; then
      printf '%s\n' "已存在：$aipi_target/$aipi_skill；请先备份并移出旧目录。" >&2
      exit 1
    fi
  done
  mkdir -p "$aipi_target"
  cp -R skills/aipi-film-study skills/aipi-sync-video "$aipi_target/"
)
```

### Windows PowerShell

在原生 Windows Claude Code 使用的用户账户下执行：

```powershell
$aipiTarget = Join-Path $env:USERPROFILE '.claude\skills'
# 项目安装：将上一行改为：
# $aipiTarget = 'D:\YourProject\.claude\skills'

$aipiSkills = @('aipi-film-study', 'aipi-sync-video')
foreach ($aipiSkill in $aipiSkills) {
    if (-not (Test-Path -LiteralPath "skills\$aipiSkill\SKILL.md" -PathType Leaf)) {
        throw '请先进入完整源码仓库根目录。'
    }
    $aipiDestination = Join-Path $aipiTarget $aipiSkill
    if (Test-Path -LiteralPath $aipiDestination) {
        throw "已存在：$aipiDestination；请按下文更新。"
    }
}
New-Item -ItemType Directory -Force -Path $aipiTarget -ErrorAction Stop | Out-Null
foreach ($aipiSkill in $aipiSkills) {
    Copy-Item -LiteralPath "skills\$aipiSkill" -Destination $aipiTarget -Recurse -ErrorAction Stop
}
```

使用 WSL 时，在 WSL 终端按 Linux 方式安装；技能目录中的 `~` 属于 WSL 用户。Node、FFmpeg、Chrome 和中文字体也应在实际运行命令的环境内可用，不混用 Windows 路径与 Linux 路径。Claude Code 支持原生 Windows 与 WSL，具体 shell 行为见[官方 Windows 设置](https://code.claude.com/docs/en/setup#set-up-on-windows)。本项目尚未完成 Windows / WSL 全流程验收。

安装结果应类似：

```text
.claude/skills/
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

从影片项目目录打开一个新的 Claude Code 会话，输入 `/` 查找两个技能。若同时装了个人版和项目版，同名技能的个人版优先；更新时应检查实际加载路径，避免调用旧副本。安装后新开会话也能避开首次创建技能根目录时的监听问题。[官方同名规则与刷新说明](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name)

## Claude 网页与桌面 Chat：上传专用 ZIP

从 [最新 Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest)下载：

- `aipi-film-study-claude.zip`
- `aipi-sync-video-claude.zip`

Claude 专用包的根层是技能同名目录。例如：

```text
aipi-film-study-claude.zip
└── aipi-film-study/
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── ui/
```

不要混用给 WorkBuddy 准备的平铺包 `aipi-film-study.zip` / `aipi-sync-video.zip`：它们还包含 WorkBuddy 专用的根级元数据。Claude 目录包和源码保留标准技能头。官方打包说明要求 ZIP 保留技能目录，明确把文件直接散落在 ZIP 根层列为错误结构。[官方自定义技能打包说明](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)

上传步骤：

1. 在设置中确认 `Code execution and file creation` 已启用；组织账户还受管理员技能设置约束。
2. 打开 `Customize → Skills`，点击 `+ → Create skill → Upload a skill`。
3. 分别上传上述两个 Claude ZIP，并在列表中启用。
4. 新建聊天，使用下面的自然语言提示，先检查运行环境。

界面名称可能随客户端版本调整，以 [Claude 官方技能操作说明](https://support.claude.com/en/articles/12512180-use-skills-in-claude)为准。把 ZIP 当普通聊天附件发送，或只上传到项目知识文件中，不等于已经安装技能。

如果旧 Release 没有专用包，可在**干净的完整源码**根目录手动打包；macOS / Linux 需要 `zip`：

```sh
mkdir -p claude-upload
(cd skills && zip -r ../claude-upload/aipi-film-study-claude.zip aipi-film-study)
(cd skills && zip -r ../claude-upload/aipi-sync-video-claude.zip aipi-sync-video)
```

PowerShell 的等价方式：

```powershell
New-Item -ItemType Directory -Force -Path claude-upload | Out-Null
Compress-Archive -LiteralPath skills\aipi-film-study -DestinationPath claude-upload\aipi-film-study-claude.zip
Compress-Archive -LiteralPath skills\aipi-sync-video -DestinationPath claude-upload\aipi-sync-video-claude.zip
```

普通 Chat 的代码执行在独立沙箱中进行。你电脑上的 `ffmpeg`、Chrome 或 `/Users/...` 文件路径不会因为安装技能就自动成为沙箱资源；还可能受到上传大小、可用磁盘、进程与运行时间限制。相关机制见[官方文件创建与执行环境说明](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude)。

因此，先检查沙箱能否完整执行下文的验证。若缺少工具或无法处理原片，可在本地完成探测、抽帧和导出，把实际帧、`study.json` 与逐句文本用于 Claude 的分析和校核；不要将这种分工报告为已在网页端完成全片听审与同步视频导出。

## Cowork：文件访问与执行位置分开检查

在账号中启用上述 Claude 专用技能，然后新建 Cowork 任务。需要访问本地素材时，在桌面应用中连接具体的素材 / 输出文件夹。仅把目录复制到 `~/.claude/skills/` 不会安装到 Cowork。[官方技能加载规则](https://code.claude.com/docs/en/skills#use-skills-in-cowork-and-cloud-sessions)

截至本文核对日期，官方说明 Cowork 的云端模式仍为 beta：代码和 shell 在 Anthropic 的隔离环境执行，本地文件、浏览器和电脑操作通过保持在线的桌面应用访问。能打开本地影片，并不能证明它可以调用本机的 FFmpeg 或 Chrome。[官方 Cowork 运行方式](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)

让 Cowork 先报告当前执行系统、工具绝对路径、可读取的原片路径以及可写输出目录，再跑合成示例。若账户显示旧的本地会话模式，同样以实际检查结果为准；不要推定宿主已有依赖，也不要把 Cowork 内置浏览器视为本项目可直接启动的无头 Chrome。缺少必要能力时，使用本地 Claude Code 执行视频处理，Cowork 继续处理可访问的分析数据。

## 运行工具与最小验证

完整使用两个技能，准备 **Node.js 22+、FFmpeg、ffprobe、Chrome / Chromium，以及中文字体**。拉片核心单独可用 Node.js 18+；为避免两个技能切换时产生版本差异，推荐统一用 22+。没有 npm 运行依赖，不需要 `npm install`。详细说明见[安装与依赖](installation.md)。

让 Claude 在**真正执行任务的环境**中检查：

```sh
node --version
ffmpeg -version
ffprobe -version
```

FFmpeg 应包含本项目所需编码器，例如合成示例使用 `libx264` 和 AAC。Chrome 应能创建独立无头进程。中文字体可使用系统中文字体或 Noto Sans CJK；最终以导出画面没有方框、缺字为准。

同步工具支持 `--chrome` 和 `AIPI_CHROME` 指定浏览器。当前自动查找列表未覆盖所有 Windows 安装位置，Windows 建议显式指定实际存在的可执行文件，例如：

```powershell
$env:AIPI_CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Test-Path -LiteralPath $env:AIPI_CHROME
```

若只装了技能 ZIP，先另行下载完整仓库，下面的 `examples/` 和 `package.json` 不属于独立技能包。**从完整仓库根目录执行**：

```sh
node skills/aipi-film-study/scripts/engine.mjs --help
node skills/aipi-sync-video/scripts/export.mjs --help
npm run demo
node skills/aipi-film-study/scripts/engine.mjs validate examples/demo/study.json --video examples/demo/demo.mp4 --check-assets
```

预期生成 `examples/demo/report.html`、`study.json`、`demo.mp4` 与 6 张关键帧；数据为 3 镜、4 条合成字幕，普通校验通过，仍保留待核状态。打开报告，播放原片并点击镜号，确认能定位、跟随和阅读全文。这个演示只验证工具链与呈现，不构成影片内容审核。

进一步验证 Chrome、中文字体和同步合成：

```sh
node skills/aipi-sync-video/scripts/export.mjs examples/demo/study.json --video examples/demo/demo.mp4 --out examples/demo/claude-reference.mp4 --work examples/demo/claude-render --reference --panel-px 1000 --font 24
```

这里必须显式使用 `--reference`，因为演示故意没有已完成的审核记录。成片应显示参考状态，中文可读、画面不裁切。对同一示例执行 `validate ... --production` **应该失败**；不能修改 `pending` / `uncertain` 标签来让它通过。

以上命令既可由你执行，也可交给 Claude 执行。确认 Claude 实际运行了命令并提供文件与检查结果；“识别到技能”“读过 SKILL.md”只能证明加载成功。

## 怎样调用

本地 Claude Code 可以直接输入技能命令；自动触发与 `/skill-name` 的机制见[官方调用说明](https://code.claude.com/docs/en/skills)。

```text
/aipi-film-study
对 /path/to/input.mp4 逐镜拉片，结果保存到 /path/to/output。
先检查依赖和源片，再核对全片画面与语言。一镜一行，保留完整对白、
画外音、唱腔与片尾；每镜给导演解读和复拍建议。
生成播放联动报告、CSV 与逐句 SRT。未确认项保留待核，不用摘要代替原文。
```

```text
/aipi-sync-video
读取 /path/to/output/study.json 与对应原片，先做生产检查，再导出同步审片视频。
若声音审核未完成，列出缺项；不要自行改成已核，也不要默认转成参考版。
```

网页、桌面 Chat 或 Cowork 可用自然语言明确指定技能：

> 使用 aipi-film-study（AI圆周派 · 逐镜拉片）。先列出你实际加载的技能路径、执行环境及 Node、FFmpeg、ffprobe 的版本，并检查是否能读取我提供的原片。具备条件后按一镜一行制作报告，全文保留语言记录、导演分析和复拍建议。缺少听辨或字幕识别能力时，明确记录未完成范围，不猜对白。

只想验证同步工具时可说：

> 使用 aipi-sync-video，把合成示例导出为参考版同步视频。允许使用 --reference，保留所有待核标记；检查中文字体、源帧数与最后一帧。

本项目**不内置 ASR / OCR 模型**，安装技能不会自动增加语音转写或字幕识别服务。要交付完整拉片，还需宿主实际可用的听辨 / 识别能力与逐段人工或代理核对；单靠抽取关键帧，不能宣称全片声音已审完。

## 更新、卸载与排查

**Claude Code 更新：**从新 Release 或干净源码取得两个完整目录。先把旧目录备份到 `.claude/skills/` 之外，再放入新目录，避免新旧文件混在一起；保留影片输出在独立项目目录。重新打开会话并确认实际加载路径与版本，重跑最小验证。

**Claude Code 卸载：**删除或移出安装位置中的 `aipi-film-study/` 与 `aipi-sync-video/` 两个目录即可，不必删除整个 `.claude/`。已加载的旧会话仍可能保留先前内容，卸载后新建会话。[官方移除技能说明](https://code.claude.com/docs/en/skills#remove-a-skill)

**网页 / Chat / Cowork 更新：**在 `Customize → Skills` 停用旧版，保留自定义修改后删除旧技能，再上传新 Claude ZIP 并启用；新建任务确认加载的是新版。卸载则在同一列表停用，或从技能详情的菜单选择删除。账号技能与手动安装的本地 Claude Code 副本应分别管理。[官方技能管理说明](https://support.claude.com/en/articles/12512180-use-skills-in-claude)

| 现象 | 检查方式 |
| --- | --- |
| `/` 菜单找不到技能 | 确认是本地 Claude Code；检查 `技能名/SKILL.md` 层级、实际用户目录和新会话 |
| 上传提示结构错误 | 使用 `*-claude.zip`；检查顶层目录与 `name` 相同，未上传整个仓库 ZIP |
| 列表可见但命令不能执行 | 检查该宿主实际的 shell、文件权限、依赖版本；不要只检查自己终端的 PATH |
| 同步提示找不到浏览器 | 用 `--chrome` 或 `AIPI_CHROME` 指向执行环境内的 Chrome / Chromium |
| 报告有文字但原片或关键帧丢失 | 保持 HTML、原片、帧目录的相对结构，整体下载或搬运结果文件夹 |
| 生产检查因声音待核失败 | 补充真实语言记录与审核证据；需要临时查看时明确选择参考版 |

更多数据与审核要求见[数据格式](../skills/aipi-film-study/references/study-format.md)和[核对方法](../skills/aipi-film-study/references/review-method.md)。
