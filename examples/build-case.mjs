#!/usr/bin/env node
// Build a distributable case from the repository's original synthetic demo.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,copyFileSync,rmSync,readdirSync,existsSync} from 'node:fs';
import {dirname,join,resolve,relative,basename,extname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {csvText,srtText,validateStudy,fileHash} from '../skills/aipi-film-study/scripts/engine.mjs';
import {main as report} from '../skills/aipi-film-study/scripts/report.mjs';
import {exportStudy} from '../skills/aipi-sync-video/scripts/export.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),options={};
if(args.includes('--help')){
  console.log('Usage: node examples/build-case.mjs [--out dist] [--work work/case-build] [--chrome /path/to/chrome]\nRequires Node.js 22+, FFmpeg/ffprobe with libx264 and AAC, Chrome/Chromium, Chinese fonts, Python 3 standard library.\nBuilds a synthetic reference case, verifies it after relocation, and writes aipi-demo-case.zip plus SHA-256.');
  process.exit(0);
}
for(let i=0;i<args.length;i+=2){assert(['--out','--work','--chrome'].includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'),'Unknown or incomplete option. Use --help.');options[args[i].slice(2)]=args[i+1];}
const dist=resolve(options.out||join(repo,'dist')),work=resolve(options.work||join(repo,'work/case-build'));
mkdirSync(work,{recursive:true});mkdirSync(dist,{recursive:true});
const run=mkdtempSync(join(work,'run-')),payload=join(run,'aipi-demo-case');
const json=(file,data)=>writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const ffmpeg=(args,maxBuffer=64*1024*1024)=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error',...args],{maxBuffer});
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
const list=folder=>readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(join(folder,e.name)):[join(folder,e.name)]);
console.log('Generating the original 12-second synthetic demo…');
execFileSync(process.execPath,[join(repo,'examples/create-demo.mjs'),'--out',payload],{stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
const studyFile=join(payload,'study.json'),study=JSON.parse(readFileSync(studyFile,'utf8'));
study.source.file='demo.mp4';if('path' in study.source)study.source.path='demo.mp4';
json(studyFile,study);rmSync(join(payload,'demo-check.json'));
assert.equal(study.shots.length,3);assert.equal(study.dialogue.length,4);assert.equal(study.source.frameCount,288);
assert(study.shots.every(s=>s.sound.status==='pending'));assert(study.dialogue.every(c=>c.status==='uncertain'));
const production=validateStudy(study,{baseDir:payload,production:true,checkAssets:true});assert.equal(production.ok,false);
assert(study.shots[0].dialogueIds.includes('D01')&&study.shots[1].dialogueIds.includes('D01'),'D01 must continue across the first cut');
writeFileSync(join(payload,'shots.csv'),csvText(study));writeFileSync(join(payload,'dialogue.srt'),srtText(study));
report([studyFile,'--out',join(payload,'report.html')]);
console.log('Exporting all 288 frames with an explicit reference label…');
const encoded=join(run,'review.mp4');
const manifest=await exportStudy({studyFile,videoFile:join(payload,'demo.mp4'),outputFile:encoded,workDirectory:join(run,'render'),reference:true,panelPx:1000,font:24,chrome:options.chrome});
copyFileSync(encoded,join(payload,'review.mp4'));
assert.equal(manifest.reference,true);assert.equal(manifest.productionCheckPassed,false);
const pcm=file=>ffmpeg(['-i',file,'-map','0:a:0','-f','s16le','-acodec','pcm_s16le','pipe:1']);
const sourcePCM=pcm(join(payload,'demo.mp4')),reviewPCM=pcm(join(payload,'review.mp4'));
assert(sourcePCM.length>0);assert.deepEqual(sourcePCM,reviewPCM,'The generated silent audio must survive unchanged');
assert(sourcePCM.every(byte=>byte===0),'This case promises silent audio, not an actual spoken transcript');
const sourceInfo=probe(join(payload,'demo.mp4')),reviewInfo=probe(join(payload,'review.mp4'));
for(const info of [sourceInfo,reviewInfo])assert.equal(Number(info.streams.find(s=>s.codec_type==='video').nb_read_frames),288);
for(const file of ['demo.mp4','review.mp4'])ffmpeg(['-i',join(payload,file),'-f','null','-']);
const geometry=manifest.layout,bytesPerFrame=geometry.panel.width*geometry.panel.height*3;
const cards=manifest.cards.map(card=>({id:card.id,pixels:ffmpeg(['-i',card.file,'-pix_fmt','rgb24','-f','rawvideo','pipe:1'])}));
const samples=[0,95,96,191,192,240,287];
const selection=samples.map(n=>`eq(n\\,${n})`).join('+');
const pixels=ffmpeg(['-i',encoded,'-vf',`select=${selection},crop=${geometry.panel.width}:${geometry.panel.height}:0:${geometry.video.height},format=rgb24`,'-fps_mode','passthrough','-f','rawvideo','pipe:1']);
assert.equal(pixels.length,samples.length*bytesPerFrame);
const boundaryChecks=samples.map((frame,index)=>{
  const actual=pixels.subarray(index*bytesPerFrame,(index+1)*bytesPerFrame);
  const scores=cards.map(card=>{let error=0;for(let i=0;i<actual.length;i++)error+=(actual[i]-card.pixels[i])**2;return {id:card.id,mse:error/actual.length};}).sort((a,b)=>a.mse-b.mse);
  const expected=study.shots.find(s=>s.startFrame<=frame&&frame<s.endFrame).id;assert.equal(scores[0].id,expected);
  return {frame,expected,actual:scores[0].id,mse:scores[0].mse};
});
mkdirSync(join(payload,'preview'));
for(const [index,frame] of [48,144,240].entries())ffmpeg(['-y','-i',encoded,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',join(payload,'preview',`G0${index+1}.png`)]);
const completeness=manifest.cards.map(card=>{
  assert.equal(card.audit.issues.length,0);const shot=study.shots.find(s=>s.id===card.id);
  for(const [field,text] of Object.entries(shot.director))assert(card.audit.items.some(i=>i.id==='director-'+field&&i.text===text));
  for(const cue of study.dialogue.filter(c=>shot.dialogueIds.includes(c.id)))assert(card.audit.items.some(i=>i.id===cue.id&&i.text.endsWith(cue.text)));
  assert(card.audit.items.some(i=>i.id==='edition'&&i.text.includes('参考版')));
  return {shot:card.id,visibleTextFields:card.audit.items.length,allDialogueAndDirectorTextVisible:true,clippingIssues:[]};
});
const verification={schema:'aipi.public-case/v1',synthetic:true,productionReady:false,source:'demo.mp4',review:'review.mp4',shots:3,canonicalSubtitles:4,sourceFrames:288,reviewFrames:288,fps:24,duration:12,fullDecodePassed:true,
  sourceSize:[study.source.width,study.source.height],reviewSize:[geometry.output.width,geometry.output.height],
  audio:{description:'Generated silent stereo audio; no spoken transcript or listening review is claimed.',pcmByteIdentical:true,allDecodedSamplesZero:true,decodedBytes:sourcePCM.length,tracks:manifest.audioVerification},
  completeness,boundaryChecks,productionBlockingReasons:production.errors,
  manualReview:'Preview images are included for human inspection; automatic checks do not claim a human review on every rebuild.'};
json(join(payload,'verification.json'),verification);
copyFileSync(join(repo,'LICENSE'),join(payload,'LICENSE'));
writeFileSync(join(payload,'CASE-README.md'),`# AIπ｜AI圆周派：三种构图节奏\n\n原创合成案例：AIπ（AI圆周派）。采用MIT许可证，版权与许可声明见同目录LICENSE，转载或分发时请保留。\n\n这是脚本生成的合成参考案例：12秒、24fps、288帧、3镜、4条英文画面字幕，附中文画面观察、导演分析和复拍建议。静音音轨没有配音；所有声音行保留 pending，字幕保留 uncertain，审核未完成。review.mp4 明示参考版，不是完成生产听审的真实短剧。\n\n解压后保持目录结构，打开 report.html 查看随播放定位的逐镜工作台；用播放器打开 review.mp4 查看同步信息卡。若浏览器限制本地媒体，可在此目录运行 python3 -m http.server 8000，再打开 http://127.0.0.1:8000/report.html。\n\n- demo.mp4：原创几何动画及画面字幕。\n- study.json、frames/：可编辑结构化数据、6张关键帧及身份清单。\n- shots.csv、dialogue.srt：一镜一行表格、独立字幕事件；D01跨4秒切点，在前两镜显示全文，SRT只出现一次。\n- review.mp4：完整原速同步参考视频；信息较多时暂停阅读。\n- preview/：实际成片三张截图。\n- verification.json：解码、帧数、声音信号、中文全文与切点检查摘要。\n\n复现命令与依赖见 https://github.com/ai-pi-labs/aipi-film-tools 。运行 npm run case；仅使用仓库自制素材，不需要私人影片或在线模型服务。\n`);

function checkPortable(folder){
  const files=list(folder),allowed=new Set(['demo.mp4','study.json','report.html','shots.csv','dialogue.srt','review.mp4','CASE-README.md','LICENSE','verification.json','frames/frame-manifest.json',...study.shots.flatMap(s=>Object.values(s.frames)),...['G01','G02','G03'].map(id=>'preview/'+id+'.png')]);
  assert.deepEqual(new Set(files.map(file=>relative(folder,file).split('\\').join('/'))),allowed,'Package contains only public, required files');
  for(const file of files.filter(file=>['.json','.html','.csv','.srt','.md'].includes(extname(file)))){
    const text=readFileSync(file,'utf8');assert(!text.includes(repo)&&!text.includes(run)&&!/(?:\/Users\/|\/home\/|\/private\/var\/|file:\/\/|[A-Z]:\\\\Users\\\\)/.test(text),'Private or absolute machine path in '+basename(file));
  }
  const data=JSON.parse(readFileSync(join(folder,'study.json'),'utf8'));
  for(const asset of [data.source.file,...data.shots.flatMap(s=>Object.values(s.frames)),data.assets.framesManifest])assert(!isAbsolute(asset)&&existsSync(resolve(folder,asset)),asset);
  const validation=validateStudy(data,{baseDir:folder,checkAssets:true});assert(validation.ok,validation.errors.join('\n'));
  const html=readFileSync(join(folder,'report.html'),'utf8');let checked=0;
  for(const match of html.matchAll(/(?:src|poster|href)\s*=\s*["']([^"']+)["']/g)){
    if(match[1].startsWith('#'))continue;
    assert(!/^(?:[a-z]+:|\/)/i.test(match[1]),'Report asset must be local and relative');
    assert(existsSync(resolve(folder,decodeURIComponent(match[1]))),match[1]);checked++;
  }
  assert(checked>=7,'Video and six frame references must be checked');return {files:files.length,reportAssetReferences:checked,assetsAndHashesPassed:true};
}
checkPortable(payload);
const archive=join(dist,'aipi-demo-case.zip');
const zip=()=>execFileSync('python3',['-c','import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED) as z:\n for p in sorted(root.rglob("*")):\n  if p.is_file(): z.write(p,pathlib.Path(root.name)/p.relative_to(root))',payload,archive]);
zip();
const moved=join(run,'relocated');mkdirSync(moved);
execFileSync('python3',['-c','import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z: z.extractall(sys.argv[2])',archive,moved]);
const relocated=join(moved,'aipi-demo-case');verification.relocation=checkPortable(relocated);
for(const file of ['demo.mp4','review.mp4']){assert.equal(fileHash(join(relocated,file)),fileHash(join(payload,file)));ffmpeg(['-i',join(relocated,file),'-f','null','-']);}
console.log('Checking the relocated workbench in an isolated browser…');
const uiArgs=[join(repo,'skills/aipi-film-study/tests/ui-check.mjs'),'--study',join(relocated,'study.json'),'--artifacts',join(run,'relocated-ui')];if(options.chrome)uiArgs.push('--chrome',options.chrome);
execFileSync(process.execPath,uiArgs,{stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});
const ui=JSON.parse(readFileSync(join(run,'relocated-ui/ui-verification.json'),'utf8'));assert.equal(ui.passed,true);
verification.relocation.browserStudyChecks=ui.findings.filter(f=>f.case==='study').map(f=>({viewport:f.viewport,rows:f.rows,cues:f.cues,seeks:f.seeks.map(seek=>({id:seek.id,roles:seek.roles,startFrame:study.shots.find(shot=>shot.id===seek.id).startFrame,requestedTime:seek.frame,actualTime:seek.time,timeUnit:'seconds',current:seek.current}))}));
verification.relocation.originalAndReviewDecodePassed=true;
json(join(payload,'verification.json'),verification);checkPortable(payload);zip();
const finalMoved=join(run,'final-unpacked');mkdirSync(finalMoved);execFileSync('python3',['-c','import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z: z.extractall(sys.argv[2])',archive,finalMoved]);checkPortable(join(finalMoved,'aipi-demo-case'));
writeFileSync(join(dist,'aipi-demo-case.sha256'),fileHash(archive)+'  aipi-demo-case.zip\n');
console.log(JSON.stringify({archive,checksum:join(dist,'aipi-demo-case.sha256'),files:list(payload).length,preview:join(payload,'preview'),verification:join(payload,'verification.json'),productionReady:false},null,2));
