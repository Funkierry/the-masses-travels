// Still screenshots of site pages for review. usage: node shots.mjs <outdir> <width> <height> <hash>...
import { launch } from './cdp.mjs';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
const [outdir,w,h,...hashes]=process.argv.slice(2);mkdirSync(outdir,{recursive:true});
const TMP=tmpdir().split(String.fromCharCode(92)).join('/')+'/masses-demo/';rmSync(TMP+'shots-profile',{recursive:true,force:true});
const cdp=await launch({profile:TMP+'shots-profile',port:9337});await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:+w,height:+h,deviceScaleFactor:1,mobile:+w<700});
for(const [i,hash] of hashes.entries()){
 const loaded=new Promise(r=>cdp.on('Page.loadEventFired',r));await cdp.send('Page.navigate',{url:`http://127.0.0.1:8642/?still&n=${i}${hash==="home"?"":"#/"+hash}`});await loaded;await new Promise(r=>setTimeout(r,3000));
 const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:88});writeFileSync(`${outdir}/${String(i).padStart(2,'0')}-${hash.replace(/\W+/g,'_')}.jpg`,Buffer.from(s.data,'base64'));
}
cdp.proc.kill();process.exit(0);
