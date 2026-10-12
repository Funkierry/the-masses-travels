// Renders cover.html to a PNG at an exact size.
// usage: node cover.mjs <out.png> <background frame> <width> <height> [query string for cover.html]
import { launch } from './cdp.mjs';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const [out,bg,w,h,extra='']=process.argv.slice(2);
const TMP=tmpdir().split(String.fromCharCode(92)).join('/')+'/masses-demo/';mkdirSync(TMP,{recursive:true});rmSync(TMP+'cover-profile',{recursive:true,force:true});
const fileUrl=p=>'file:///'+path.resolve(p).split(String.fromCharCode(92)).join('/');
const cdp=await launch({profile:TMP+'cover-profile',port:9336});
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:+w,height:+h,deviceScaleFactor:1,mobile:false});
const loaded=new Promise(r=>cdp.on('Page.loadEventFired',r));
// A background ending in .svg is a plate for the minimal template (cover-min.html).
const tpl=bg.endsWith('.svg')?'cover-min.html':'cover.html',key=bg.endsWith('.svg')?'svg':'bg';
await cdp.send('Page.navigate',{url:`${fileUrl(new URL(tpl,import.meta.url).pathname.slice(1))}?${key}=${encodeURIComponent(fileUrl(bg))}&${extra}`});
await loaded;await new Promise(r=>setTimeout(r,1500));
const s=await cdp.send('Page.captureScreenshot',{format:'png'});writeFileSync(out,Buffer.from(s.data,'base64'));
console.log('cover',out,w+'×'+h);cdp.proc.kill();process.exit(0);
