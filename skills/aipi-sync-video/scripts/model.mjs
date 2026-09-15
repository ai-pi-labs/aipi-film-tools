import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const BRAND = 'AIπ｜AI圆周派';
export const EPSILON = 0.000001;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const fileDigest = file => digest(readFileSync(file));
export const overlap = (a, b) => Math.min(a.end, b.end) - Math.max(a.start, b.start) > EPSILON;
export const cuesFor = (study, shot) => study.dialogue.filter(cue => overlap(cue, shot.endFrame===study.source.frameCount?{start:shot.start,end:Math.max(shot.end,study.source.duration)}:shot));

function covers(parts, start, end, predicate) {
  let cursor = start;
  for (const part of [...parts].filter(predicate).sort((a,b) => a.start-b.start)) {
    if (part.end <= cursor) continue;
    if (part.start > cursor + EPSILON) return false;
    cursor = Math.max(cursor, part.end);
    if (cursor >= end-EPSILON) return true;
  }
  return cursor >= end-EPSILON;
}

export function checkStudy(study, {reference=false}={}) {
  const issues=[];
  if(study?.schema!=='aipi.film-study/v1') issues.push('需要 aipi.film-study/v1 数据');
  const source=study?.source ?? {};
  if(source.timing!=='cfr' || source.timeOrigin && Math.abs(source.timeOrigin)>EPSILON) issues.push('当前导出只支持已声明的零起点 CFR 素材；VFR 或非零起点须先规范素材并重新测量，不能直接改数据时间');
  if(!(source.fps>0) || !Number.isInteger(source.frameCount) || source.frameCount<1) issues.push('缺少有效的源帧率和帧数');
  if(!Number.isFinite(source.duration)||source.duration<source.frameCount/source.fps-EPSILON || source.videoDuration!=null&&Math.abs(source.videoDuration-source.frameCount/source.fps)>EPSILON || !Number.isInteger(source.width)||source.width<1 || !Number.isInteger(source.height)||source.height<1 || typeof source.hasAudio!=='boolean') issues.push('源片尺寸、时长或音轨声明无效');
  if(!Array.isArray(study?.shots)||!Array.isArray(study?.dialogue)) issues.push('shots 和 dialogue 必须为数组');
  const shots=Array.isArray(study?.shots)?study.shots:[];
  const dialogue=Array.isArray(study?.dialogue)?study.dialogue:[];
  if(!shots.length) issues.push('镜头表为空');
  let next=0;
  const ids=new Set();
  for(const shot of shots) {
    if(!shot.id || ids.has(shot.id)) issues.push('镜号为空或重复：'+shot.id);
    ids.add(shot.id);
    if(!Number.isInteger(shot.startFrame) || !Number.isInteger(shot.endFrame) || shot.startFrame!==next || shot.endFrame<=shot.startFrame) issues.push(shot.id+'：镜头帧区间须连续、非空，endFrame 不包含在镜内');
    if(!Number.isFinite(shot.start)||!Number.isFinite(shot.end)||Math.abs(shot.start-shot.startFrame/source.fps)>EPSILON || Math.abs(shot.end-shot.endFrame/source.fps)>EPSILON) issues.push(shot.id+'：秒数与明确帧号不一致；禁止重复舍入切点');
    const expected=cuesFor({...study,dialogue},shot).map(c=>c.id).sort();
    const declared=[...(shot.dialogueIds??[])].sort();
    if(JSON.stringify(expected)!==JSON.stringify(declared)) issues.push(shot.id+'：dialogueIds 与实际声音事件重叠不一致');
    next=shot.endFrame;
  }
  if(next!==source.frameCount) issues.push('镜头表未覆盖全部源帧');
  const cueIds=new Set();
  for(const cue of dialogue) {
    if(!cue.id || cueIds.has(cue.id)) issues.push('声音事件ID为空或重复：'+cue.id);
    cueIds.add(cue.id);
    if(!(Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&cue.start>=0&&cue.end>cue.start&&cue.end<=source.duration+EPSILON)) issues.push(cue.id+'：声音事件时间无效');
    if(typeof cue.speaker!=='string'||!cue.speaker.trim()) issues.push(cue.id+'：说话人/语言来源角色不能为空');
    if(!['dialogue','voiceover','singing','subtitle-meaning'].includes(cue.type)) issues.push(cue.id+'：声音类型无效');
    if(cue.type==='subtitle-meaning'&&cue.source!=='subtitle') issues.push(cue.id+'：字幕大意必须保留subtitle来源，不能冒充逐字听写');
    if(!source.hasAudio&&['audio','subtitle+audio'].includes(cue.source)) issues.push(cue.id+'：无音轨原片不能声明音频来源');
    if(!['subtitle','audio','subtitle+audio'].includes(cue.source)) issues.push(cue.id+'：必须明确声音事件证据来源');
    if(typeof cue.text!=='string'||!cue.text.trim()) issues.push(cue.id+'：声音原文为空');
  }
  if(!reference) {
    const audio=study?.review?.audio ?? {};
    const parts=Array.isArray(audio.coverage)?audio.coverage:[];
    const needsReview=source.hasAudio || dialogue.length>0;
    if(!source.sha256) issues.push('缺少 source.sha256 素材指纹');
    if(study.review?.visual?.state!=='reviewed') issues.push('画面审核尚未 reviewed');
    if(needsReview&&(!Array.isArray(audio.openIssues)||!Array.isArray(audio.coverage))) issues.push('声音审核必须明确列出 coverage 和 openIssues');
    if(needsReview && audio.state!=='complete') issues.push('全片声音/字幕审核尚未 complete');
    if((audio.openIssues??[]).length) issues.push('仍有声音待核项目：'+audio.openIssues.join('；'));
    const validPart=p=>Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.start>=0&&p.end>p.start&&p.end<=source.duration+EPSILON&&typeof p.method==='string'&&p.method.trim()&&typeof p.notes==='string'&&p.notes.trim();
    if(parts.some(p=>!validPart(p))) issues.push('覆盖记录需要有效区间、method 和 notes');
    if(source.hasAudio && !covers(parts,0,source.duration,p=>validPart(p)&&p.audioChecked===true)) issues.push('没有覆盖全片的实际声音审核 audioChecked 记录');
    if(!source.hasAudio && dialogue.length && !covers(parts,0,source.duration,p=>validPart(p)&&p.subtitlesChecked===true)) issues.push('无音轨影片的字幕审核没有覆盖全片');
    for(const cue of dialogue) {
      if(cue.status!=='verified') issues.push(cue.id+'：事件仍待核实');
    }
    for(const shot of shots) {
      if(!['reviewed','non-speech','none'].includes(shot.sound?.status)) issues.push(shot.id+'：声音状态仍为 pending 或缺失');
      if(['non-speech','none'].includes(shot.sound?.status) && cuesFor(study,shot).length) issues.push(shot.id+'：non-speech 与语言事件冲突');
      if(source.hasAudio&&!cuesFor(study,shot).length&&(!['non-speech','none'].includes(shot.sound?.status)||!shot.sound?.note?.trim()||!covers(parts,shot.start,shot.end,p=>validPart(p)&&p.audioChecked===true&&p.result==='non-speech'))) issues.push(shot.id+'：空语言行需要明确non-speech及整镜声音审核证据');
      if(!shot.description?.trim()) issues.push(shot.id+'：画面观察尚未完成');
      for(const field of ['intention','emotion','blocking','edit','reshoot']) if(!shot.director?.[field]?.trim()) issues.push(shot.id+'：导演字段 '+field+' 尚未完成');
    }
  }
  return {ok:issues.length===0,issues};
}

