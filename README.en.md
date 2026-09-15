<p align="center">
  <img src="docs/assets/aipi-banner.svg" alt="AIπ · AI圆周派 — Shot by shot. From study to reshoot." width="100%">
</p>

<h1 align="center">AIπ · Film Study &amp; Synchronized Review</h1>

<p align="center"><strong>Shot by shot. From study to reshoot.</strong></p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <a href="https://github.com/ai-pi-labs/aipi-film-tools/releases/latest"><img src="https://img.shields.io/github/v/release/ai-pi-labs/aipi-film-tools?style=flat-square&amp;label=release&amp;color=ca9442" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-MIT-343c47?style=flat-square" alt="Code license: MIT"></a>
</p>

<p align="center">
  <a href="docs/installation.md">Installation</a> ·
  <a href="https://github.com/ai-pi-labs/aipi-film-tools/releases/latest">Latest release</a> ·
  <a href="docs/case-study.en.md">Case study</a> ·
  <a href="docs/usage.md">Usage</a>
</p>

---

Turn a finished film into a shot table with **one shot per row**, full text for each recorded line, director's notes, and practical reshooting suggestions. Read alongside the source video in an interactive workbench, or watch a synchronized review video.

## See it in use

**Guiwu Town (《归雾镇》), Episode 1** · approximately 3m 33s · **93 shots · 74 timed text entries · 186 reference frames**

20-second excerpt from the synchronized review. Press play; use fullscreen to read the analysis.

https://github.com/user-attachments/assets/1bc328aa-76be-46f8-963d-f42e6e55c0a1

Video provided by 饭团鱼子酱（钱叔_）.

<details>
<summary>View the shot-by-shot workbench</summary>

![Guiwu Town, Episode 1 · AIπ shot-by-shot workbench](docs/case-workbench-preview.png)

</details>

Download `aipi-guiwu-episode01-case.zip` from the [latest release](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest). Extract the entire package, enter `aipi-guiwu-episode01-case/`, and open `report.html` or play `AIπ同步审片-参考版.mp4`. The package also includes the source video, `study.json`, a shot CSV, and an SRT file. A separate `aipi-guiwu-episode01-case.sha256` file is provided for download verification.

The report, analysis, and subtitles are in Chinese; the [English case guide](docs/case-study.en.md) explains the files and viewing steps. Dialogue and sung passages still contain items to confirm. Check them against the source video before finalizing a script.

## Two skills, one workflow

| Skill | What it does |
| --- | --- |
| `aipi-film-study` · Shot study | Measures actual frame timestamps, detects candidate cuts, extracts paired reference frames, links dialogue across cuts, and creates the shot table and interactive report |
| `aipi-sync-video` · Synchronized review | Renders shot descriptions, dialogue, director's notes, and reshooting suggestions alongside the source footage, preserving its frame count and original audio |

The workbench follows playback, highlights the current shot, and pauses automatic scrolling when you scroll manually. Search the full text, enlarge reference frames, and read sentences spanning a cut in full in each relevant shot. Visual observations and director's interpretations remain separate.

Cut detection produces a starting point for review. The project does not bundle speech recognition or OCR models: transcription and checking depend on the host's available tools and review work. A `pending` status does not mean there is no dialogue, and verified subtitles do not establish that the entire audio track has been reviewed.

## Install

