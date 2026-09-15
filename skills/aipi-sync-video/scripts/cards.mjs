import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openCanvas} from './browser.mjs';
import {BRAND,cuesFor,fileDigest,digest} from './model.mjs';

const style=readFileSync(fileURLToPath(new URL('../ui/card.css',import.meta.url)),'utf8');
export const loadedStyleDigest=digest(style);
const safe=text=>String(text??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const clock=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toFixed(2).padStart(5,'0')}`;
const mediaType=file=>({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[extname(file).toLowerCase()] || 'application/octet-stream');
export function chromeBinary(hint) {
  const choices=[hint,process.env.AIPI_CHROME,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/usr/bin/chromium','/usr/bin/google-chrome'];
  const found=choices.find(value=>value&&existsSync(value));
  if(!found) throw new Error('未找到独立无头 Chrome/Chromium；请用 --chrome 指定可执行文件');
  return found;
}

export function cardDocument(study, shot, layout, {reference=false,studyDirectory='.'}={}) {
  const expected=[];
  const text=(id,value,className='copy',tag='p')=>{const content=String(value??'');expected.push({id,text:content});return `<${tag} class="${className}" data-aipi-text="${safe(id)}">${safe(content)}</${tag}>`;};
  const cues=cuesFor(study,shot);
  const cueType={'dialogue':'对白','voiceover':'画外音','singing':'唱腔','subtitle-meaning':'字幕大意'};
  const sourceType={'subtitle':'原字幕','audio':'音频听写','subtitle+audio':'字幕与音频核对'};
  const notes=new Map();for(const cue of cues)if(cue.notes){const ids=notes.get(cue.notes)||[];ids.push(cue.id);notes.set(cue.notes,ids);}
  const dialogue=cues.length?cues.map(cue=>{
    const continued=cue.start<shot.start-0.000001?'续句 · ':'';
    const pending=cue.status==='verified'?'':'待核 · ';
    return `<div class="cue">${text(cue.id,`${continued}${pending}${cue.speaker?cue.speaker+'：':''}${cue.text}`,`copy ${pending?'pending':''}`)}${text(cue.id+'-basis',`${cueType[cue.type]??cue.type} · ${sourceType[cue.source]??cue.source}`,'cue-meta','span')}${cue.rawSubtitle&&cue.rawSubtitle!==cue.text?text(cue.id+'-raw','原字幕：'+cue.rawSubtitle,'cue-meta','span'):''}</div>`;
  }).join(''):text('no-dialogue',shot.sound?.status==='non-speech'?'本镜已核对：无语言事件。':'暂无已确认语言条目；不能据此推定没有对白。','copy empty');
  const labels={intention:'人物意图 · 解读',emotion:'情绪变化 · 解读',blocking:'视线与空间',edit:'切镜理由 · 解读',reshoot:'复拍建议'};
  const director=Object.entries(labels).map(([key,label])=>`<div class="direction"><strong>${label}</strong>${text('director-'+key,shot.director?.[key]||'尚未完成分析。')}</div>`).join('');
  let photo='';
  if(shot.frames?.in) {const file=resolve(studyDirectory,shot.frames.in);photo=`<img class="image" src="data:${mediaType(file)};base64,${readFileSync(file).toString('base64')}" alt="当前镜头起始画面">`;}
  const state=shot.sound?.status==='pending'?'声音待核':'声音核对记录';
  const body=`<div class="masthead">${text('brand',BRAND,'brand','span')}${text('edition',reference?'参考版 · 含待核项 · 未通过生产验收':'声音与镜头记录已通过导出检查','status','span')}</div>
