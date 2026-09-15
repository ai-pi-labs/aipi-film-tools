#!/usr/bin/env node
// Original, procedurally generated media. No footage, fonts or network downloads.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFrames, mappedStudy, probeMedia, validateStudy } from '../skills/aipi-film-study/scripts/engine.mjs';
import { main as renderReport } from '../skills/aipi-film-study/scripts/report.mjs';

const args=process.argv.slice(2);
if(args.includes('--help')){
  console.log('Usage: node examples/create-demo.mjs [--out examples/demo]\nRequires Node.js 22+, ffmpeg and ffprobe with libx264 and AAC.');
  process.exit(0);
}
if(args.some((a,i)=>a!=='--out'&&args[i-1]!=='--out') || (args.includes('--out')&&!args[args.indexOf('--out')+1]))throw Error('Expected --out directory. Use --help for usage.');
const out=resolve(args.includes('--out')?args[args.indexOf('--out')+1]:join(dirname(fileURLToPath(import.meta.url)),'demo'));
mkdirSync(out,{recursive:true});
const scratch=mkdtempSync(join(out,'.building-'));
const ffmpeg=(args,options={})=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:['ignore','ignore','pipe'],...options});
const save=(file,data)=>writeFileSync(file,JSON.stringify(data,null,2)+'\n');

