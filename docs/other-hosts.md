# Cursor、VS Code Copilot 与其他本地宿主

这些宿主可以加载完整的技能目录。推荐克隆 [ai-pi-labs/aipi-film-tools](https://github.com/ai-pi-labs/aipi-film-tools)，将 `skills/` 下两个完整文件夹复制到所选宿主的技能目录。运行依赖见[环境准备](prerequisites.md)，拉片与同步提示词见[使用流程](usage.md)。

本文于 2026-09-15 核对官方文档。下列路径与调用方式有文档依据；本项目尚未逐一完成这些客户端的安装、选技和导出实测。

## 选择一个安装位置

相对路径从你要处理视频的项目根目录计算；`~` 表示运行宿主的用户主目录。一个技能只保留一份活跃安装，避免在多个被扫描的目录里放置同名副本。

| 宿主 | 项目目录 | 个人目录 |
| --- | --- | --- |
| Cursor | `.cursor/skills/` 或 `.agents/skills/` | `~/.cursor/skills/` 或 `~/.agents/skills/` |
| VS Code GitHub Copilot | `.github/skills/`、`.claude/skills/` 或 `.agents/skills/` | `~/.copilot/skills/`、`~/.claude/skills/` 或 `~/.agents/skills/` |

以上分别来自 [Cursor 技能目录](https://prod.cursor.com/docs/skills#skill-directories)与 [VS Code 技能位置](https://code.visualstudio.com/docs/agent-customization/agent-skills#create-a-skill)。同时使用两者时，可在项目中选择一份 `.agents/skills/`。

最终结构应为 `所选目录/aipi-film-study/SKILL.md` 和 `所选目录/aipi-sync-video/SKILL.md`。保留各自的 `scripts/`、`ui/`、`references/`（如有）、`tests/` 与许可证；只复制 `SKILL.md` 无法运行本项目脚本。

## 复制命令

先克隆并进入源码目录。已有克隆可直接进入，先保存自己的改动再更新。

```sh
git clone https://github.com/ai-pi-labs/aipi-film-tools.git
cd aipi-film-tools
```

以下命令在该源码目录执行。把目标路径换成自己的项目目录；也可按上表改成个人技能目录。它们遇到已有同名技能会停止，避免把新版嵌套复制到旧目录中。更新时先将旧的完整技能目录备份到宿主扫描范围之外，再复制新版。

macOS / Linux（Bash 或 Zsh）：

```sh
(
  set -eu
  aipi_target="/path/to/video-project/.agents/skills"
  for aipi_skill in aipi-film-study aipi-sync-video; do
    test -f "skills/$aipi_skill/SKILL.md"
    if [ -e "$aipi_target/$aipi_skill" ] || [ -L "$aipi_target/$aipi_skill" ]; then
      printf '%s\n' "已存在：$aipi_target/$aipi_skill，请先备份并移出该目录。" >&2
      exit 1
    fi
  done
  mkdir -p "$aipi_target"
  cp -R skills/aipi-film-study skills/aipi-sync-video "$aipi_target/"
)
```

Windows PowerShell：

```powershell
$aipiTarget = "C:\path\to\video-project\.agents\skills"
$aipiSkills = @("aipi-film-study", "aipi-sync-video")
foreach ($aipiSkill in $aipiSkills) {
    if (-not (Test-Path "skills/$aipiSkill/SKILL.md")) { throw "请在源码仓库根目录运行。" }
    if (Test-Path (Join-Path $aipiTarget $aipiSkill)) { throw "已有同名技能，请先备份并移出技能目录。" }
}
New-Item -ItemType Directory -Force -Path $aipiTarget | Out-Null
foreach ($aipiSkill in $aipiSkills) {
    Copy-Item -Recurse -LiteralPath "skills/$aipiSkill" -Destination $aipiTarget -ErrorAction Stop
}
```

个人安装的目标变量示例：Bash/Zsh 使用 `aipi_target="$HOME/.cursor/skills"`；PowerShell 使用 `$aipiTarget = Join-Path $env:USERPROFILE ".copilot/skills"`。只替换目标变量，复制方法相同。

## 在宿主中调用

**Cursor：** 打开目标项目，在 Agent 对话中输入 `/` 并选择 `aipi-film-study` 或 `aipi-sync-video`。可在 Customize → Skills 查看发现的技能；新增后若未出现，重新打开客户端并检查目录。当前仓库是技能源码，不含 Cursor marketplace 配置，不能把仓库 URL 直接当作“From GitHub Repository”插件导入；采用上面的本地复制方式。[Cursor 加载与调用](https://prod.cursor.com/docs/skills#how-skills-work) · [仓库导入要求](https://prod.cursor.com/docs/skills#installing-skills-from-a-repository)

**VS Code GitHub Copilot：** 打开目标项目和 Chat，输入 `/skills` 查看技能配置，再用 `/aipi-film-study` 或 `/aipi-sync-video` 附带任务。需要执行脚本时使用可运行终端工具的 Agent 模式。[VS Code 技能配置与斜杠调用](https://code.visualstudio.com/docs/agent-customization/agent-skills#use-skills-as-slash-commands)

例如：

```text
/aipi-film-study 拉片「原片完整路径」，结果写入「输出目录」。
保持一镜一行、完整对白、导演分析与复拍建议；未核声音保留待核。
先确认实际加载的技能路径和依赖，再生成报告并运行生产检查。
```

其他支持 Agent Skills 的宿主，按其官方说明选择项目或个人目录，再复制同样两个文件夹。标准规定 `SKILL.md` 与资源结构，扫描路径、工具名称和调用界面由宿主实现，不能据此推定所有应用都支持 `.agents/skills/` 或斜杠调用。宿主还须支持文件读写与命令执行；扩展元数据和工具权限的识别以其实现为准。[Agent Skills 规范](https://agentskills.io/specification)

## 最小验证

让 Agent 报告实际读取的 `SKILL.md` 位置，并在它的命令环境中检查 Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium 和中文字体。随后执行以下命令，占位目录替换为实际安装路径：

```sh
node "<逐镜技能目录>/scripts/engine.mjs" --help
node "<同步技能目录>/scripts/export.mjs" --help
```

帮助正常退出只证明入口可加载。继续按[使用流程](usage.md)处理一段短素材，检查播放、帧图和镜号联动。开发或依赖排查也可在完整源码根目录执行 `npm run demo`：它只生成合成测试素材，用于工具自测，不是公开实片案例。依赖检查通过不等于声音审核已完成。

只想查看已有成果，可从 [Release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest) 下载 `aipi-guiwu-episode01-case.zip` 与 `aipi-guiwu-episode01-case.sha256`，无需完整源码。解压进入 `aipi-guiwu-episode01-case/`，打开 `report.html` 或 `AIπ同步审片-参考版.mp4`。案例复用已测试的《归雾镇》第一集成果，约 3 分 33 秒、93 镜、74 条语言记录、5104 帧；全音轨审核仍未完成，保留参考状态。文件清单与核对范围见[实片案例](case-study.md)。

## 本机、SSH 与云端

技能目录、输入视频、Node.js、FFmpeg、浏览器与字体都必须在实际执行任务的机器上可访问。SSH、容器或云端终端中的路径可能与桌面不同，先确认命令执行位置，再安装和验证。VS Code Remote SSH 的终端命令在远程主机执行，应在该主机准备运行环境。[VS Code Remote SSH](https://code.visualstudio.com/docs/remote/ssh)

Cursor 本地个人技能不会自动进入所有远程会话；其 Cloud Agents 同步功能只同步 `~/.cursor/skills/`，不包含 `~/.agents/skills/`，也不等于把本机视频或依赖一起复制过去。需要远程使用时可采用远程仓库内的项目技能，并单独准备素材与工具。[Cursor 云端技能范围](https://prod.cursor.com/docs/skills#use-personal-skills-with-cloud-agents)

更新后重做入口与短素材检查。卸载本地复制版时，备份定制内容后移除所选位置的两个技能文件夹；项目视频与交付文件另行保留。
