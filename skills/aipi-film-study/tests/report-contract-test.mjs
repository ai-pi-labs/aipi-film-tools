#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { renderReport, overlapping } from '../scripts/report.mjs';

const study={schema:'aipi.film-study/v1',title:'契约边界',source:{file:'source.mp4',duration:2.2,videoDuration:2,timing:'vfr',timeOrigin:0,frameTimes:[0,.037,.111,1,2]},shots:[
  {id:'T1',start:0,end:1,startFrame:0,endFrame:3,sound:{status:'pending'}},
  {id:'T2',start:1,end:2,startFrame:3,endFrame:4,sound:{status:'non-speech',note:'经核对为非语言声音'}}
],dialogue:[
  {id:'TAIL',start:2,end:2.15,speaker:'画外人声',text:'片尾声音完整保留',source:'audio',status:'verified'},
  {id:'UNKNOWN',start:1.2,end:1.4,speaker:'未知',text:'来源不明的条目',source:'unknown',status:'verified'}
],review:{audio:{state:'reviewed'}}};
const snapshot=JSON.stringify(study);
assert.deepEqual(overlapping(study.shots[0],study.dialogue,study.source,false),[]);
assert.deepEqual(overlapping(study.shots[1],study.dialogue,study.source,true).map(c=>c.id),['TAIL','UNKNOWN']);
assert.equal(overlapping(study.shots[1],[{start:.9999995,end:1.0000005}]).length,0,'Microsecond rounding does not create a false overlap');
const html=renderReport(study);
const row=html.slice(html.indexOf('id="shot-T2"'),html.indexOf('</tr>',html.indexOf('id="shot-T2"')));
assert(row.includes('片尾声音完整保留'),'Audio tail is present in the final table row');
assert(row.includes('已核对 · 非语言声音'),'Contract non-speech status is readable');
assert(row.includes('来源未标'),'Unknown source is not upgraded into subtitle/audio proof');
assert(!row.includes('字幕与声音已核'),'Unknown source never claims dual verification');
assert(html.match(/id="review-open">.*?声音待核/),'Legacy reviewed state does not claim full audio completion');
const complete=structuredClone(study);complete.review.audio.state='complete';
assert(renderReport(complete).match(/id="review-open">.*?声音审核完成/));
assert.equal(JSON.stringify(study),snapshot,'Render does not change exact VFR times or annotations');
const offset=structuredClone(study);offset.source.timeOrigin=5;
assert.throws(()=>renderReport(offset),/非零起始 PTS/,'Nonzero PTS is rejected explicitly before creating a misleading player');
const client=readFileSync(new URL('../ui/workbench.js',import.meta.url),'utf8');
const seekCode=client.slice(client.indexOf('  function firstFrameTime('),client.indexOf('  function setFollowing('));
const seekFor=source=>vm.runInNewContext(`const source=${JSON.stringify(source)};${seekCode};firstFrameTime`);
const measured=seekFor(study.source);
assert.equal(measured({start:.037,end:.111,startFrame:1}),.038,'VFR seek stays inside the measured first frame');
const noMeasurements=seekFor({timing:'vfr',fps:24});
assert.equal(noMeasurements({start:.037,end:.111,startFrame:1}),.037,'VFR without measured next PTS never snaps to average fps');
const tinyFrame=seekFor({timing:'vfr',frameTimes:[0,.0002,.01]});
assert.equal(tinyFrame({start:0,end:.0002,startFrame:0}),.00005,'Interior offset cannot skip an extremely short frame');
console.log('AIπ report contract checks passed: audio tail, half-open overlap tolerance, non-speech, honest source labels, completion state, exact data retention and explicit nonzero-PTS rejection.');
