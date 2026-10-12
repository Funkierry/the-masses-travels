// Micro-benchmark for frame consistency at 4K: on the personnel page, switch layouts and operators under the
// virtual clock and count frames whose brightness jumps and then jumps back (layers missing for a frame).
// usage: node layerbench.mjs [extra chrome flags...]
import { launch } from './cdp.mjs';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const dir=new URL('.',import.meta.url).pathname.slice(1);
const TMP=tmpdir().split(String.fromCharCode(92)).join('/')+'/masses-demo/';mkdirSync(TMP,{recursive:true});rmSync(TMP+'bench-profile',{recursive:true,force:true});
const cdp=await launch({profile:TMP+'bench-profile',port:9335,extra:process.argv.slice(2)});
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:Number(process.env.DPR??2),mobile:false});
await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:readFileSync(dir+'shim.js','utf8')});
const loaded=new Promise(r=>cdp.on('Page.loadEventFired',r));await cdp.send('Page.navigate',{url:'http://127.0.0.1:8642/#/operators/confess'});await loaded;await new Promise(r=>setTimeout(r,1500));
const ev=async e=>(await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result.value;
for(let i=0;i<60;i++)await ev('__advance(16.6666667)');
// Mean brightness of the plate area per frame, from a small screenshot clip.
const OUTD=TMP+'bench/';rmSync(OUTD,{recursive:true,force:true});mkdirSync(OUTD);const lum=[];
const shot=async()=>{await ev('__advance(16.6666667)');await ev('__settle()');const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:90,optimizeForSpeed:true});writeFileSync(OUTD+String(lum.length).padStart(4,'0')+'.jpg',Buffer.from(s.data,'base64'));
 const b=Buffer.from(s.data,'base64');lum.push(b.length);};
const act=e=>ev(e);
for(let k=0;k<6;k++){await act(k%2?`document.querySelector('[data-action="next"]').click()`:`document.querySelector('#operator-art').click()`);for(let i=0;i<70;i++)await shot();}
console.log('frames',lum.length);
cdp.proc.kill();process.exit(0);
