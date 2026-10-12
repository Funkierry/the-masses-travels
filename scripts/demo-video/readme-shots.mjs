// README screenshots: drives the live site with real pointer input and captures each state.
// usage: node readme-shots.mjs <outdir>   (expects serve.mjs on 127.0.0.1:8642)
import { launch } from './cdp.mjs';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
const out=process.argv[2];mkdirSync(out,{recursive:true});
const TMP=tmpdir().split(String.fromCharCode(92)).join('/')+'/masses-demo/';rmSync(TMP+'readme-profile',{recursive:true,force:true});
const cdp=await launch({profile:TMP+'readme-profile',port:9338});await cdp.send('Page.enable');await cdp.send('Runtime.enable');
const W=1600,H=900;await cdp.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result.value;
const at=sel=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
const nth=(sel,i)=>ev(`(()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${i}];const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
const m=(type,x,y,o={})=>cdp.send('Input.dispatchMouseEvent',{type,x,y,button:o.b??'none',buttons:o.bs??0,clickCount:o.c??0});
async function moveTo(x,y,steps=12){for(let i=1;i<=steps;i++){await m('mouseMoved',x,y);await sleep(16);}}
async function click(x,y,c=1){await moveTo(x,y,4);await m('mousePressed',x,y,{b:'left',bs:1,c});await sleep(40);await m('mouseReleased',x,y,{b:'left',c});}
const dbl=async(x,y)=>{await click(x,y,1);await click(x,y,2);};
let n=0;const shot=async name=>{const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:86});writeFileSync(`${out}/${name}.jpg`,Buffer.from(s.data,'base64'));console.log(++n,name);};
async function go(url,wait=3000){const l=new Promise(r=>cdp.on('Page.loadEventFired',r));await cdp.send('Page.navigate',{url});await l;await sleep(wait);}
const hex=code=>ev(`(()=>{const b=[...document.querySelectorAll('.route-node')].find(n=>n.getAttribute('aria-label').startsWith('${code} '));const r=b.querySelector('.hex').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
const B='http://127.0.0.1:8642/';

// Home, and its blueprint state when an entry is hovered.
await go(B+'?n=1');await moveTo(1180,470);await sleep(900);await shot('home');
{const p=await at('.home-actions .primary');await moveTo(p[0],p[1]);await sleep(1400);await shot('home-blueprint');}
// Personnel plates: light layout, cobalt layout, construction lines.
await go(B+'?n=2#/operators/lemuen');await moveTo(300,700);await sleep(1500);await shot('people-lemuen');
await go(B+'?n=3#/operators/sankta');{const p=await at('#operator-art');await click(p[0],p[1]);await moveTo(300,700);await sleep(1800);await shot('people-sankta-cobalt');}
await go(B+'?n=4#/operators/graceb');await click(...await at('#construct-toggle'));await moveTo(300,750);await sleep(1600);await shot('people-graceb-construct');
// Route: hover lock-on, then pin three nodes so the 启程 figure closes.
await go(B+'?n=5#/records/mt-2',3500);{const p=await hex('MT-3');await moveTo(p[0],p[1]);await sleep(900);await shot('route-hover');}
for(const code of ['MT-1','MT-TR-1','MT-2']){let p=await hex(code);await moveTo(p[0],p[1],6);p=await hex(code);await dbl(p[0],p[1]);await sleep(1100);}
await moveTo(700,820);await sleep(1600);await shot('route-figure');
// Atlas: the wind lens over the flock; the 圣像 figure on plate 02.
await go(B+'?n=6#/atlas/1');{const bs=await ev(`[...document.querySelectorAll('.p0 [data-bird] .bp-bird-body')].map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}).sort((a,b)=>a[0]-b[0])`);const p=bs[14];await moveTo(p[0]+20,p[1]+10,20);await sleep(700);await shot('atlas-wind');}
await go(B+'?n=7#/atlas/2');{const T=await ev(`(()=>{const m=document.querySelector('.p1 svg').getScreenCTM();return [[800,104],[688,584],[912,584]].map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return [p.x,p.y];});})()`);for(const [x,y] of T){await click(x+4,y+3);await sleep(700);}await moveTo(1300,820);await sleep(2200);await shot('atlas-sancta');}
// Sanctum: overview, exploded, inspecting the flying buttresses, the light path lit.
await go(B+'?n=8#/sanctum',4500);await shot('sanctum');
await click(...await at('[data-action="explode-play"]'));await sleep(4500);await shot('sanctum-exploded');
await click(...await at('#explode-toggle'));await sleep(2600);await click(...await at('[data-action="sanctum-part"][data-part="8"]'));await sleep(3200);await shot('sanctum-inspect');
await click(...await at('[data-action="reset-view"]'));await sleep(2000);await click(...await at('#light-toggle'));await sleep(4500);
for(let i=0;i<4;i++){let p=await nth('.so-mark .so-hit',i);await moveTo(p[0],p[1],6);p=await nth('.so-mark .so-hit',i);await click(p[0],p[1]);await sleep(600);}
await moveTo(800,300);await sleep(3200);await shot('sanctum-light');
// The personal-site sample.
await go(B+'personal.html?n=9');await moveTo(1200,450);await sleep(1000);await shot('site-home');
await go(B+'personal.html?n=10#/about');await sleep(1500);await shot('site-about');
cdp.proc.kill();process.exit(0);