<div class="heading">${text('shot-id',shot.id,'shot-id','span')}${text('title',study.title,'title','h1')}<span class="time">${clock(shot.start)}—${clock(shot.end)} · ${shot.endFrame-shot.startFrame}帧</span></div>
<div class="columns"><section class="column"><h2>画面观察</h2>${text('facts',[shot.size,shot.camera,shot.transition].filter(Boolean).join(' · '),'facts')}${photo}${text('description',shot.description||'尚未完成画面观察。')}${(shot.evidence??[]).map((value,index)=>text('evidence-'+index,'画面依据：'+value,'sound-note')).join('')}</section>
<section class="column"><h2>对白与声音</h2>${dialogue}${[...notes].map(([note,ids],index)=>text('cue-notes-'+index,ids.join('、')+'：'+note,'sound-note')).join('')}${text('sound-note',`${state}：${shot.sound?.note||'未附核对说明。'}`,'sound-note')}</section>
<section class="column"><h2>导演分析与复拍</h2>${director}</section></div>`;
  const auditScript=`addEventListener('load',()=>{
const width=innerWidth,height=innerHeight;const issues=[];const items=[...document.querySelectorAll('[data-aipi-text]')].map(node=>{
const r=node.getBoundingClientRect(),owner=node.closest('.column')?.getBoundingClientRect();const cs=getComputedStyle(node);
if(r.left<0||r.top<0||r.right>width+.5||r.bottom>height+.5||owner&&r.bottom>owner.bottom+.5||node.scrollWidth>node.clientWidth+1||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)issues.push(node.dataset.aipiText+'：正文越界或不可见');
return {id:node.dataset.aipiText,text:node.textContent,bounds:{x:r.x,y:r.y,width:r.width,height:r.height}};});
for(const img of document.images)if(!img.complete||img.naturalWidth===0)issues.push('关键帧没有加载');
document.querySelector('#audit').textContent=JSON.stringify({width,height,items,issues});
});`;
  return {html:`<!doctype html><html lang="zh"><meta charset="utf-8"><title>${safe(BRAND)} ${safe(shot.id)}</title><style>${style}</style><body style="--width:${layout.panel.width}px;--height:${layout.panel.height}px;--font:${layout.font}px">${body}<script id="audit" type="application/json"></script><script>${auditScript}</script></body></html>`,expected};
}

export function checkCardAudit(audit, expected, layout) {
  if(!audit || audit.width!==layout.panel.width || audit.height!==layout.panel.height) throw new Error('浏览器面板视窗 '+audit?.width+'×'+audit?.height+' 与期望 '+layout.panel.width+'×'+layout.panel.height+' 不符');
  const issues=[...(audit.issues??[])];
  for(const item of expected) if(!audit.items?.some(actual=>actual.id===item.id&&actual.text===item.text)) issues.push(item.id+'：完整原文未实际显示');
  if(issues.length) throw new Error('信息卡无法完整容纳正文，请增大 --panel-px 或调整布局，不得删减文字：\n'+issues.join('\n'));
  return audit;
}

export async function renderCard(study, shot, layout, options) {
  const folder=join(options.work,'cards');mkdirSync(folder,{recursive:true});
  const stem=String(study.shots.indexOf(shot)+1).padStart(5,'0');
  const page=join(folder,stem+'.html'),png=join(folder,stem+'.png');
  const built=cardDocument(study,shot,layout,options);writeFileSync(page,built.html);
  const browser=options.browser || await openCanvas(options.chrome,options.work);
  let capture;try{capture=await browser.capture(page,layout.panel.width,layout.panel.height);}finally{if(!options.browser)await browser.close();}
  writeFileSync(png,capture.png);writeFileSync(join(folder,stem+'.audit.json'),JSON.stringify(capture.audit,null,2));
  const audit=checkCardAudit(capture.audit,built.expected,layout);
  const bytes=capture.png;
  if(bytes.readUInt32BE(16)!==layout.panel.width||bytes.readUInt32BE(20)!==layout.panel.height) throw new Error('面板截图尺寸与测量不符');
  return {id:shot.id,startFrame:shot.startFrame,endFrame:shot.endFrame,file:png,sha256:fileDigest(png),audit};
}