// A small bitmap alphabet keeps burned-in captions portable, including FFmpeg
// builds without drawtext/libass. These glyphs are authored here, not a font file.
const letters={
  A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],
  ',':['00000','00000','00000','00000','00000','00110','00100']
};
function captionBitmap(file,text){
  const width=1280,height=64,scale=4,pixels=Buffer.alloc(width*height*3);
  for(let i=0;i<pixels.length;i+=3){pixels[i]=12;pixels[i+1]=17;pixels[i+2]=23;}
  const start=Math.floor((width-text.length*6*scale+scale)/2);
  assert(start>=0,'Caption must fit in frame');
  for(const [index,char] of [...text].entries()){
    const glyph=letters[char];assert(glyph,`Unsupported caption character: ${char}`);
    glyph.forEach((line,y)=>[...line].forEach((bit,x)=>{if(bit!=='1')return;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
      const p=((18+y*scale+dy)*width+start+index*6*scale+x*scale+dx)*3;pixels[p]=238;pixels[p+1]=235;pixels[p+2]=221;
    }}));
  }
  writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),pixels]));
}
const captions=[
  {start:.5,end:4.4,text:'GIVE THE SHAPE ROOM TO MOVE.'},
  {start:4.4,end:6.1,text:'BRING THE SECOND SHAPE CLOSER.'},
  {start:6.1,end:7.9,text:'KEEP A FIXED FRAME OF REFERENCE.'},
  {start:8.4,end:11.7,text:'THREE SHAPES, ONE SHARED LINE.'}
];
const color=(value,size='1280x720')=>['-f','lavfi','-i',`color=c=${value}:s=${size}:r=24:d=4`];
try{
  const sequences=[
    {inputs:[...color('0x172A3A'),...color('0xE8B977','180x180')],filter:"[0:v]drawbox=x=80:y=464:w=1120:h=2:color=0x526571:t=fill[bg];[bg][1:v]overlay=x='160+24*t':y=280:shortest=1[out]"},
    {inputs:[...color('0x302625'),...color('0xE8B977','160x320'),...color('0x72C9CB','100x100')],filter:"[0:v]drawbox=x=80:y=502:w=1120:h=2:color=0x6D5B50:t=fill[bg];[bg][1:v]overlay=x=520:y=180:shortest=1[anchor];[anchor][2:v]overlay=x='920-60*t':y=320:shortest=1[out]"},
    {inputs:[...color('0x173534'),...color('0xE8B977','130x130'),...color('0x72C9CB','130x130'),...color('0xE8B977','130x130')],filter:"[0:v]drawbox=x=80:y=412:w=1120:h=2:color=0x50716A:t=fill[bg];[bg][1:v]overlay=x=320:y='120+40*t':shortest=1[a];[a][2:v]overlay=x=576:y='420-35*t':shortest=1[b];[b][3:v]overlay=x=832:y='230+12.5*t':shortest=1[out]"}
  ];
  for(const [i,sequence] of sequences.entries())ffmpeg([...sequence.inputs,'-filter_complex',sequence.filter,'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-frames:v','96',join(scratch,`part-${i}.mp4`)]);
  writeFileSync(join(scratch,'parts.txt'),sequences.map((_,i)=>`file 'part-${i}.mp4'`).join('\n')+'\n');
  const captionInputs=[];let overlay='';
  for(const [i,cue] of captions.entries()){
    const name=`caption-${i}.ppm`;captionBitmap(join(scratch,name),cue.text);
    captionInputs.push('-loop','1','-framerate','24','-i',name);
    overlay+=`${i?'[c'+(i-1)+']':'[0:v]'}[${i+2}:v]overlay=x=0:y=624:enable='gte(t,${cue.start})*lt(t,${cue.end})'[c${i}];`;
  }
  ffmpeg(['-f','concat','-safe','1','-i','parts.txt','-f','lavfi','-i','anullsrc=sample_rate=48000:channel_layout=stereo:d=12',...captionInputs,
    '-filter_complex',overlay.slice(0,-1),'-map',`[c${captions.length-1}]`,'-map','1:a','-t','12','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',join(out,'demo.mp4')],{cwd:scratch});
  const video=join(out,'demo.mp4'),source=probeMedia(video);
  assert.equal(source.frameCount,288);assert.equal(source.timing,'cfr');assert.equal(source.timeOrigin,0);
  const details=[
    {description:'深蓝底上，金色方块从左侧缓缓向右移动。下方细线固定，右半画面保持空白。',subjects:['金色方块'],director:{intention:'先建立运动方向，让右侧留白成为观众等待进入的空间。',emotion:'移动幅度小，开场保持安静而克制。',blocking:'方块固定在同一高度，四秒向右移动约九十六像素；细线提供稳定参照。',edit:'在运动仍未结束时硬切，下一镜保留左右关系，再加入第二个形体。',reshoot:'固定机位，把方块放在左三分之一处。只移动主体，锁定曝光和背景；右侧留出至少一半空画面。'}},
    {description:'棕色底上，金色竖矩形停在中央偏左；青色小方块从右侧靠近，间距持续缩短。',subjects:['金色竖矩形','青色方块'],director:{intention:'用大小和动静的差异，把单体运动变成两个形体之间的关系。',emotion:'距离越近，画面的张力越集中在二者之间。',blocking:'金色矩形保持不动；青色方块沿水平线左移，接近大形体的右边缘。',edit:'延续上一镜的水平阅读方向；接近时切走，把悬停的张力交给下一镜的归位。',reshoot:'先标出大形体的固定位置，再为小形体设一条水平轨迹。保持相同运动速度，结束时保留清晰间隙。'}},
    {description:'墨绿底上，三个方块分占左、中、右。左方块下降，中方块上升，右方块小幅下降，逐渐靠齐同一高度。',subjects:['两枚金色方块','青色方块'],director:{intention:'把前两镜的单向靠近变成三者归位，形成清楚的视觉收束。',emotion:'分散的高度逐渐统一，紧张感随之平复。',blocking:'三个方块的横向位置不变，分别沿竖直轨迹移动；底部细线提示最终对齐位置。',edit:'背景换成墨绿，形体颜色延续前镜。镜尾接近齐平后结束，保留一点运动余量。',reshoot:'先摆好最终的等距阵列，再倒推三个起点。按不同距离分配速度，让它们在同一时刻靠齐。'}}
  ];
  const study=mappedStudy({schema:'aipi.film-study/v1',title:'合成演示｜三种构图节奏',source,
    provenance:{kind:'synthetic-demo',generator:'examples/create-demo.mjs',notes:'几何形体、静音音轨与画面字幕均由本脚本生成；不包含人物、外部素材或真实影片。'},
    shots:details.map((detail,i)=>({id:`G0${i+1}`,start:source.frameTimes[i*96],end:source.frameTimes[(i+1)*96],startFrame:i*96,endFrame:(i+1)*96,
      size:'全景构图',camera:'固定机位',transition:i?'硬切':'开始',...detail,dialogueIds:[],sound:{status:'pending',note:'合成片使用静音音轨。英文说明为画面字幕，未配音；示例保留待核状态。'},
      evidence:['构图与运动依据本脚本中的生成参数；关键帧由引擎重新解码抽取。'],frames:{}})),
    dialogue:captions.map((cue,i)=>({id:`D0${i+1}`,...cue,speaker:'合成字幕（未配音）',type:'dialogue',source:'subtitle',status:'uncertain',rawSubtitle:cue.text,
      notes:'作者编写并实际烧入画面的演示字幕，不是录音听写。保留待核状态，未声称完成正式听审。'})),
    review:{audio:{state:'not-reviewed',coverage:[],openIssues:['合成演示：字幕为作者编写，音轨为静音；没有进行正式声音与字幕审核。'],notes:'本示例用于体验界面、跨镜全文和精确定位，不代表可交付的影片听写。'},
      visual:{state:'pending',notes:'镜头边界依据生成参数设置，尚未登记正式逐帧复核。'}}});
  const extracted=extractFrames(study,video,join(out,'frames'),{baseDir:out,studyOut:join(out,'study.json')});
  const validation=validateStudy(extracted.study,{baseDir:out,video,checkAssets:true});assert(validation.ok,validation.errors.join('\n'));
  const production=validateStudy(extracted.study,{production:true,baseDir:out,video,checkAssets:true});assert.equal(production.ok,false,'Pending demonstration must not pass production review');
  renderReport([extracted.studyOut,'--out',join(out,'report.html')]);
  save(join(out,'demo-check.json'),{synthetic:true,generatedBy:'examples/create-demo.mjs',ordinaryValidation:validation,productionReady:false,
    productionBlockingReasons:production.errors,frames:extracted.count,sourceFrames:source.frameCount,seconds:source.duration});
  console.log(JSON.stringify({report:join(out,'report.html'),study:extracted.studyOut,shots:extracted.study.shots.length,dialogue:captions.length,frames:extracted.count,ordinaryValidation:'passed',productionReady:false},null,2));
}finally{rmSync(scratch,{recursive:true,force:true});}
