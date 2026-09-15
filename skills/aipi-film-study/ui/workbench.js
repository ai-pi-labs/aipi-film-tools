// AIπ｜AI圆周派. Native browser controls and a source-timed document model.
(() => {
  'use strict';
  const study = JSON.parse(document.getElementById('study-data').textContent);
  const view = JSON.parse(document.getElementById('view-options').textContent);
  const $ = id => document.getElementById(id);
  const media = $('source-video'), tableScroll = $('shot-table-scroll');
  const shots = study.shots, cues = study.dialogue || [], source = study.source || {};
  const rows = new Map([...document.querySelectorAll('tr[data-shot-id]')].map(el => [el.dataset.shotId,el]));
  const cuts = new Map([...document.querySelectorAll('[data-cut]')].map(el => [el.dataset.cut,el]));
  const cueTemplates = new Map([...document.querySelectorAll('.transcript-event [data-cue]')].map(el => [el.dataset.cue,el]));
  const labels = { intention:'人物意图', emotion:'情绪变化', blocking:'调度与空间', edit:'剪辑判断', reshoot:'复拍建议' };
  const format = value => { const n=Math.max(0,Number(value)||0); return `${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(2).padStart(5,'0')}`; };
  const overlaps = (a,b,last=false) => Math.min(last?Math.max(a.end,source.duration||0):a.end,b.end)-Math.max(a.start,b.start)>.000001;
  const shotCues = new Map(shots.map((s,index) => [s.id,cues.filter(c => overlaps(s,c,index===shots.length-1))]));
  const searchText = new Map(shots.map(s => [s.id,JSON.stringify([s,shotCues.get(s.id)]).normalize('NFKC').toLocaleLowerCase()]));
  let currentIndex=-1, following=true, requestedTime=null, lastCueKey=null, frameRequest=null, frameApi=null, toastTimer;
  let selectedTab='dialogue', inspectorOpen=true;
  const icon = (name) => name === 'pause' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4Z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7Z"/></svg>';
  const notify = message => { clearTimeout(toastTimer); $('notification').textContent=message; $('notification').hidden=false; toastTimer=setTimeout(()=>$('notification').hidden=true,3200); };
  function indexAt(time) {
    if (!Number.isFinite(time)) return -1;
    let low=0, high=shots.length;
    while (low<high) { const mid=Math.floor((low+high)/2); if (shots[mid].start<=time+.000001) low=mid+1; else high=mid; }
    const index=low-1;
    if (index<0) return -1;
    const shot=shots[index];
    if (time<shot.end) return index;
    if (index===shots.length-1 && time<=Math.max(view.duration,shot.end)+.15) return index;
    return -1;
  }
  function firstFrameTime(shot) {
    // Measured PTS supports both CFR and VFR without estimating a frame grid.
    const measured=source.frameTimes?.[shot.startFrame],next=source.frameTimes?.[shot.startFrame+1];
    if(Number.isFinite(measured)&&Number.isFinite(next)&&next>measured&&Math.abs(measured-shot.start)<.00001)
      return shot.start+Math.min(.001,(next-measured)/4,(shot.end-shot.start)/4);
    const fps=Number(source.fps);
    const verified=source.timing==='cfr' && fps>0 && Number.isInteger(shot.startFrame)
      && Math.abs(shot.start-shot.startFrame/fps)<.00001;
    return shot.start+(verified ? Math.min(.001,1/(fps*4),(shot.end-shot.start)/4) : 0);
  }
  function setFollowing(enabled) {
    following=enabled;
    $('follow').setAttribute('aria-pressed',String(enabled));
    $('follow').querySelector('small').textContent=enabled?'开启':'已暂停';
    $('follow-description').textContent=enabled?'播放换镜时自动定位；手动滚动可暂停跟随。':'自由阅读中 · 点击“跟随播放”恢复自动定位。';
    if (enabled) locate(false);
  }
  function locate(explicit=true) {
    const row=rows.get(shots[currentIndex]?.id);
    if (!row || row.hidden) { if(explicit) notify('当前镜头不在搜索结果中；右侧仍可查看本镜全文。'); return; }
    const header=document.querySelector('.shot-table thead');
    const stickyHeight=getComputedStyle(header).display==='none'?0:header.getBoundingClientRect().height;
    const top=tableScroll.scrollTop+row.getBoundingClientRect().top-tableScroll.getBoundingClientRect().top-stickyHeight-5;
    tableScroll.scrollTo({top:Math.max(0,top),behavior:'instant'});
  }
  function copyCue(cue,shot) {
    const clone=cueTemplates.get(cue.id)?.cloneNode(true);
    if (!clone) return document.createTextNode(cue.text || '');
    if(shot && cue.start<shot.start-.000001){const label=document.createElement('span');label.className='continuation';label.textContent='跨镜延续';clone.querySelector('.cue-byline').append(label);}
    return clone;
  }
  function drawDirector(shot) {
    const list=document.createElement('dl');list.className='director-fields';
    for(const [key,label] of Object.entries(labels)){
      const group=document.createElement('div'),term=document.createElement('dt'),text=document.createElement('dd');
      if(key==='reshoot')group.className='reshoot-field';term.textContent=label;text.textContent=shot.director?.[key]||'未填写';group.append(term,text);list.append(group);
    }
    $('director-content').replaceChildren(list);
  }
  function showShot(index) {
    if(index===currentIndex)return;
    if(currentIndex>=0){const oldId=shots[currentIndex].id;rows.get(oldId)?.classList.remove('is-active');rows.get(oldId)?.removeAttribute('aria-current');cuts.get(oldId)?.classList.remove('active-cut');}
    currentIndex=index;
    if(index<0){$('active-shot').textContent='—';return;}
    const shot=shots[index], row=rows.get(shot.id), inShot=shotCues.get(shot.id);
    row?.classList.add('is-active');row?.setAttribute('aria-current','true');cuts.get(shot.id)?.classList.add('active-cut');
    $('active-shot').textContent=shot.id;
    $('active-shot-meta').textContent=`${shot.size || '待标景别'} · ${(shot.end-shot.start).toFixed(2)}s`;
    $('previous-shot').disabled=index===0;$('next-shot').disabled=index===shots.length-1;
    $('shot-cue-count').textContent=`${inShot.length} 条`;
    $('shot-cues').replaceChildren(...inShot.map(c=>copyCue(c,shot)));
    if(!inShot.length){const p=document.createElement('p');p.className='empty-language';p.textContent='本镜没有已确认的语言条目，不能据此判定无对白。';$('shot-cues').append(p);}
    const sound=row?.querySelector('.sound-note');$('shot-sound').replaceChildren(...(sound?[sound.cloneNode(true)]:[]));
    drawDirector(shot);$('dialogue-panel').scrollTop=0;$('director-panel').scrollTop=0;
    if(following)locate(false);
  }
  function showLiveCues(time) {
    const active=cues.filter(c=>c.start<=time && time<c.end), signature=active.map(c=>c.id).join('|');
    if(signature===lastCueKey)return;
    lastCueKey=signature;
    $('live-dialogue').replaceChildren(...active.map(c=>copyCue(c)));
    if(!active.length){const p=document.createElement('p');p.className='empty-language';p.textContent='此刻没有已确认的语言条目';$('live-dialogue').append(p);}
    for(const item of document.querySelectorAll('.shot-dialogue .is-speaking'))item.classList.remove('is-speaking');
    for(const cue of active){for(const row of rows.values()){const matching=[...row.querySelectorAll('[data-cue]')].find(el=>el.dataset.cue===cue.id);matching?.classList.add('is-speaking');}}
  }
  function paint(time) {
    showShot(indexAt(time));showLiveCues(time);
    $('clock').replaceChildren(document.createTextNode(format(time)+' '));
    const total=document.createElement('span');total.textContent='/ '+format(view.duration);$('clock').append(total);
    if(document.activeElement!==$('seek'))$('seek').value=String(Math.min(view.duration,Math.max(0,time)));
    $('seek').setAttribute('aria-valuetext',`${format(time)}，总时长${format(view.duration)}`);
    $('playhead').setAttribute('x1',String(time));$('playhead').setAttribute('x2',String(time));
  }
  function applyRequested() {
    if(requestedTime==null || media.readyState<1)return;
    try { media.currentTime=requestedTime; requestedTime=null; } catch (_) { /* metadata event retries */ }
  }
  function seekTime(time) {
    requestedTime=Math.max(0,Math.min(view.duration,Number(time)||0));paint(requestedTime);applyRequested();
  }
  function jumpTo(id) {
    const index=shots.findIndex(s=>s.id===id);if(index<0)return;
    seekTime(firstFrameTime(shots[index]));
    history.replaceState(null,'',`#${encodeURIComponent(id)}`);
    if(following)locate(false);
  }
  function changePlayState() {
    $('toggle-play').innerHTML=icon(media.paused?'play':'pause');
    $('toggle-play').setAttribute('aria-label',media.paused?'播放':'暂停');
  }
  async function togglePlay(){if(media.paused){try{await media.play();}catch(error){notify('视频暂时无法播放，请检查原片路径。');}}else media.pause();}
  function stopFrameUpdates(){if(frameRequest!=null){if(frameApi==='video')media.cancelVideoFrameCallback(frameRequest);else cancelAnimationFrame(frameRequest);}frameRequest=null;}
  function scheduleFrame(){
    stopFrameUpdates();if(media.paused || media.ended)return;
    if(typeof media.requestVideoFrameCallback==='function'){frameApi='video';frameRequest=media.requestVideoFrameCallback((_,frame)=>{frameRequest=null;paint(frame.mediaTime);scheduleFrame();});}
    else{frameApi='animation';frameRequest=requestAnimationFrame(()=>{frameRequest=null;paint(media.currentTime);scheduleFrame();});}
  }
  function openInspector(open){inspectorOpen=open;$('monitor-area').classList.toggle('inspector-hidden',!open);$('inspector-toggle').setAttribute('aria-expanded',String(open));$('inspector-toggle').textContent=open?'收起详读':'展开对白 / 导演';}
  function setTab(tab,focus=false){selectedTab=tab;openInspector(true);for(const kind of ['dialogue','director']){$(`tab-${kind}`).setAttribute('aria-selected',String(kind===tab));$(`tab-${kind}`).tabIndex=kind===tab?0:-1;$(`${kind}-panel`).hidden=kind!==tab;}if(focus)$(`tab-${tab}`).focus();}
  function filterShots(){const query=$('search-shots').value.trim().normalize('NFKC').toLocaleLowerCase();let count=0;for(const [id,row]of rows){row.hidden=!searchText.get(id).includes(query);if(!row.hidden)count++;}$('result-count').textContent=query?`${count} / ${shots.length} 镜`:`${shots.length} 镜`;$('no-results').hidden=count>0;tableScroll.scrollTop=0;}
  function openDialog(id){$(id).showModal();}
  $('toggle-play').addEventListener('click',togglePlay);
  $('previous-shot').addEventListener('click',()=>jumpTo(shots[Math.max(0,currentIndex-1)].id));
  $('next-shot').addEventListener('click',()=>jumpTo(shots[Math.min(shots.length-1,currentIndex+1)].id));
  $('seek').addEventListener('input',event=>seekTime(Number(event.target.value)));
  $('speed').addEventListener('change',event=>media.playbackRate=Number(event.target.value));
  $('mute').addEventListener('click',()=>{media.muted=!media.muted;$('mute').setAttribute('aria-pressed',String(media.muted));$('mute').setAttribute('aria-label',media.muted?'取消静音':'静音');$('mute').style.color=media.muted?'var(--accent)':'';});
  $('fullscreen').addEventListener('click',async()=>{try{if(media.requestFullscreen)await media.requestFullscreen();else if(media.webkitEnterFullscreen)media.webkitEnterFullscreen();else notify('此浏览器暂不支持全屏。');}catch(_){notify('暂时无法进入全屏。');}});
  $('follow').addEventListener('click',()=>setFollowing(!following));$('locate-current').addEventListener('click',()=>locate(true));
  $('search-shots').addEventListener('input',filterShots);$('clear-search').addEventListener('click',()=>{$('search-shots').value='';filterShots();$('search-shots').focus();});
  $('inspector-toggle').addEventListener('click',()=>openInspector(!inspectorOpen));$('inspector-close').addEventListener('click',()=>openInspector(false));
  for(const kind of ['dialogue','director'])$(`tab-${kind}`).addEventListener('click',()=>setTab(kind));
  document.querySelector('.inspector-tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setTab(selectedTab==='dialogue'?'director':'dialogue',true);}});
  for(const [button,dialog]of [['review-open','review-dialog'],['help-open','help-dialog'],['transcript-open','transcript-dialog']])$(button).addEventListener('click',()=>openDialog(dialog));
  for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});}
  document.addEventListener('click',event=>{
    const jump=event.target.closest('[data-jump]');if(jump){jumpTo(jump.dataset.jump);return;}
    const director=event.target.closest('[data-director]');if(director){jumpTo(director.dataset.director);setTab('director');return;}
    const frame=event.target.closest('[data-frame-url]');if(frame){$('enlarged-frame').src=frame.dataset.frameUrl;$('enlarged-frame').alt=frame.dataset.frameLabel;$('frame-title').textContent=frame.dataset.frameLabel;openDialog('frame-dialog');return;}
    const cue=event.target.closest('[data-cue-time]');if(cue){$('transcript-dialog').close();seekTime(Number(cue.dataset.cueTime));}
  });
  for(const type of ['wheel','touchmove'])tableScroll.addEventListener(type,()=>setFollowing(false),{passive:true});
  tableScroll.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))setFollowing(false);});
  document.addEventListener('keydown',event=>{
    if(event.metaKey||event.ctrlKey||event.altKey||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable]'))return;
    if(event.key==='/' ){event.preventDefault();$('search-shots').focus();return;}
    if(event.key.toLowerCase()==='f'){event.preventDefault();setFollowing(!following);return;}
    if(event.key.toLowerCase()==='g'){event.preventDefault();locate(true);return;}
    if(event.key.toLowerCase()==='d'){event.preventDefault();setTab('director');return;}
    if(event.key==='['||event.key===']'){event.preventDefault();const next=Math.min(shots.length-1,Math.max(0,currentIndex+(event.key===']'?1:-1)));jumpTo(shots[next].id);return;}
    if(event.key===' '&&!event.target.closest('button,summary')&&event.target!==tableScroll){event.preventDefault();togglePlay();}
  });
  media.addEventListener('loadedmetadata',()=>{applyRequested();$('video-message').hidden=true;});
  media.addEventListener('canplay',applyRequested);
  media.addEventListener('timeupdate',()=>paint(requestedTime??media.currentTime));
  media.addEventListener('seeking',()=>{stopFrameUpdates();paint(requestedTime??media.currentTime);});
  media.addEventListener('seeked',()=>{paint(media.currentTime);scheduleFrame();});
  media.addEventListener('play',()=>{changePlayState();scheduleFrame();});
  media.addEventListener('pause',()=>{changePlayState();stopFrameUpdates();paint(media.currentTime);});
  media.addEventListener('ended',()=>{changePlayState();stopFrameUpdates();paint(media.currentTime);});
  media.addEventListener('error',()=>{$('video-message').textContent='无法读取原片。请将视频与报告按原有目录一起打开。';$('video-message').hidden=false;});
  window.addEventListener('pagehide',stopFrameUpdates);window.addEventListener('pageshow',scheduleFrame);
  window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(rows.has(id))jumpTo(id);});
  window.addEventListener('resize',()=>{if(following)locate(false);},{passive:true});
  const reading=document.createElement('button');reading.id='reading-layout';reading.className='quiet-button';reading.textContent='表格优先';reading.setAttribute('aria-pressed','false');
  $('locate-current').after(reading);reading.addEventListener('click',()=>{const enabled=$('workbench').classList.toggle('table-priority');reading.setAttribute('aria-pressed',String(enabled));reading.textContent=enabled?'均衡布局':'表格优先';if(following)requestAnimationFrame(()=>locate(false));});
  media.controls=false;setTab('dialogue');if(matchMedia('(max-width:700px)').matches)openInspector(false);paint(0);
  const initial=decodeURIComponent(location.hash.slice(1));if(rows.has(initial))jumpTo(initial);
})();
