#!/usr/bin/env node
// Independent real-media fixtures for the AIπ engine; no previous implementation is imported.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStudy, extractFrames, fileHash, mappedStudy, overlappingDialogue, probeMedia, recutStudy, srtText, csvText, validateStudy } from './engine.mjs';

const argument = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const work = resolve(argument('--out') || mkdtempSync(join(tmpdir(), 'aipi-engine-test-')));
mkdirSync(work, { recursive: true });
const checks = [], check = (name, callback) => { callback(); checks.push(name); console.log(`PASS ${name}`); };
const call = (bin, args) => execFileSync(bin, args, { maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const video = join(work, "色块'原片.mp4");
call('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=192x108:r=24:d=3', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=3',
  '-vf', "drawbox=c=blue:t=fill:enable='eq(n,24)',drawbox=c=green:t=fill:enable='gte(n,25)*lt(n,71)',drawbox=c=white:t=fill:enable='eq(n,71)'",
  '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', video]);
const source = probeMedia(video);
check('probe obtains all 72 actual frames and exact one-frame boundaries', () => {
  assert.equal(source.frameCount, 72); assert.equal(source.frameTimes.length, 73); assert.equal(source.timing, 'cfr');
  assert.equal(source.hasAudio, true); assert.equal(source.timeOrigin, 0); assert(Math.abs(source.frameTimes[25] - 25 / 24) < 1e-10);
  assert.equal(source.sha256, fileHash(video));
});
const rawDetection = detectStudy(video);
check('detection returns measured pending candidates and does not claim complete shot discovery', () => {
  assert.deepEqual(rawDetection.shots.map(s => [s.startFrame, s.endFrame]), [[0, 24], [24, 71], [71, 72]]);
  assert(rawDetection.shots.every(s => s.description === '' && s.sound.status === 'pending'));
  assert.equal(rawDetection.review.audio.state, 'not-reviewed');
  assert.equal(rawDetection.detection.reviewed, false);
});
// The constructed fixture has another cut at frame 25. Consecutive equal-contrast
// transitions can escape FFmpeg's scene metric: review and an exact recut are required.
const detected = recutStudy(rawDetection, { splits: [25 / 24] });

let study = structuredClone(detected);
study.source.file = video;
study.dialogue = [
  { id: 'D01', start: .2, end: .4, speaker: '甲', text: '首句完整，带逗号和“引号”。', type: 'dialogue', source: 'audio', status: 'verified' },
  { id: 'D02', start: .9, end: 1.1, speaker: '乙', text: '这一整句跨过单帧镜头，全文不能剪掉。', type: 'voiceover', source: 'audio', status: 'verified' },
  { id: 'D03', start: 1.6, end: 1.7, speaker: '甲', text: '嗯。', type: 'dialogue', source: 'audio', status: 'verified' },
  { id: 'D04', start: 2.9, end: 3, speaker: '唱者', text: '片尾字幕大意保持到最后。', type: 'subtitle-meaning', source: 'subtitle', status: 'verified', rawSubtitle: '片尾字幕大意保持到最后。' },
];
study = mappedStudy(study);
check('more than one cue per shot, cross-cut full text, short reply and tail are mapped', () => {
  assert.deepEqual(study.shots.map(s => s.dialogueIds), [['D01', 'D02'], ['D02'], ['D02', 'D03', 'D04'], ['D04']]);
  const csv = csvText(study), srt = srtText(study);
  assert.equal(csv.split(study.dialogue[1].text).length - 1, 3);
  for (const cue of study.dialogue) assert.equal(srt.split(cue.text).length - 1, 1);
  assert(srt.includes('【原字幕大意】')); assert(srt.includes('00:00:02,900 --> 00:00:03,000'));
  assert(csv.includes('↳（跨镜全文）乙：')); assert(csv.includes('复拍建议'));
  assert.equal(validateStudy(study).ok, true);
});
check('microsecond subtitle rounding cannot invent a cross-cut overlap', () => {
  const c = { ...study.dialogue[0], start: 24 / 24 - 0.0000004, end: 25 / 24 };
  assert.equal(overlappingDialogue({ dialogue: [c] }, study.shots[0]).length, 0);
});

const extracted = extractFrames(study, video, join(work, "关键'帧"), { studyOut: join(work, 'study.frames.json') });
study = extracted.study;
const pixel = file => {
  const data = call('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', 'scale=1:1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  return [...data.subarray(0, 3)];
};
const color = file => { const [r, g, b] = pixel(file); return r > 220 && g > 220 && b > 220 ? 'white' : b > r + 50 && b > g + 50 ? 'blue' : r > g + 50 && r > b + 50 ? 'red' : g > r + 40 && g > b + 40 ? 'green' : 'unknown'; };
check('real extraction yields correct first/last colors and identical single-frame A/B images', () => {
  assert.equal(extracted.count, 8);
  for (const [i, expected] of ['red', 'blue', 'green', 'white'].entries()) for (const role of ['in', 'out']) assert.equal(color(resolve(work, study.shots[i].frames[role])), expected);
  assert.equal(fileHash(resolve(work, study.shots[1].frames.in)), fileHash(resolve(work, study.shots[1].frames.out)));
  assert.equal(fileHash(resolve(work, study.shots[3].frames.in)), fileHash(resolve(work, study.shots[3].frames.out)));
  assert.equal(validateStudy(study, { baseDir: work, checkAssets: true }).ok, true);
});
check('production rejects pending source analysis even though frames and cues are complete', () => {
  const v = validateStudy(study, { production: true, baseDir: work });
  assert.equal(v.ok, false); assert(v.errors.some(e => e.includes('声音仍待核'))); assert(v.errors.some(e => e.includes('画面')));
});
for (const s of study.shots) { s.sound = { status: 'reviewed', note: '合成测试数据，验证字段规则，并非真人对白听核。' }; s.description = '合成纯色画面。'; s.size = '全景'; s.camera = '固定'; }
study.review = { visual: { state: 'reviewed', notes: '人工定义的四色测试帧。' }, audio: { state: 'complete', openIssues: [],
  coverage: [{ start: 0, end: source.duration, method: 'Synthetic regression declaration', notes: 'Test-only audit metadata; generated sine tone and invented text are deliberately separate.', audioChecked: true }] } };
check('a complete fixture can pass while optional director fields stay optional', () => assert.equal(validateStudy(study, { production: true, baseDir: work }).ok, true));
check('OCR-only evidence, uncertainty, omissions and false silence are blocked independently', () => {
  const variants = [
    d => { delete d.review.audio.coverage[0].audioChecked; },
    d => { d.dialogue[2].status = 'uncertain'; d.dialogue[2].notes = '短应答仍待核'; },
    d => { d.shots[2].dialogueIds = d.shots[2].dialogueIds.filter(id => id !== 'D03'); },
    d => { d.shots[1].sound.status = 'non-speech'; },
    d => { d.review.audio.coverage[0].end = 2.9; },
    d => { d.source.hasAudio = false; d.dialogue.forEach(c => { c.source = 'subtitle'; }); d.review.audio.coverage[0].subtitlesChecked = true; },
    d => { d.shots[0].description = ''; },
    d => { d.source.duration += 20; d.review.audio.coverage[0].end = d.source.duration; },
  ];
  for (const mutate of variants) { const candidate = structuredClone(study); mutate(candidate); assert.equal(validateStudy(candidate, { production: true, baseDir: work }).ok, false); }
});
check('an empty transcript cannot pass by changing every shot to reviewed or silence', () => {
  let candidate = structuredClone(study); candidate.dialogue = []; candidate = mappedStudy(candidate);
  assert.equal(validateStudy(candidate, { production: true, baseDir: work }).ok, false);
  for (const s of candidate.shots) s.sound.status = 'non-speech';
  assert.equal(validateStudy(candidate, { production: true, baseDir: work }).ok, false);
  candidate.review.audio.coverage[0].result = 'non-speech';
  assert.equal(validateStudy(candidate, { production: true, baseDir: work }).ok, true);
});
check('audio after the final video frame still appears in the final row', () => {
  const candidate = structuredClone(study); candidate.source.duration = 3.1;
  candidate.dialogue.push({ ...candidate.dialogue[0], id: 'TAIL', start: 3.02, end: 3.09, text: '音轨尾句' });
  const mapped = mappedStudy(candidate);
  assert(mapped.shots.at(-1).dialogueIds.includes('TAIL')); assert(csvText(mapped).includes('音轨尾句')); assert(srtText(mapped).includes('音轨尾句'));
});
check('stale frame bytes fail the frame manifest check', () => {
  const file = resolve(work, study.shots[0].frames.in), bytes = readFileSync(file);
  appendFileSync(file, Buffer.from('stale'));
  try { assert.equal(validateStudy(study, { baseDir: work, checkAssets: true }).ok, false); }
  finally { writeFileSync(file, bytes); }
});
check('stale source identity is blocked before extraction', () => {
  const candidate = structuredClone(study); candidate.source.sha256 = '0'.repeat(64);
  assert.throws(() => extractFrames(candidate, video, join(work, 'must-not-extract')), /SHA-256/);
});
check('recut re-aligns full cues, clears changed observation and rejects arbitrary seconds', () => {
  const changed = recutStudy(study, { merges: [25 / 24], splits: [.5] });
  assert.equal(changed.shots.length, 4); assert.equal(changed.shots[0].description, '');
  assert.equal(changed.shots[2].sound.status, 'pending'); assert.deepEqual(changed.shots[2].dialogueIds, ['D02', 'D03', 'D04']);
  assert.equal(changed.assets, undefined); assert.equal(srtText(changed), srtText(study));
  assert.throws(() => recutStudy(study, { splits: [.501] }), /真实帧边界/);
});
check('recut exposes old/new identifiers and prevents director references silently drifting', () => {
  const candidate = structuredClone(study); candidate.shots[3].director = { edit: '承接 S03；与 S01 呼应。' };
  const changed = recutStudy(candidate, { splits: [.5] });
  assert.deepEqual(changed.recut.oldToNew.S01, ['S01', 'S02']);
  assert.equal(changed.recut.referenceReview, 'pending');
  assert(changed.shots.at(-1).director.edit.includes('承接 S04'));
  assert(changed.shots.at(-1).director.edit.includes('S01（旧编号，现 S01/S02；引用范围待复核）'));
  assert.deepEqual(changed.dialogue, study.dialogue);
});

const vfrFile = join(work, 'variable.mp4');
call('ffmpeg', ['-v', 'error', '-y', '-i', video, '-an', '-vf', "select='not(eq(n,10))'", '-fps_mode', 'vfr', '-c:v', 'libx264', '-crf', '0', vfrFile]);
const vfr = probeMedia(vfrFile);
check('VFR retains the measured gap rather than substituting a frame grid', () => {
  assert.equal(vfr.timing, 'vfr'); assert.equal(vfr.frameCount, 71); assert(vfr.frameTimes[10] - vfr.frameTimes[9] > .08);
  assert(Math.abs(vfr.frameTimes[23] - 1) < 1e-10);
});
const vfrStudy = recutStudy(detectStudy(vfrFile), { splits: [25 / 24] });
const vfrFrames = extractFrames(vfrStudy, vfrFile, join(work, 'vfr-frames'), { studyOut: join(work, 'vfr.frames.json') });
check('VFR single-frame extraction uses actual frame timestamps', () => {
  assert.deepEqual(vfrStudy.shots.map(s => [s.startFrame, s.endFrame]), [[0, 23], [23, 24], [24, 70], [70, 71]]);
  assert.equal(color(resolve(work, vfrFrames.study.shots[1].frames.in)), 'blue');
  assert.equal(color(resolve(work, vfrFrames.study.shots[3].frames.out)), 'white');
});

const offsetFile = join(work, 'offset.mp4');
call('ffmpeg', ['-v', 'error', '-y', '-i', video, '-map', '0:v', '-c', 'copy', '-output_ts_offset', '5', offsetFile]);
const offsetSource = probeMedia(offsetFile), offsetStudy = recutStudy(detectStudy(offsetFile), { splits: [25 / 24] });
const offsetFrames = extractFrames(offsetStudy, offsetFile, join(work, 'offset-frames'), { studyOut: join(work, 'offset.frames.json') });
check('nonzero PTS is recorded and normalized, with correct real frame extraction', () => {
  assert.equal(offsetSource.timeOrigin, 5); assert.equal(offsetSource.frameTimes[0], 0);
  assert(Math.abs(offsetSource.videoDuration - 3) < 1e-10); assert.equal(offsetSource.frameCount, 72);
  assert.deepEqual(offsetStudy.shots.map(s => [s.startFrame, s.endFrame]), [[0, 24], [24, 25], [25, 71], [71, 72]]);
  assert.equal(color(resolve(work, offsetFrames.study.shots[1].frames.in)), 'blue');
  assert.equal(color(resolve(work, offsetFrames.study.shots[3].frames.out)), 'white');
});
const leadingAudio = join(work, 'leading-audio.mp4');
call('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', 'setpts=PTS+1/TB', '-fps_mode', 'passthrough', '-c:v', 'libx264', '-c:a', 'copy', leadingAudio]);
check('audio preceding the first video frame is explicitly rejected instead of losing its leading second', () => assert.throws(() => probeMedia(leadingAudio), /音频早于视频首帧/));
check('subtitle-only source is allowed with explicit complete subtitle review', () => {
  const d = structuredClone(offsetFrames.study);
  d.dialogue = [{ id: 'T01', start: .4, end: .8, speaker: '原字幕', text: '三年之后', type: 'dialogue', source: 'subtitle', status: 'verified' }];
  const aligned = mappedStudy(d);
  for (const s of aligned.shots) { s.description = '测试画面'; s.size = '全景'; s.camera = '固定'; s.sound = { status: s.dialogueIds.length ? 'reviewed' : 'non-speech', note: '合成测试。' }; }
  aligned.review = { visual: { state: 'reviewed' }, audio: { state: 'complete', openIssues: [], coverage: [{ start: 0, end: d.source.duration, method: 'subtitle fixture', notes: '仅字幕证据', subtitlesChecked: true }] } };
  assert.equal(validateStudy(aligned, { baseDir: work, production: true }).ok, true);
  delete aligned.review.audio.coverage[0].subtitlesChecked;
  assert.equal(validateStudy(aligned, { baseDir: work, production: true }).ok, false);
});
check('CLI failure is observable as a nonzero exit', () => {
  const cli = fileURLToPath(new URL('./engine.mjs', import.meta.url));
  assert.throws(() => call(process.execPath, [cli, 'validate', extracted.studyOut, '--production']));
  const exportFile = join(work, 'table.csv'); call(process.execPath, [cli, 'table', extracted.studyOut, '--out', exportFile]);
  assert(readFileSync(exportFile, 'utf8').includes('这一整句跨过单帧镜头，全文不能剪掉。'));
  const recutFile = join(work, 'other', 'recut.json'); call(process.execPath, [cli, 'recut', extracted.studyOut, '--split', '.5', '--out', recutFile]);
  const recut = JSON.parse(readFileSync(recutFile));
  assert.equal(resolve(dirname(recutFile), recut.source.file), video);
  assert.equal(resolve(dirname(recutFile), recut.shots.at(-1).frames.in), resolve(work, study.shots.at(-1).frames.in));
});

writeFileSync(join(work, 'verification.json'), JSON.stringify({ implementation: 'AIπ independent engine', checks, passed: checks.length,
  source: { path: video, frames: source.frameCount, duration: source.duration, sha256: source.sha256 },
  limitations: ['FFmpeg scene-score candidates missed one consecutive equal-contrast transition; a reviewed actual-frame recut restores it.', 'No ASR/OCR model is bundled.', 'Synthetic production metadata checks do not claim human transcription accuracy.', 'Browser layout and full synchronized export are outside this engine test.'] }, null, 2));
console.log(`PASS ${checks.length} independent checks; evidence ${work}`);