Choose packages from [Releases](https://github.com/ai-pi-labs/aipi-film-tools/releases/latest), or copy the two complete directories under `skills/` from the source repository.

| Package pair | Intended use |
| --- | --- |
| `aipi-film-study.zip` + `aipi-sync-video.zip` | WorkBuddy import. Each ZIP has `SKILL.md` at its root and includes WorkBuddy-specific metadata |
| `aipi-film-study-claude.zip` + `aipi-sync-video-claude.zip` | Claude upload, or directory-based installation for Codex and other hosts. Each ZIP contains a top-level folder named after the skill and uses standard metadata |

The four ZIPs contain the same two sets of executable code. Install each skill in its own directory; a full repository ZIP is not an individual skill package.

| Host | Installation route | Guide |
| --- | --- | --- |
| Codex desktop local tasks / CLI / IDE | Built-in installer, or user/project `.agents/skills/` | [Codex](docs/codex.md) |
| Claude Code | User `~/.claude/skills/` or project `.claude/skills/` | [Claude Code](docs/claude.md) |
| Claude web / desktop Chat / Cowork | Upload `*-claude.zip`; check dependencies in the actual session environment | [Claude environments](docs/claude.md) |
| WorkBuddy | Import the flat ZIPs in skill management and enable them | [WorkBuddy](docs/workbuddy.md) |
| Cursor / VS Code Copilot | Copy the complete skill folders to the host's skill directory | [Other hosts](docs/other-hosts.md) |

[Installation overview](docs/installation.md) · [Dependencies](docs/prerequisites.md) · [Usage and troubleshooting](docs/usage.md)

Detailed setup guides are currently in Chinese. Your host needs access to the media, a command environment, and permission to save files. Check these in the session that will run the tools; installing a skill does not install video utilities or recognition models. Host-specific setup routes are documented, but have not all been tested end to end in their clients.

## Ask your agent

> Use aipi-film-study to analyze this video, one shot per row. Check dialogue, voiceover, sung passages, and the ending. Add visual observations, director's notes, and reshooting suggestions. Create an interactive report, shot CSV, and SRT. Keep unconfirmed content marked for review.

> Use aipi-sync-video to export a synchronized review from the final study.json and source video. Run production checks first. Use --reference only when I explicitly request a reference export with unresolved items.

## Run locally

Use **Node.js 22+, FFmpeg, and ffprobe**. Synchronized export and browser tests also need **Chrome/Chromium and Chinese fonts**. There are no npm runtime dependencies, so `npm install` is unnecessary. The shot-study core alone supports Node.js 18+; building installation ZIPs requires Python 3.

<details>
<summary>Commands for your own video</summary>

Run these from the repository root. If using an installed skill, replace `skills/...` with its actual installation path.

```sh
node skills/aipi-film-study/scripts/engine.mjs probe input.mp4
node skills/aipi-film-study/scripts/engine.mjs detect input.mp4 --out work/study.json
node skills/aipi-film-study/scripts/engine.mjs frames work/study.json --video input.mp4 --out work/frames
```

Read the data file returned by the frame command. Complete and review its visual observations, language records, and director's notes before proceeding. The commands below assume the resulting file is `work/study.frames.json`.

```sh
node skills/aipi-film-study/scripts/engine.mjs validate work/study.frames.json --production
node skills/aipi-film-study/scripts/report.mjs work/study.frames.json --out work/report.html
node skills/aipi-film-study/scripts/engine.mjs table work/study.frames.json --out work/shots.csv
node skills/aipi-film-study/scripts/engine.mjs subtitles work/study.frames.json --out work/dialogue.srt
node skills/aipi-sync-video/scripts/export.mjs work/study.frames.json --video input.mp4 --out work/review.mp4
```

Resolve any issues reported by production checks. To intentionally export an unfinished reference version, add `--reference` to the export command; its panels retain the reference label.

[Data format](skills/aipi-film-study/references/study-format.md) · [Language review and director's notes](skills/aipi-film-study/references/review-method.md)

</details>

<details>
<summary>Optional developer self-test</summary>

```sh
npm run demo
```

Open `examples/demo/report.html`. This command generates a three-shot synthetic clip with FFmpeg solely for tool testing. The public film example is the Guiwu Town package above.

[Development and testing](docs/development.md)

</details>

## Runtime boundaries

- The study engine preserves measured presentation timestamps and supports variable frame rates and frame extraction from nonzero starts. Sources whose audio begins before the first video frame are currently rejected.
- Web playback requires a zero start time. Synchronized export currently also requires a measured, constant frame rate. Changing playback speed requires new timing data.
- Review videos follow the source timing; pause short shots to read. Text overflow stops the export with an error so you can enlarge the panel; text is not silently truncated.
- Compatible audio tracks are copied; others may be transcoded. Track start times, durations, and audio parameters are checked. Preserving audio does not establish transcription completeness.
- Full local regression testing uses macOS. Linux CI covers core commands and packaging; Windows and other host environments need their own checks.

## License

Copyright © 2026 **AIπ（AI圆周派）**. Application code, UI, and workflow documentation are available under the [MIT License](LICENSE). External tools and media retain their own rights; see [Third-party notices](THIRD_PARTY_NOTICES.md).
