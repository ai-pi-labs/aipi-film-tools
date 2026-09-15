# 安装与依赖

## WorkBuddy

从仓库 Releases 下载两个独立 ZIP，通过“技能 → 添加技能 → 上传技能”导入，在已安装列表启用。每个包的根目录都是 SKILL.md，无需添加外层目录。

具体安装目录以 WorkBuddy 实际管理的位置为准。执行命令时从加载的 SKILL.md 位置定位 scripts，不套用其他应用的隐藏配置路径。[WorkBuddy 技能市场说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market) · [技能开发文档](https://open.workbuddy.cn/docs/skill)

项目已验证 ZIP 结构及解压后运行，未声称已在 WorkBuddy 客户端完成导入验收。首次运行建议先使用仓库的合成演示。

## 运行工具

| 用途 | 工具 |
| --- | --- |
| 拉片核心 | Node.js 18+、FFmpeg、ffprobe |
| 同步导出 | Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium |
| 完整开发与网页回归 | Node.js 22+、FFmpeg、ffprobe、Chrome/Chromium |
| 制作安装 ZIP | Python 3 标准库 |

先在宿主实际执行环境中运行 `node --version`、`ffmpeg -version`、`ffprobe -version`。同步工具支持 `--chrome` 指定浏览器可执行文件，也支持 `AIPI_CHROME` 环境变量。准备可显示中文的字体，例如系统中文字体或 Noto Sans CJK。

浏览器使用独立临时配置渲染静态面板，不接管日常浏览窗口。技能不包含语音识别、字幕识别或在线服务凭据；这些能力按宿主已有能力配置。原片、报告与中间文件保存在调用者选定的工作目录。

## 发布包与源码

下载安装 ZIP 即可导入技能。要修改代码，克隆或下载完整仓库，编辑 `skills/` 内文件，再执行 `npm run package` 生成新的 ZIP。不要把测试运行生成的浏览器配置、用户影片或本地环境文件加入发布包。
