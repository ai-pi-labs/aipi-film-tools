#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,renameSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {BRAND,checkStudy,inspectVideo,geometry,inputSnapshot,verifySnapshot,fileDigest,digest} from './model.mjs';
import {openCanvas} from './browser.mjs';
import {chromeBinary,renderCard,loadedStyleDigest} from './cards.mjs';

const implementationFiles=[new URL(import.meta.url),new URL('./model.mjs',import.meta.url),new URL('./cards.mjs',import.meta.url),new URL('./browser.mjs',import.meta.url),new URL('../ui/card.css',import.meta.url)].map(url=>fileURLToPath(url));
const loadedImplementation=implementationFiles.map(file=>({file,sha256:fileDigest(file)}));

export function compareAudioTracks(sourceTracks, outputTracks, mode) {
  if(sourceTracks.length!==outputTracks.length) throw new Error('导出后音轨数量变化');
  return sourceTracks.map((source,index)=>{
    const output=outputTracks[index];
    const tolerance=(mode==='original-packets'?1:1024)/source.sampleRate+0.000002;
    const duration=Number(output.duration),startTime=Number(output.start_time || 0);
    const durationDifference=duration-source.duration,startDifference=startTime-source.startTime;
    if(!Number.isFinite(durationDifference)||!Number.isFinite(startDifference)||Math.abs(durationDifference)>tolerance||Math.abs(startDifference)>tolerance||Number(output.sample_rate)!==source.sampleRate||output.channels!==source.channels||(mode==='original-packets'&&output.codec_name!==source.codec)) throw new Error('导出后第 '+(index+1)+' 条音轨时长、起点或采样参数不一致');
    return {track:index,sourceDuration:source.duration,outputDuration:duration,durationDifference,sourceStart:source.startTime,outputStart:startTime,startDifference,sampleRate:source.sampleRate,channels:source.channels,mode,tolerance,passed:true};
  });
}

function outputProbe(file) {
  return JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8',maxBuffer:16*1024*1024}));
}

