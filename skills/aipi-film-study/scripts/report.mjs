#!/usr/bin/env node
// AIπ｜AI圆周派 — independent, offline film-study workbench renderer.
import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ui = name => readFileSync(new URL(`../ui/${name}`, import.meta.url), 'utf8');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const timecode = value => { const n = Math.max(0, Number(value) || 0); return `${String(Math.floor(n / 60)).padStart(2,'0')}:${(n % 60).toFixed(2).padStart(5,'0')}`; };
export const overlapping = (shot, cues, source = {}, last = false) => {
  const displayEnd = last ? Math.max(Number(shot.end),Number(source.duration)||0) : Number(shot.end);
  return cues.filter(c => Math.min(displayEnd,Number(c.end)) - Math.max(Number(shot.start),Number(c.start)) > .000001);
};
const fieldNames = { intention:'人物意图', emotion:'情绪变化', blocking:'调度与空间', edit:'剪辑判断', reshoot:'复拍建议' };
const cueType = cue => ({ voiceover:'画外音', singing:'唱腔', 'subtitle-meaning':'原字幕大意 · 非逐字唱词' }[cue.type] || '对白');
const sourceLabel = cue => cue.source === 'subtitle' ? (cue.status === 'verified' ? '字幕已核' : '字幕待核') : cue.source === 'audio' ? (cue.status === 'verified' ? '听写已核' : '声音待核') : cue.source === 'subtitle+audio' ? (cue.status === 'verified' ? '字幕与声音已核' : '字幕与声音待核') : '来源未标';
const noteDisclosure = (label, content, cls = '') => content ? `<details class="note-disclosure ${cls}"><summary>${escape(label)}</summary><div>${escape(content)}</div></details>` : '';
function cueMarkup(cue, shot, compact = false) {
  const continued = shot && Number(cue.start) < Number(shot.start) - .000001;
  return `<div class="cue-entry" data-cue="${escape(cue.id)}"><div class="cue-byline"><b>${escape(cue.speaker || '未标说话人')}</b>${continued ? '<span class="continuation">跨镜延续</span>' : ''}<span class="cue-source${cue.status !== 'verified' ? ' needs-review' : ''}">${escape(sourceLabel(cue))}</span></div>${cue.type && cue.type !== 'dialogue' ? `<div class="cue-kind">${escape(cueType(cue))}</div>` : ''}<p class="cue-words">${escape(cue.text)}</p>${compact ? '' : noteDisclosure('核对依据', [cue.rawSubtitle && cue.rawSubtitle !== cue.text ? `原字幕：${cue.rawSubtitle}` : '', cue.notes].filter(Boolean).join('\n'))}</div>`;
}
function directorMarkup(shot, keys = Object.keys(fieldNames)) {
  return `<dl class="director-fields">${keys.map(key => `<div${key === 'reshoot' ? ' class="reshoot-field"' : ''}><dt>${fieldNames[key]}</dt><dd>${escape(shot.director?.[key] || '未填写')}</dd></div>`).join('')}</dl>`;
}
function soundMarkup(shot) {
  const state = shot.sound?.status;
  const label = state === 'pending' || !state ? '声音待核' : state === 'non-speech' || state === 'none' ? '已核对 · 非语言声音' : state === 'reviewed' ? '声音已核' : `声音：${state}`;
  return noteDisclosure(label, shot.sound?.note || '未提供声音核对记录，不能据此认定没有对白。', 'sound-note');
}
function inspectInput(study) {
  if (study.schema !== 'aipi.film-study/v1') throw new Error('需要 aipi.film-study/v1 数据。');
  if (Math.abs(Number(study.source?.timeOrigin)||0) > .000001) throw new Error('报告播放器暂不支持非零起始 PTS 原片；请先规范素材时间轴并重新生成时间数据。');
  if (!study.shots?.length) throw new Error('没有可展示的镜头。');
  const ids = new Set();
  for (const s of study.shots) {
    if (!s.id || ids.has(s.id) || !Number.isFinite(s.start) || !Number.isFinite(s.end) || !(s.end > s.start)) throw new Error(`镜头标识或时间无效：${s.id}`);
    ids.add(s.id);
  }
}

