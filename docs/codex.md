# Codex 安装与使用

适用于 Codex 桌面应用的本地任务、Codex CLI 和 IDE 扩展。先确认已能正常使用 Codex，再配置本项目的 [运行工具](prerequisites.md)。本项目提供独立技能目录，尚未打包为 Codex 插件市场条目。

## 方式一：让 Codex 安装

在本地任务中发送：

```text
使用 $skill-installer，从 https://github.com/ai-pi-labs/aipi-film-tools 安装
skills/aipi-film-study 和 skills/aipi-sync-video 两个技能。
先检查是否已经安装同名技能；保留我的本地修改，完成后报告实际安装位置。
```

安装器可从 GitHub 仓库安装技能；如果当前宿主没有该内置技能，使用下方手动方式。安装后在技能列表中确认两个名称，未出现时重启 Codex。[官方技能文档](https://learn.chatgpt.com/docs/build-skills)

## 方式二：手动安装

当前官方用户级路径是 `~/.agents/skills/`，项目级路径是 `<项目>/.agents/skills/`。选择其中一种；保留两个独立文件夹，文件夹名必须与技能 `name` 一致。[官方目录约定](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)

### macOS / Linux / WSL：用户级

在一个尚不存在 `aipi-film-tools` 子目录的位置执行。复制前先检查两个技能；任何一个已有旧目录时都会停止，请先备份并移出旧目录，再重新安装。

```sh
git clone https://github.com/ai-pi-labs/aipi-film-tools.git
cd aipi-film-tools
(
  set -eu
  aipi_target="$HOME/.agents/skills"
  for aipi_skill in aipi-film-study aipi-sync-video; do
    test -f "skills/$aipi_skill/SKILL.md"
    if [ -e "$aipi_target/$aipi_skill" ] || [ -L "$aipi_target/$aipi_skill" ]; then
      printf '%s\n' "已存在：$aipi_target/$aipi_skill；先备份并移出旧目录。" >&2
      exit 1
    fi
  done
  mkdir -p "$aipi_target"
  cp -R skills/aipi-film-study skills/aipi-sync-video "$aipi_target/"
)
```

没有 Git 时，在 GitHub 的 Code → Download ZIP 下载源码，解压后把 `skills/` 内的两个文件夹复制到相同目标。也可从 Release 下载 `aipi-film-study-claude.zip` 与 `aipi-sync-video-claude.zip`，解压出两个同名技能文件夹，再复制到所选技能根目录；不要额外套一层同名文件夹。这些目录包保留标准元数据，平铺 ZIP 则带有 WorkBuddy 专用扩展字段。

### Windows PowerShell：用户级

先克隆并进入仓库，再执行；这里使用当前 Windows 用户目录，不是 WSL 用户目录：

```powershell
$aipiTarget = Join-Path $env:USERPROFILE '.agents\skills'
$aipiSkills = @('aipi-film-study', 'aipi-sync-video')
foreach ($aipiSkill in $aipiSkills) {
    if (-not (Test-Path -LiteralPath "skills\$aipiSkill\SKILL.md" -PathType Leaf)) {
        throw '请先进入完整源码仓库根目录。'
    }
    $aipiDestination = Join-Path $aipiTarget $aipiSkill
    if (Test-Path -LiteralPath $aipiDestination) {
        throw "已存在：$aipiDestination；先备份并移出旧目录。"
    }
}
New-Item -ItemType Directory -Force -Path $aipiTarget -ErrorAction Stop | Out-Null
foreach ($aipiSkill in $aipiSkills) {
    Copy-Item -LiteralPath "skills\$aipiSkill" -Destination $aipiTarget -Recurse -ErrorAction Stop
}
```

### 只给一个项目使用

把仓库 `skills/` 里的两个文件夹放到**实际影片项目**的 `.agents/skills/`。例如：

```text
影片项目/
├── .agents/skills/aipi-film-study/SKILL.md
├── .agents/skills/aipi-sync-video/SKILL.md
├── input.mp4
└── work/
```

然后在 Codex 中打开这个影片项目。若任务运行在 Git worktree、SSH、容器或云端，技能和素材必须位于该任务实际能访问的位置；你本机的用户级安装不等于已装进远程环境。

已有旧版环境可能由安装器管理 `~/.codex/skills` 或自定义 `CODEX_HOME` 下的目录。不要为了统一名称再复制一份：先让 Codex 报告已加载的路径，再在该位置维护；全新手动安装按上述当前官方路径操作。

## 调用

在 Codex CLI / IDE 输入 `/skills` 查看技能，或用 `$` 点名。桌面不同版本可能显示 `$` 或 `@` 技能选择入口，也可以直接写技能全名。[官方调用方式](https://learn.chatgpt.com/docs/build-skills#how-chatgpt-and-codex-use-skills)

```text
$aipi-film-study
拉片 input.mp4，保持一镜一行；核对完整对白、画外音、唱腔、字幕和片尾，
每镜补充导演分析和复拍建议。输出到 work/本片/，生成联动报告、CSV 和 SRT。
先检查依赖，未核实的内容保留待核状态。
```

```text
$aipi-sync-video
用 work/本片/study.json 与 input.mp4 导出同步审片视频。
执行生产检查，完整保留画幅和原声。未通过时列出补核项。
```

## 最小验证

发送以下请求，让命令在 Codex 实际使用的环境中执行：

```text
请确认已加载 aipi-film-study 与 aipi-sync-video，并报告各自 SKILL.md 的绝对路径。
运行 node --version、ffmpeg -version、ffprobe -version，核对 Chrome/Chromium 的位置。
从实际技能目录运行 scripts/engine.mjs --help 与 scripts/export.mjs --help。
若工作区已有《归雾镇》第一集案例包，打开现有报告与同步参考视频，
检查资源、播放和镜号联动，保留尚未完成全音轨审核的参考状态。
```

只想查看交付效果，可从 [Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载 `aipi-guiwu-episode01-case.zip` 与 `aipi-guiwu-episode01-case.sha256`。解压进入 `aipi-guiwu-episode01-case/`，打开 `report.html` 或 `AIπ同步审片-参考版.mp4`；只安装了技能的用户也可直接查看，无需下载源码或重新生成案例。

这个实片案例复用已测试成果，约 3 分 33 秒、93 镜、74 条语言记录、5104 帧。全音轨审核尚未完成，现有语言记录与技术检查不能证明全部对白已经听核。具体文件与核对范围见[实片案例](case-study.md)。

如果只需验证安装，不必先编码视频，两个 `--help` 成功即可证明脚本入口可用；完整视频能力仍要在当前执行环境处理一段短素材，查看预先生成的案例不能替代这一检查。开发或依赖排查也可在完整源码根目录运行 `npm run demo`：它只生成合成测试素材，用于工具自测，不是公开实片案例。安装器和独立技能 ZIP 不包含该命令需要的 `examples/` 或 `package.json`。查看 [使用说明](usage.md) 了解生产验收条件。

## 更新、停用与排错

- 没出现在技能列表：检查是否多套了一层目录，`SKILL.md` 是否存在，是否装到了执行任务的那台机器；必要时重启。
- 出现两个同名技能：检查用户级和项目级安装，只保留要使用的版本。
- 找不到 Node / FFmpeg：按 [运行环境](prerequisites.md) 修复当前宿主的 PATH，不修改脚本里的业务路径来掩盖依赖问题。
- 没有写入权限：把输出放入已授权的项目工作目录；按宿主提示授权需要的路径。
- 停用可按官方 `[[skills.config]]` 配置指定技能路径与 `enabled = false`，再重启；手动卸载则移出对应目录。[官方停用说明](https://learn.chatgpt.com/docs/build-skills#enable-or-disable-local-codex-skills)

[安装总览](installation.md) · [实片案例](case-study.md)