export function compositionArguments({video,temporaryOutput,layout,source,progress}) {
  const fit=`scale=${layout.video.width}:${layout.video.height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${layout.video.width}:${layout.video.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
  const stack=layout.orientation==='vertical-stack'?'vstack':'hstack';
  const graph=`[0:v:0]${fit}[picture];[1:v:0]setsar=1[card];[picture][card]${stack}=inputs=2:shortest=1[result]`;
  const canCopyAudio=source.audio.every(track=>['aac','mp3','alac'].includes(track.codec));
  const args=['-hide_banner','-loglevel','error','-y','-i',video,'-f','rawvideo','-pixel_format','rgb24','-video_size',`${layout.panel.width}x${layout.panel.height}`,'-framerate',String(source.fps),'-i','pipe:0','-filter_complex',graph,'-map','[result]','-map','0:a?','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p'];
  if(source.audio.length) args.push('-c:a',canCopyAudio?'copy':'aac');
  if(source.audio.length&&!canCopyAudio) args.push('-b:a','192k');
  args.push('-movflags','+faststart','-metadata',`comment=${BRAND} synchronized film-study export`,'-progress',progress,temporaryOutput);
  return {args,audioMode:source.audio.length?(canCopyAudio?'original-packets':'aac-transcode'):'no-audio'};
}

export async function encodeCards({video,temporaryOutput,layout,source,cards,progress,onProgress=()=>{}}) {
  const config=compositionArguments({video,temporaryOutput,layout,source,progress});
  const child=spawn('ffmpeg',config.args,{stdio:['pipe','ignore','pipe']});
  let diagnostics='';
  child.stderr.on('data',chunk=>{diagnostics=(diagnostics+chunk.toString()).slice(-16000);});
  // Attach process completion before feeding pixels, so early decoder failures are captured.
  const completion=new Promise((accept,reject)=>{
    child.on('error',reject);
    child.on('close',code=>code===0?accept():reject(new Error('合成失败：'+diagnostics)));
  });
  completion.catch(()=>{});
  let writtenFrames=0;
  try {
    for(const card of cards) {
      verifySnapshot([{file:card.file,sha256:card.sha256}]);
      const pixels=execFileSync('ffmpeg',['-v','error','-i',card.file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{maxBuffer:layout.panel.width*layout.panel.height*3+1024});
      if(pixels.length!==layout.panel.width*layout.panel.height*3) throw new Error(card.id+'：面板像素长度异常');
      for(let frame=card.startFrame;frame<card.endFrame;frame++) {
        if(!child.stdin.write(pixels)) await once(child.stdin,'drain');
        writtenFrames++;
      }
      onProgress({phase:'encode',shot:card.id,writtenFrames,totalFrames:source.frameCount});
    }
    child.stdin.end();
    await completion;
  } catch(error) {child.stdin.destroy();child.kill();await completion.catch(()=>{});throw error;}
  if(writtenFrames!==source.frameCount) throw new Error('实际写入的信息卡帧数不等于源帧数');
  return {writtenFrames,audioMode:config.audioMode};
}

export async function exportStudy({studyFile,videoFile,outputFile,workDirectory,chrome,reference=false,panelPx,font,onProgress=()=>{}}) {
  const dataFile=resolve(studyFile),video=resolve(videoFile),out=resolve(outputFile);
  verifySnapshot(loadedImplementation);
  const implementation=implementationFiles.map(file=>({file,sha256:fileDigest(file)}));
  if(implementation.at(-1).sha256!==loadedStyleDigest) throw new Error('已加载的样式与磁盘版本不同，请重启导出');
  const dataBytes=readFileSync(dataFile);
  const study=JSON.parse(dataBytes.toString('utf8'));
  const gate=checkStudy(study,{reference});
  if(!gate.ok) throw new Error((reference?'数据不能导出：':'生产检查未通过；先完成核对，或显式选择 --reference 参考版：')+'\n'+gate.issues.join('\n'));
  const work=workDirectory?resolve(workDirectory):mkdtempSync(join(tmpdir(),'aipi-sync-'));
  mkdirSync(work,{recursive:true});mkdirSync(dirname(out),{recursive:true});
  const snapshot=inputSnapshot(dataFile,video,study);
  if(snapshot.find(item=>item.file===dataFile).sha256!==digest(dataBytes)) throw new Error('数据在读取和快照间变化，请重新导出');
  if(study.source.sha256&&fileDigest(video)!==study.source.sha256) throw new Error('source.sha256 与实际原片不符');
  const source=inspectVideo(video,study.source);
  const layout=geometry(study.source,{panelPx,font});
  const browser=chromeBinary(chrome);
  onProgress({phase:'source-verified',frames:source.frameCount,layout});
  const cards=[];
  const canvas=await openCanvas(browser,work);
  try {
    for(const shot of study.shots) {
      cards.push(await renderCard(study,shot,layout,{reference,studyDirectory:dirname(dataFile),work,chrome:browser,browser:canvas}));
      onProgress({phase:'render',shot:shot.id,completed:cards.length,total:study.shots.length});
    }
  } finally {await canvas.close();}
  verifySnapshot(snapshot);
  verifySnapshot(implementation);
  const temporaryOutput=join(work,'encoded-review.mp4');
  const encoded=await encodeCards({video,temporaryOutput,layout,source,cards,progress:join(work,'encode-progress.txt'),onProgress});
  execFileSync('ffmpeg',['-v','error','-i',temporaryOutput,'-f','null','-'],{stdio:['ignore','ignore','pipe']});
  const result=outputProbe(temporaryOutput);
  const visual=result.streams.find(stream=>stream.codec_type==='video');
  const audio=result.streams.filter(stream=>stream.codec_type==='audio');
  if(Number(visual.nb_read_frames)!==source.frameCount || visual.width!==layout.output.width || visual.height!==layout.output.height || audio.length!==source.audio.length) throw new Error('导出后帧数、画面尺寸或音轨数不一致');
  if(Math.abs(Number(visual.duration)-source.videoDuration)>1/source.fps) throw new Error('导出后视频时长与源帧数不一致');
  const audioVerification=compareAudioTracks(source.audio,audio,encoded.audioMode);
  verifySnapshot(snapshot);
  verifySnapshot(implementation);
  const manifest={schema:'aipi.sync-export/v1',brand:BRAND,reference,productionCheckPassed:!reference,source,layout,inputs:snapshot,cards,encoding:encoded,audioVerification,outputProbe:result,fullDecodePassed:true,sourceDataSchema:study.schema,sourceReviewState:study.review?.audio?.state,implementation,output:{file:out,sha256:fileDigest(temporaryOutput)}};
  renameSync(temporaryOutput,out);
  writeFileSync(out+'.manifest.json',JSON.stringify(manifest,null,2)+'\n');
  onProgress({phase:'complete',output:out,manifest:out+'.manifest.json'});
  return manifest;
}

function commandLine(args) {
  const options={reference:false};
  if(!args.length||args.includes('--help')) return null;
  options.studyFile=args[0];
  const names={'--video':'videoFile','--out':'outputFile','--work':'workDirectory','--chrome':'chrome','--panel-px':'panelPx','--font':'font'};
  for(let i=1;i<args.length;i++) {
    if(args[i]==='--reference') {options.reference=true;continue;}
    if(!names[args[i]]||!args[i+1]||args[i+1].startsWith('--')) throw new Error('未知或缺值的参数：'+args[i]);
    options[names[args[i]]]=args[++i];
  }
  if(!options.videoFile||!options.outputFile) throw new Error('需要 --video 原片和 --out 成片路径');
  return options;
}

if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const options=commandLine(process.argv.slice(2));
    if(!options) process.stdout.write('AIπ｜AI圆周派 · 同步审片\nnode scripts/export.mjs study.json --video 原片.mp4 --out 同步审片.mp4 [--work work/render] [--chrome 浏览器路径] [--reference] [--panel-px 972] [--font 26]\n生产检查默认开启。参考导出会在每帧标明尚未通过生产验收。\n');
    else await exportStudy({...options,onProgress:event=>process.stdout.write(JSON.stringify(event)+'\n')});
  } catch(error) {process.stderr.write(error.message+'\n');process.exitCode=1;}
}