export function renderReport(study, options = {}) {
  inspectInput(study);
  const asset = options.assetURL || (value => String(value ?? ''));
  const shots = study.shots, cues = study.dialogue || [], source = study.source || {};
  const duration = Number(source.duration) || shots.at(-1).end;
  const audioComplete = study.review?.audio?.state === 'complete';
  const hasVerifiedSubtitles = cues.some(c => c.source?.includes('subtitle') && c.status === 'verified');
  const reviewLabel = audioComplete ? '声音审核完成' : hasVerifiedSubtitles ? '字幕已核 · 声音待核' : '声音待核';
  const rows = shots.map((s,index) => {
    const inShot = overlapping(s,cues,source,index===shots.length-1);
    const frame = kind => s.frames?.[kind] ? `<button class="frame-button" data-frame-url="${escape(asset(s.frames[kind]))}" data-frame-label="${escape(`${s.id} ${kind === 'in' ? '入镜' : '出镜'}关键帧`)}" aria-label="放大 ${escape(s.id)} ${kind === 'in' ? '入镜' : '出镜'}关键帧"><img src="${escape(asset(s.frames[kind]))}" alt="${escape(s.id)} ${kind === 'in' ? '入镜' : '出镜'}关键帧" loading="lazy"><span>${kind === 'in' ? 'IN' : 'OUT'}</span></button>` : '<div class="frame-unavailable">关键帧待补</div>';
    return `<tr id="shot-${escape(s.id)}" data-shot-id="${escape(s.id)}" data-index="${index}"><td class="shot-meta" data-label="镜头"><button class="shot-jump" data-jump="${escape(s.id)}" aria-label="跳转 ${escape(s.id)}"><span class="playing-indicator" aria-hidden="true"></span>${escape(s.id)}</button><span class="time-pair">${timecode(s.start)}<br>${timecode(s.end)}</span><span class="duration-pill">${(s.end-s.start).toFixed(2)}s</span><span class="shot-tags">${escape(s.size || '景别待标')}<br>${escape(s.camera || '运镜待标')}</span></td><td class="shot-frames" data-label="关键帧"><div class="frame-pair">${frame('in')}${frame('out')}</div></td><td class="shot-description" data-label="画面"><p>${escape(s.description || '画面观察待补充。')}</p><div class="subjects">${escape((s.subjects || []).join(' / '))}</div>${noteDisclosure('画面证据', (s.evidence || []).join('\n'))}</td><td class="shot-dialogue" data-label="完整对白">${inShot.length ? inShot.map(c => cueMarkup(c,s,true)).join('') : '<p class="empty-language">未记录语言条目</p>'}${noteDisclosure('本镜核对依据', inShot.map(c=>[c.id,c.speaker,c.notes].filter(Boolean).join(' · ')).join('\n'))}${soundMarkup(s)}${s.onScreenText ? noteDisclosure('画面文字', s.onScreenText) : ''}</td><td class="shot-direction" data-label="导演分析与复拍">${directorMarkup(s,['intention','reshoot'])}<details class="director-expanded"><summary>展开情绪、调度与剪辑分析</summary>${directorMarkup(s,['emotion','blocking','edit'])}</details><button class="text-action" data-director="${escape(s.id)}">在右侧详读 <span aria-hidden="true">↗</span></button></td></tr>`;
  }).join('');
  const chapterRects = shots.map((s,i) => `<rect x="${s.start}" y="7" width="${s.end-s.start}" height="14" data-cut="${escape(s.id)}" class="cut-segment tone-${i%3}"/>`).join('');
  const data = JSON.stringify(study).replace(/</g,'\\u003c');
  const opts = JSON.stringify({ video:options.videoName ?? asset(source.file), duration }).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${escape(study.title)} · AIπ 逐镜工作台</title><style>${ui('workbench.css')}</style></head><body>
<a class="skip-link" href="#shot-table-scroll">跳到逐镜表</a><div class="workbench" id="workbench">
<header class="app-bar"><a class="brand" href="#" aria-label="AIπ AI圆周派"><b>AIπ</b><span>AI圆周派</span></a><div class="project-name"><h1>${escape(study.title || '未命名影片')}</h1><span>逐镜工作台 <i>／</i> ${shots.length} 镜 <i>／</i> ${timecode(duration)}</span></div><div class="app-actions"><button class="review-status" id="review-open"><span class="status-dot" aria-hidden="true"></span>${reviewLabel}</button><button class="icon-button" id="help-open" aria-label="键盘快捷键与使用帮助">?</button></div></header>
<main class="editing-space"><section class="monitor-area" id="monitor-area" aria-label="原片与当前镜头"><div class="source-monitor"><div class="monitor-label"><span>原片监看</span><span class="source-spec">${source.width || '—'} × ${source.height || '—'} <i>·</i> ${source.fps || '—'} fps</span><button class="text-action" id="inspector-toggle" aria-expanded="true" aria-controls="inspector">收起详读</button></div><div class="video-stage"><video id="source-video" src="${escape(options.videoName ?? asset(source.file))}" controls preload="metadata" playsinline aria-label="${escape(study.title)}原视频"></video><div id="video-message" class="video-message" role="status" hidden></div></div><div class="transport"><div class="transport-buttons"><button id="previous-shot" class="icon-button" aria-label="上一镜" title="上一镜 [">${icon('previous')}</button><button id="toggle-play" class="play-button" aria-label="播放" title="播放 / 暂停 空格">${icon('play')}</button><button id="next-shot" class="icon-button" aria-label="下一镜" title="下一镜 ]">${icon('next')}</button></div><output class="transport-clock" id="clock">00:00.00 <span>/ ${timecode(duration)}</span></output><label class="speed-label"><span class="sr-only">播放速度</span><select id="speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button id="mute" class="icon-button" aria-label="静音" aria-pressed="false">${icon('volume')}</button><button id="fullscreen" class="icon-button" aria-label="全屏原片">${icon('fullscreen')}</button></div><div class="seek-track"><label class="sr-only" for="seek">播放位置</label><input id="seek" type="range" min="0" max="${duration}" step="0.001" value="0"><svg viewBox="0 0 ${duration} 28" preserveAspectRatio="none" aria-hidden="true">${chapterRects}<line id="playhead" x1="0" x2="0" y1="2" y2="27"/></svg></div></div>
<aside class="inspector" id="inspector" aria-label="当前镜头详读"><div class="inspector-heading"><div><span class="eyebrow">当前镜头</span><strong id="active-shot">${escape(shots[0].id)}</strong><span id="active-shot-meta"></span></div><button class="icon-button" id="inspector-close" aria-label="收起详读">${icon('close')}</button></div><div class="inspector-tabs" role="tablist" aria-label="详读内容"><button id="tab-dialogue" role="tab" aria-selected="true" aria-controls="dialogue-panel">对白 <span>全文</span></button><button id="tab-director" role="tab" aria-selected="false" aria-controls="director-panel">导演分析 <span>含复拍</span></button></div><div class="inspector-body" id="dialogue-panel" role="tabpanel" aria-labelledby="tab-dialogue" tabindex="0"><div class="live-cue"><div class="eyebrow">正在发生</div><div id="live-dialogue"></div></div><div class="panel-subhead"><h2>本镜完整对白</h2><span id="shot-cue-count"></span></div><div id="shot-cues"></div><div id="shot-sound"></div></div><div class="inspector-body" id="director-panel" role="tabpanel" aria-labelledby="tab-director" tabindex="0" hidden><p class="interpretation-label">导演解读与复拍建议 · 与原片观察分开</p><div id="director-content"></div></div></aside></section>
<section class="shot-library" aria-labelledby="library-title"><div class="library-toolbar"><div class="library-title"><h2 id="library-title">逐镜表</h2><span id="result-count">${shots.length} 镜</span></div><div class="library-controls"><button id="follow" class="follow-button" aria-pressed="true">${icon('follow')}<span>跟随播放</span><small>开启</small></button><button id="locate-current" class="quiet-button">定位当前镜</button><label class="search-field"><span class="sr-only">搜索镜号、对白、画面、导演建议</span>${icon('search')}<input id="search-shots" type="search" placeholder="镜号、对白、画面、导演建议" autocomplete="off"><kbd>/</kbd></label><button id="transcript-open" class="quiet-button">逐句文本</button></div></div><div class="table-scroll" id="shot-table-scroll" tabindex="0" aria-label="完整逐镜表，可滚动"><table class="shot-table"><colgroup><col class="col-shot"><col class="col-frame"><col class="col-scene"><col class="col-dialogue"><col></colgroup><thead><tr><th scope="col">镜号 / 时间</th><th scope="col">关键帧 <span>IN / OUT</span></th><th scope="col">画面观察</th><th scope="col">完整对白 / 声音</th><th scope="col">导演分析 / 复拍建议</th></tr></thead><tbody id="shot-rows">${rows}</tbody></table><div class="no-results" id="no-results" hidden><h3>没有匹配的镜头</h3><p>尝试镜号、人物名或一句台词。</p><button id="clear-search">清空搜索</button></div></div><div class="library-footer"><span id="follow-description">播放换镜时自动定位；手动滚动可暂停跟随。</span><span>AIπ · 一镜一行 · 原片时间轴</span></div></section></main></div>
<dialog class="workspace-dialog" id="review-dialog"><header><h2>审核范围</h2><button class="icon-button" data-close aria-label="关闭审核范围">${icon('close')}</button></header><div class="dialog-body"><p class="review-summary">${escape(reviewLabel)}。字幕核对与完整音轨审核分开记录。</p><h3>尚待解决</h3><ul>${(study.review?.audio?.openIssues || []).map(x=>`<li>${escape(x)}</li>`).join('') || '<li>没有列出未解决项；以原始审核记录为准。</li>'}</ul><h3>声音核对记录</h3><p>${escape(study.review?.audio?.notes || '未提供整体核对说明。')}</p>${(study.review?.audio?.coverage || []).map(c=>noteDisclosure(`${timecode(c.start)}—${timecode(c.end)} · ${c.method || '核对记录'}`,c.notes)).join('')}<h3>画面复核</h3><p>${escape(study.review?.visual?.notes || '未提供复核范围。')}</p></div></dialog>
<dialog class="workspace-dialog transcript-dialog" id="transcript-dialog"><header><h2>逐句文本 <small>${cues.length} 条</small></h2><button class="icon-button" data-close aria-label="关闭逐句文本">${icon('close')}</button></header><div class="dialog-body"><p class="muted">跨镜对白在此只列一次；逐镜表按实际覆盖镜头完整显示。</p>${cues.map(c=>`<section class="transcript-event"><button class="cue-time-jump" data-cue-time="${Number(c.start)}">${timecode(c.start)} — ${timecode(c.end)}</button>${cueMarkup(c)}</section>`).join('')}</div></dialog>
<dialog class="workspace-dialog" id="help-dialog"><header><h2>工作台快捷键</h2><button class="icon-button" data-close aria-label="关闭快捷键">${icon('close')}</button></header><div class="dialog-body"><dl class="shortcut-list"><div><dt><kbd>空格</kbd></dt><dd>播放 / 暂停</dd></div><div><dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>上一镜 / 下一镜</dd></div><div><dt><kbd>F</kbd></dt><dd>开启或暂停跟随</dd></div><div><dt><kbd>G</kbd></dt><dd>定位当前镜头</dd></div><div><dt><kbd>/</kbd></dt><dd>搜索全文</dd></div><div><dt><kbd>D</kbd></dt><dd>打开当前镜导演分析与复拍建议</dd></div></dl><p>点击镜号跳转原片，点击关键帧放大。手动滚动逐镜表后可自由阅读；“定位当前镜”不会清空搜索。</p></div></dialog>
<dialog class="frame-dialog" id="frame-dialog"><header><h2 id="frame-title">关键帧</h2><button class="icon-button" data-close aria-label="关闭关键帧">${icon('close')}</button></header><img id="enlarged-frame" alt=""></dialog><div class="notification" id="notification" role="status" hidden></div>
<script id="study-data" type="application/json">${data}</script><script id="view-options" type="application/json">${opts}</script><script>${ui('workbench.js')}</script></body></html>`;
}

function icon(name) {
  const paths = { play:'<path d="m8 5 10 7-10 7Z"/>', previous:'<path d="M6 5v14m12-14L8 12l10 7Z"/>', next:'<path d="M18 5v14M6 5l10 7-10 7Z"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', follow:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="3"/>', search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>', fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>', volume:'<path d="m11 4-6 5H2v6h3l6 5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
}

export function main(args = process.argv.slice(2)) {
  const input = args[0];
  const value = flag => { const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; };
  const output = value('--out');
  if (!input || !output) throw new Error('用法：node scripts/report.mjs study.json --out report.html [--video-name 原片.mp4]');
  const study = JSON.parse(readFileSync(input,'utf8'));
  const from = dirname(resolve(input)), to = dirname(resolve(output));
  const assets = [study.source?.file, ...study.shots.flatMap(s => Object.values(s.frames || {}))].filter(Boolean);
  for (const file of assets) if (!existsSync(resolve(from,file))) throw new Error(`资源不存在：${resolve(from,file)}`);
  const videoName = value('--video-name');
  if (videoName && !existsSync(resolve(to,videoName))) throw new Error(`指定视频不存在：${resolve(to,videoName)}`);
  const assetURL = file => relative(to,resolve(from,file)).split(sep).map(encodeURIComponent).join('/');
  const html = renderReport(study, { assetURL, ...(videoName ? { videoName:videoName.split('/').map(encodeURIComponent).join('/') } : {}) });
  mkdirSync(to,{recursive:true}); writeFileSync(output,html);
  return { output:resolve(output), shots:study.shots.length, dialogue:study.dialogue?.length || 0 };
}
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main())); } catch (error) { console.error(error.message); process.exitCode=1; }
}
