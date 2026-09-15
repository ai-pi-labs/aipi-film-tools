import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// An isolated, temporary Chrome target used only as a local static image renderer.
// Device metrics are explicit: desktop window chrome does not determine the canvas.
export async function openCanvas(binary, work) {
  if(typeof WebSocket==='undefined') throw new Error('独立浏览器连接需要 Node.js 22 或更新版本');
  const process=spawn(binary,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0',`--user-data-dir=${join(work,'browser-profile')}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
  const endpoint=await new Promise((accept,reject)=>{
    let text='';const timer=setTimeout(()=>{process.kill();reject(new Error('独立浏览器启动超时'));},15000);
    process.stderr.on('data',chunk=>{text+=chunk.toString();const hit=/DevTools listening on (ws:\/\/\S+)/.exec(text);if(hit){clearTimeout(timer);accept(hit[1]);}});
    process.once('error',error=>{clearTimeout(timer);reject(error);});
  });
  const socket=new WebSocket(endpoint);await new Promise((accept,reject)=>{socket.addEventListener('open',accept,{once:true});socket.addEventListener('error',reject,{once:true});});
  let next=0,session;const pending=new Map();
  socket.addEventListener('message',event=>{const reply=JSON.parse(event.data),job=pending.get(reply.id);if(!job)return;pending.delete(reply.id);clearTimeout(job.timer);reply.error?job.reject(new Error(JSON.stringify(reply.error))):job.accept(reply.result);});
  const call=(method,params={},page=true)=>new Promise((accept,reject)=>{
    const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(new Error('浏览器操作超时：'+method));},15000);
    pending.set(id,{accept,reject,timer});socket.send(JSON.stringify({id,method,params,...(page?{sessionId:session}:{})}));
  });
  const target=await call('Target.createTarget',{url:'about:blank'},false);
  session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId;
  const evaluate=async expression=>{const answer=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(answer.exceptionDetails)throw new Error(JSON.stringify(answer.exceptionDetails));return answer.result.value;};
  return {
    async capture(file,width,height) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await call('Page.navigate',{url:pathToFileURL(file).href});
      await evaluate(`new Promise((accept,reject)=>{let count=0;function ready(){const audit=document.querySelector('#audit');if(document.readyState==='complete'&&audit?.textContent){document.fonts.ready.then(accept);return;}if(++count>200){reject(Error('信息卡未完成测量'));return;}setTimeout(ready,20);}ready();})`);
      const audit=await evaluate("JSON.parse(document.querySelector('#audit').textContent)");
      const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      return {audit,png:Buffer.from(image.data,'base64')};
    },
    async close() {
      for(const job of pending.values())clearTimeout(job.timer);pending.clear();socket.close();
      if(process.exitCode!==null)return;
      await new Promise(accept=>{const timer=setTimeout(()=>{process.kill('SIGKILL');accept();},2000);process.once('exit',()=>{clearTimeout(timer);accept();});process.kill('SIGTERM');});
      process.stderr.destroy();
    }
  };
}
