// Minimal Chrome DevTools Protocol client over Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

export async function launch({ port=9333, profile, gpu=true }={}){
 const exe='C:/Program Files/Google/Chrome/Application/chrome.exe';
 const args=['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--hide-scrollbars','--mute-audio','--no-first-run','--window-size=1920,1080',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-color-profile=srgb','--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion',
  ...(gpu?['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--enable-unsafe-webgpu']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),'about:blank'];
 const proc=spawn(exe,args,{stdio:'ignore'});
 let list;for(let i=0;i<80;i++){try{list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(list.length)break;}catch{}await sleep(250);}
 const page=list.find(t=>t.type==='page');const cdp=await connect(page.webSocketDebuggerUrl);cdp.proc=proc;return cdp;
}
export function connect(url){
 return new Promise((ok,fail)=>{const ws=new WebSocket(url);let id=0;const wait=new Map(),handlers=new Map();
  const api={send:(method,params={})=>new Promise((res,rej)=>{const i=++id;wait.set(i,{res,rej,method});ws.send(JSON.stringify({id:i,method,params}));}),
   on:(ev,fn)=>{(handlers.get(ev)??handlers.set(ev,[]).get(ev)).push(fn);},close:()=>ws.close()};
  ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id){const w=wait.get(d.id);wait.delete(d.id);d.error?w.rej(new Error(`${w.method}: ${d.error.message}`)):w.res(d.result);}else for(const fn of handlers.get(d.method)??[])fn(d.params);};
  ws.onopen=()=>ok(api);ws.onerror=e=>fail(e);});
}
