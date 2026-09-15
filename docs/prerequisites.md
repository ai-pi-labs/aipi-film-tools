# 运行环境与依赖

安装 Skill 只安装说明和脚本。请在宿主实际执行命令的环境中准备下列工具；桌面应用、系统终端、WSL 和云端容器可能使用不同的 PATH。

| 功能 | 必需工具 |
| --- | --- |
| 拉片测量、抽帧、CSV / SRT / HTML | Node.js 18+、FFmpeg、ffprobe |
| 同步视频、完整案例与浏览器回归 | Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium、中文字体 |
| 从源码制作 ZIP | Python 3 标准库 |

新安装统一使用 **Node.js 22 或更高版本**。本项目无 npm 运行依赖，不需要 `npm install`；Git 只用于克隆/更新源码，已有源码 ZIP 时可以不用 Git。

## 安装来源

1. 从 [Node.js 官方下载页](https://nodejs.org/en/download)选择操作系统对应的 22+ 版本并安装。
2. 从 [FFmpeg 官方下载页](https://ffmpeg.org/download.html)选择系统发行包，确保同时带有 `ffmpeg` 和 `ffprobe`。Windows 解压安装时，把两者所在的 `bin` 文件夹加入用户 PATH；macOS/Linux 可使用该页面列出的系统包管理路线。
3. 安装 Chrome 或 Chromium，并准备系统中文字体。Linux 环境可使用发行版提供的 Noto Sans CJK 字体包。无头浏览器只渲染本项目生成的静态信息卡。
4. 安装后重启宿主应用或它的命令会话，让 PATH 更新生效。

在宿主内验证，而不仅在外部终端验证：

```sh
node --version
ffmpeg -version
ffprobe -version
```

FFmpeg 需要可用的 H.264 编码器 `libx264` 和 AAC 编码器；示例使用它们生成通用 MP4：

```sh
ffmpeg -hide_banner -encoders
```

在输出中查找 `libx264`、`aac`。缺失时更换包含这些编码器的 FFmpeg 发行包。

## 指定浏览器

自动发现失败时，使用 `--chrome` 指定**实际可执行文件**，不是应用图标或应用文件夹：

```sh
# macOS 示例
node skills/aipi-sync-video/scripts/export.mjs study.json --video input.mp4 --out review.mp4 \
  --chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

常见位置仅用于定位，先确认文件确实存在：

| 环境 | 示例 |
| --- | --- |
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Linux | `/usr/bin/google-chrome` 或 `/usr/bin/chromium` |
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |

也可设置进程环境变量 `AIPI_CHROME`：

```sh
export AIPI_CHROME="/实际浏览器可执行文件路径"
```

```powershell
$env:AIPI_CHROME = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
```

上述赋值只作用于当前 shell 及它启动的进程。若代理已在另一个进程中运行，优先在导出命令中传 `--chrome`，或在它自己的执行环境内设置变量。

## 云端、远程与声音能力

云端或沙箱中的 Node/FFmpeg/Chrome 需要在那里单独检查；本机已经安装不代表会话可调用。网络、进程启动或浏览器受限时，可先在本地生成案例/参考帧，交给代理读取并补充分析，再在具备依赖的本地环境导出。

此包不内置 ASR、OCR、音频理解模型或服务密钥。宿主没有音频识别/听辨能力时，需要用户提供有时间戳的转写并完成核对，或者接入用户选定的服务。可播放的影片不等于代理已听完整条音轨。未确认项保留 `pending` / `uncertain`，不能宣称生产通过。

[安装总览](installation.md) · [运行流程](usage.md)
