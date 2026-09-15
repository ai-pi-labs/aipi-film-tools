#!/usr/bin/env node
// New AIπ workbench integration checks. Uses only an isolated Chrome instance.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { overlapping, renderReport, main as renderCLI } from '../scripts/report.mjs';

const args=process.argv.slice(2), arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const chrome=arg('--chrome')||process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome was not found. Set CHROME_PATH or pass --chrome /path/to/chrome.');
const scratch=mkdtempSync(join(tmpdir(),'aipi-workbench-'));
const artifacts=resolve(arg('--artifacts')||join(scratch,'artifacts'));mkdirSync(artifacts,{recursive:true});
const findings=[];
let browser, socket, session;
const waiting=new Map();let serial=0;
const request=(method,params={},page=true)=>new Promise((resolve,reject)=>{const id=++serial;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(page?{sessionId:session}:{})}));});
async function evaluate(expression){const r=await request('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function boot(){
  browser=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${join(scratch,'profile')}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const endpoint=await new Promise((resolve,reject)=>{let buffer='';const timeout=setTimeout(()=>reject(Error('Chrome startup timed out')),20000);browser.stderr.on('data',chunk=>{buffer+=chunk;const hit=buffer.match(/DevTools listening on (ws:\/\/\S+)/);if(hit){clearTimeout(timeout);resolve(hit[1]);}});browser.on('error',reject);});
  socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&waiting.has(message.id)){const item=waiting.get(message.id);waiting.delete(message.id);if(message.error)item.reject(Error(JSON.stringify(message.error)));else item.resolve(message.result);}});
  const target=await request('Target.createTarget',{url:'about:blank'},false);session=(await request('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId;
}
async function load(file,width,height){
  await request('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await request('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await request('Page.navigate',{url:pathToFileURL(file).href});
  await evaluate(`new Promise((resolve,reject)=>{let tries=0;const ready=()=>{if(document.readyState==='complete'&&document.getElementById('reading-layout'))return requestAnimationFrame(()=>requestAnimationFrame(resolve));if(++tries>150)return reject(Error('Workbench did not initialize'));setTimeout(ready,30);};ready();})`);
}
async function screenshot(name){const r=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(artifacts,name+'.png'),Buffer.from(r.data,'base64'));}
function fixture(video){
  const long='长中文完整交付内容，用于检查滚动、换行和最后一句是否仍可读取。'.repeat(32)+' 全文结束标记';
  return {schema:'aipi.film-study/v1',title:'AIπ 工作台独立回归',source:{file:video,duration:2.2,videoDuration:2,width:320,height:180,fps:24,frameCount:48,timing:'cfr',timeOrigin:0,hasAudio:true},review:{audio:{state:'partial',openIssues:['音轨审核尚未完成']},visual:{state:'reviewed'}},shots:[
    {id:'A01',start:0,end:1/24,startFrame:0,endFrame:1,description:'单帧镜头',sound:{status:'pending',note:'未完成核对'},director:{intention:'动作意图',emotion:'变化',blocking:'空间',edit:'切点',reshoot:'复拍起点'}},
    {id:'A02',start:1/24,end:1,startFrame:1,endFrame:24,description:'正文 <script>不可执行</script> '+long,sound:{status:'pending',note:'识别空档不代表无对白'},director:{intention:long,emotion:long,blocking:long,edit:long,reshoot:long}},
    {id:'A03',start:1,end:2,startFrame:24,endFrame:48,description:'第三镜',sound:{status:'pending',note:'待核'},director:{intention:'收束',emotion:'结尾',blocking:'空间',edit:'切点',reshoot:'复拍最后一镜'}}
  ],dialogue:[{id:'C01',start:0,end:.2,speaker:'人物甲',text:'跨切点台词 <em>必须保留字面</em>',type:'dialogue',source:'subtitle',status:'verified',notes:'来自字幕'}, {id:'C02',start:.2,end:.8,speaker:'人物乙',text:long,type:'dialogue',source:'audio',status:'uncertain'}, {id:'C03',start:.8,end:1.2,speaker:'唱腔',text:'原字幕大意完整保留',type:'subtitle-meaning',source:'subtitle',status:'verified'}, {id:'C04',start:2,end:2.15,speaker:'画外人声',text:'片尾声音完整保留',type:'voiceover',source:'audio',status:'verified'}]};
}
async function syntheticChecks(file,width,height){
  await load(file,width,height);
  const result=await evaluate(`(()=>{const $=id=>document.getElementById(id);const rows=[...document.querySelectorAll('tr[data-shot-id]')];const metrics={viewport:[innerWidth,innerHeight],rows:rows.length,overflow:document.documentElement.scrollWidth>innerWidth,brand:document.querySelector('.brand').innerText};const must=(value,label)=>{if(!value)throw Error(label);};must(rows.length===3,'One original shot per row');must(!metrics.overflow,'No horizontal page overflow');must($('shot-A01').textContent.includes('跨切点台词')&&$('shot-A02').textContent.includes('跨切点台词'),'Cross-cut dialogue displayed in both rows');must($('shot-A02').textContent.includes('全文结束标记'),'Long text retained');must(!$('shot-A02').querySelector('script,em'),'Source markup escaped');must($('shot-A03').textContent.includes('非逐字唱词'),'Subtitle meaning stays explicit');must($('shot-A01').textContent.includes('声音待核'),'Pending sound is visible');document.querySelector('[data-jump="A02"]').click();must($('active-shot').textContent==='A02','Click switches current shot');$('tab-director').click();must(!$('director-panel').hidden&&$('director-content').textContent.includes('全文结束标记'),'Full director/reshoot accessible in visible panel');const details=$('director-panel');details.scrollTop=details.scrollHeight;must(details.scrollTop>0,'Long director panel scrolls');$('tab-dialogue').click();must($('shot-cues').textContent.includes('全文结束标记'),'All shot dialogue appears in current panel');$('search-shots').value='全文结束标记';$('search-shots').dispatchEvent(new Event('input'));must(rows.filter(r=>!r.hidden).length===1,'Full-text search');$('search-shots').value='';$('search-shots').dispatchEvent(new Event('input'));$('shot-table-scroll').dispatchEvent(new WheelEvent('wheel'));must($('follow').getAttribute('aria-pressed')==='false','Wheel pauses follow');$('follow').click();must($('follow').getAttribute('aria-pressed')==='true','Follow resumes');document.querySelector('[data-jump="A03"]').click();must($('shot-table-scroll').scrollTop>0,'Current row follows');must($('shot-A03').textContent.includes('片尾声音完整保留')&&$('shot-cues').textContent.includes('片尾声音完整保留'),'Audio tail is mapped into both final row and current panel');$('review-open').click();must($('review-dialog').open,'Review disclosure opens');$('review-dialog').close();$('transcript-open').click();must(document.querySelectorAll('.transcript-event').length===4,'Canonical transcript is not duplicated');$('transcript-dialog').close();const video=$('source-video'),stage=document.querySelector('.video-stage');must(getComputedStyle(video).objectFit==='contain','Video never cropped');metrics.video=video.getBoundingClientRect().toJSON();metrics.stage=stage.getBoundingClientRect().toJSON();metrics.table=$('shot-table-scroll').getBoundingClientRect().toJSON();if(innerWidth>900){must(metrics.table.bottom<=innerHeight+1,'Table remains inside viewport');must(metrics.table.height>=150,'Useful table reading area');must(metrics.video.height>=200,'Large source monitor');}return metrics;})()`);
  await screenshot(`fixture-${width}x${height}`);findings.push({case:'synthetic',...result});
}
function studySelection(study){
  const shots=study.shots;
  assert(shots?.length,'The supplied study must contain shots');
  const dialogueCount=s=>overlapping(s,study.dialogue||[],study.source,s.id===shots.at(-1).id).length;
  const greatest=score=>shots.reduce((best,s)=>score(s)>score(best)?s:best);
  const shortest=greatest(s=>-(s.end-s.start));
  const mostDialogue=greatest(dialogueCount);
  const mostDirection=greatest(s=>Object.values(s.director||{}).join('\n').length);
  const chosen=new Map();
  for(const [role,shot] of [['first',shots[0]],['middle',shots[Math.floor(shots.length/2)]],['last',shots.at(-1)],['shortest',shortest],['most-dialogue',mostDialogue]]){
    if(!chosen.has(shot.id))chosen.set(shot.id,{id:shot.id,roles:[]});
    chosen.get(shot.id).roles.push(role);
  }
  return {targets:[...chosen.values()],mostDialogue,mostDirection};
}
async function studyChecks(file,study,width,height){
  await load(file,width,height);
  const selection=studySelection(study);
  const result=await evaluate(`(async()=>{
    const v=document.getElementById('source-video');v.preload='auto';
    if(v.readyState<2)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Source video load timed out')),9000);v.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Source video failed'));},{once:true});});
    const results=[];
    for(const target of ${JSON.stringify(selection.targets)}){
      // Seeking away first also exercises a first-shot click when playback starts at zero.
      // A one-frame source cannot move to a different frame, so reload its sole frame.
      const source=JSON.parse(document.getElementById('study-data').textContent).source;
      if(source.frameCount>1){const alternate=source.frameTimes?.[source.frameCount-1]??Math.max(0,(source.videoDuration||v.duration)-1/(source.fps||24));v.currentTime=v.currentTime<alternate/2?alternate:0;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preparation seek timed out')),9000);const check=()=>{if(v.seeking||v.readyState<2)return setTimeout(check,20);clearTimeout(timer);resolve();};check();});}
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Seek timed out: '+target.id)),9000);
        v.requestVideoFrameCallback((_,frame)=>{const settled=()=>{if(v.seeking||v.readyState<2)return setTimeout(settled,20);clearTimeout(timer);results.push({...target,frame:frame.mediaTime,time:v.currentTime,current:document.getElementById('active-shot').textContent});resolve();};settled();});
        if(source.frameCount===1)v.load();
        const button=[...document.querySelectorAll('[data-jump]')].find(b=>b.dataset.jump===target.id);
        if(!button){clearTimeout(timer);return reject(Error('Missing shot button: '+target.id));}button.click();
      });
    }
    return {viewport:[innerWidth,innerHeight],seeks:results,rows:document.querySelectorAll('tr[data-shot-id]').length,cues:document.querySelectorAll('.transcript-event').length,table:document.getElementById('shot-table-scroll').getBoundingClientRect().toJSON(),video:v.getBoundingClientRect().toJSON()};
  })()`);
  assert.equal(result.rows,study.shots.length,'One row per input shot');
  assert.equal(result.cues,(study.dialogue||[]).length,'Canonical transcript count matches input');
  for(const seek of result.seeks){
    const shot=study.shots.find(s=>s.id===seek.id), expected=study.source.frameTimes?.[shot.startFrame]??shot.start;
    assert.equal(seek.current,seek.id);assert(Math.abs(seek.frame-expected)<.000002,JSON.stringify({...seek,expected}));
  }
  for(const [panel,shot] of [['dialogue',selection.mostDialogue],['director',selection.mostDirection]]){
    await evaluate(`[...document.querySelectorAll('[data-jump]')].find(b=>b.dataset.jump===${JSON.stringify(shot.id)}).click();document.getElementById('tab-${panel}').click()`);
    await evaluate('new Promise(r=>setTimeout(r,300))');await screenshot(`study-${panel}-${width}x${height}`);
  }
  findings.push({case:'study',...result});
}
try {
  const video=join(scratch,'fixture.mp4');execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=24:duration=2','-f','lavfi','-i','anullsrc=sample_rate=48000:channel_layout=stereo:d=2.2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',video]);
  const data=fixture(pathToFileURL(video).href), file=join(scratch,'fixture.html');writeFileSync(file,renderReport(data));
  const original=JSON.stringify(data);renderReport(data);assert.equal(JSON.stringify(data),original,'Rendering never mutates source');
  const missing=join(scratch,'missing.json');writeFileSync(missing,JSON.stringify({...data,source:{...data.source,file:'missing.mp4'}}));assert.throws(()=>renderCLI([missing,'--out',join(scratch,'missing.html')]),/资源不存在/);
  await boot();
  for(const size of [[1280,720],[1440,900],[1024,768],[375,812],[812,375]])await syntheticChecks(file,...size);
  if(arg('--study')){const study=JSON.parse(readFileSync(arg('--study'),'utf8')), report=join(artifacts,'study-report.html');renderCLI([arg('--study'),'--out',report]);for(const size of [[1280,720],[1440,900]])await studyChecks(report,study,...size);}
  writeFileSync(join(artifacts,'ui-verification.json'),JSON.stringify({passed:true,findings},null,2));console.log(JSON.stringify({passed:true,cases:findings.length,artifacts}));
} finally {
  socket?.close();
  if(browser && browser.exitCode==null)await new Promise(resolve=>{const timeout=setTimeout(()=>{browser.kill('SIGKILL');resolve();},2500);browser.once('exit',()=>{clearTimeout(timeout);resolve();});browser.kill('SIGTERM');});
  rmSync(scratch,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