export function inspectVideo(file, expected) {
  const raw=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',maxBuffer:16*1024*1024}));
  const video=raw.streams.find(s=>s.codec_type==='video');
  if(!video) throw new Error('原片没有视频轨');
  const frames=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',file],{encoding:'utf8',maxBuffer:256*1024*1024})).frames;
  const times=frames.map(frame=>Number(frame.best_effort_timestamp_time));
  if(!times.length || times.some(t=>!Number.isFinite(t))) throw new Error('无法取得完整源帧时间戳');
  let error=0;
  for(let i=0;i<times.length;i++) error=Math.max(error,Math.abs(times[i]-i/expected.fps));
  if(error>0.000002) throw new Error('原片不符合声明的零起点 CFR 帧网格；拒绝对 VFR、非零 PTS 或不同帧率近似');
  if(times.length!==expected.frameCount || video.width!==expected.width || video.height!==expected.height) throw new Error('原片尺寸/解码帧数与数据不符，可能换过素材');
  const actualEnd=Number(raw.format.duration);
  if(!Number.isFinite(actualEnd)||Math.abs(actualEnd-expected.duration)>0.001) throw new Error('原片实际总时长与数据不一致，不能以过长coverage掩盖未核对区间');
  if(expected.videoDuration!=null&&Math.abs(expected.videoDuration-times.length/expected.fps)>0.000002) throw new Error('原片视频帧时长与videoDuration不符');
  const audio=raw.streams.filter(s=>s.codec_type==='audio');
  if(Boolean(audio.length)!==expected.hasAudio) throw new Error('原片音轨与 source.hasAudio 不符');
  const rotation=Number(video.tags?.rotate ?? video.side_data_list?.find(s=>s.rotation!=null)?.rotation ?? 0);
  if(rotation%360!==0) throw new Error('素材带旋转元数据，请先规范显示方向并重新测量尺寸');
  return {width:video.width,height:video.height,frameCount:times.length,fps:expected.fps,maxGridError:error,videoDuration:times.length/expected.fps,formatDuration:Number(raw.format.duration),audio:audio.map(s=>({codec:s.codec_name,sampleRate:Number(s.sample_rate),channels:s.channels,duration:Number(s.duration),startTime:Number(s.start_time || 0)}))};
}

export function geometry(source, {panelPx, font}={}) {
  const factor=Math.min(1,1920/source.width,1080/source.height);
  const w=Math.max(2,Math.ceil(source.width*factor/2)*2), h=Math.max(2,Math.ceil(source.height*factor/2)*2);
  const wide=source.width>=source.height;
  const extra=Math.ceil(Number(panelPx || (wide?h*0.9:w*2))/2)*2;
  const textSize=Number(font || (wide?26:22));
  if(!Number.isFinite(extra)||extra<360||extra>2400 || !Number.isFinite(textSize)||textSize<18||textSize>48) throw new Error('面板尺寸须在360–2400像素、正文在18–48像素；不得通过不可读的小字规避溢出');
  return {orientation:wide?'vertical-stack':'horizontal-stack',video:{width:w,height:h},panel:{width:wide?w:extra,height:wide?extra:h},output:{width:wide?w:w+extra,height:wide?h+extra:h},font:textSize};
}

export function inputSnapshot(studyFile, videoFile, study) {
  const paths=[resolve(studyFile),resolve(videoFile)];
  for(const shot of study.shots) if(shot.frames?.in) paths.push(resolve(dirname(studyFile),shot.frames.in));
  return [...new Set(paths)].map(file=>{
    if(!existsSync(file)) throw new Error('声明的输入文件不存在：'+file);
    return {file,sha256:fileDigest(file)};
  });
}

export function verifySnapshot(snapshot) {
  for(const item of snapshot) if(!existsSync(item.file)||fileDigest(item.file)!==item.sha256) throw new Error('输入或面板已变化，必须重新导出：'+item.file);
}
