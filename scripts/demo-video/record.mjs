// Records the site walkthrough frame by frame: virtual clock + scripted pointer + DevTools screenshots,
// piped into the encoder. `node record.mjs preview` renders 960×540 for checking; `node record.mjs 4k` renders 3840×2160.
import { launch, connect } from './cdp.mjs';
import { Mp4Writer } from './mux.mjs';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
const dir=new URL('.',import.meta.url).pathname.slice(1);
const MODE=process.argv[2]??'preview',K=MODE==='4k'?2:.5,W=1920*K,H=1080*K;
// Scratch (browser profile, one still per second) lives in the system temp folder, not in the project.
const TMP=tmpdir().split(String.fromCharCode(92)).join('/')+'/masses-demo/';mkdirSync(TMP,{recursive:true});
const OUT=MODE==='4k'?decodeURIComponent(new URL('../../众生行记-演示-4K60.mp4',import.meta.url).pathname.slice(1)):TMP+'preview.mp4';
rmSync(TMP+'profile',{recursive:true,force:true});
const cdp=await launch({profile:TMP+'profile',port:9334});
await cdp.send('Page.enable');await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:K,mobile:false});
await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'},{name:'prefers-color-scheme',value:'light'}]});
await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:readFileSync(dir+'shim.js','utf8')});
const loaded=new Promise(r=>cdp.on('Page.loadEventFired',r));
await cdp.send('Page.navigate',{url:'http://127.0.0.1:8642/'});await loaded;await new Promise(r=>setTimeout(r,1500));
const ev=async(expression)=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(expression+' → '+JSON.stringify(r.exceptionDetails));return r.result.value;};
await ev(readFileSync(dir+'demo.js','utf8'));
// Let fonts, images and the first scene settle in virtual time before recording starts.
for(let i=0;i<90;i++)await ev('__advance(16.6666667)');

// Encoder: WebCodecs H.264 in a second tab, muxed to MP4 here.
const tab=await (await fetch('http://127.0.0.1:9334/json/new?http://127.0.0.1:8642/__enc.html',{method:'PUT'})).json();
const enc=await connect(tab.webSocketDebuggerUrl);await enc.send('Runtime.enable');await new Promise(r=>setTimeout(r,800));
const eev=async e=>{const r=await enc.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('encoder: '+JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value;};
await cdp.send('Page.bringToFront');
await eev(readFileSync(dir+'encpage.js','utf8'));console.log('encoder',await eev(`E.init(${W},${H},${MODE==='4k'?50e6:6e6})`));
const mp4=new Mp4Writer(OUT);mp4.v.w=W;mp4.v.h=H;const PREV=TMP+(MODE==='4k'?'prev4k/':'prev/');rmSync(PREV,{recursive:true,force:true});mkdirSync(PREV);
let F=0;const t0=performance.now();
async function frame(){
 await ev('__advance(16.6666667)');
 const s=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:MODE==='4k'?95:85,optimizeForSpeed:true});
 if(F%60===0)writeFileSync(PREV+String(F/60).padStart(4,'0')+'.jpg',Buffer.from(s.data,'base64'));
 for(const [k,b] of await eev(`E.push(${JSON.stringify(s.data)})`))mp4.video(Buffer.from(b,'base64'),k);
 if(++F%300===0)console.log(`${F} frames · ${(F/60).toFixed(0)} s · ${((performance.now()-t0)/F).toFixed(0)} ms/frame`);
}
// Pace: pointer travel and holds run at SLOW× their scripted length; card timings stay exact (raw).
const SLOW=1.35;
const raw=async(sec)=>{for(let i=0,n=Math.round(sec*60);i<n;i++)await frame();};
const wait=sec=>raw(sec*SLOW);
let mx=960,my=620;
const mouse=(type,x,y,o={})=>cdp.send('Input.dispatchMouseEvent',{type,x,y,button:o.button??'none',buttons:o.buttons??0,clickCount:o.count??0,pointerType:'mouse'});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// Eased pointer travel with a slight arc, one event per frame.
async function move(x,y,sec=.6,held=false){const x0=mx,y0=my,n=Math.max(1,Math.round(sec*SLOW*60)),arc=Math.min(50,Math.hypot(x-x0,y-y0)*.07);
 for(let i=1;i<=n;i++){const t=ease(i/n);mx=x0+(x-x0)*t;my=y0+(y-y0)*t-Math.sin(Math.PI*t)*arc;await mouse('mouseMoved',mx,my,held?{button:'left',buttons:1}:{});await frame();}}
async function press(x,y,count=1){await mouse('mousePressed',x,y,{button:'left',buttons:1,count});await frame();await frame();await mouse('mouseReleased',x,y,{button:'left',buttons:0,count});await frame();}
async function click(x,y,sec=.55){await move(x,y,sec);await wait(.1);await press(x,y);}
async function dbl(x,y,sec=.5){await move(x,y,sec);await wait(.08);await press(x,y,1);await press(x,y,2);}
async function drag(x1,y1,x2,y2,sec){await move(x1,y1,.5);await mouse('mousePressed',x1,y1,{button:'left',buttons:1,count:1});await frame();await move(x2,y2,sec,true);await mouse('mouseReleased',x2,y2,{button:'left',buttons:0,count:1});await frame();}
async function hold(x,y,sec){await move(x,y,.5);await mouse('mousePressed',x,y,{button:'left',buttons:1,count:1});await wait(sec);await mouse('mouseReleased',x,y,{button:'left',buttons:0,count:1});await frame();}
const at=async(sel,i=0)=>ev(`(()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${i}];if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
const clickSel=async(sel,i=0,sec)=>{const p=await at(sel,i);if(!p)throw new Error('missing '+sel);await click(p[0],p[1],sec);return p;};
const card=(no,cn,en,sub)=>ev(`__demo.card(${JSON.stringify(no)},${JSON.stringify(cn)},${JSON.stringify(en)},${JSON.stringify(sub)})`);
const note=(x,y,cn,en)=>ev(`__demo.note(${x},${y},${JSON.stringify(cn)},${JSON.stringify(en)})`);
// Cards cover the screen from .67 s to 2 s; the page changes under them.
async function chapter(no,cn,en,sub,go){await card(no,cn,en,sub);await raw(.95);await go();await raw(1.3);await wait(.8);}

/* ── 00 · 序章 ── */
await chapter('00','序章','PROLOGUE','以平面构成重写的拉特兰图录',async()=>{const p=await at('.brand');await mouse('mouseMoved',p[0],p[1]);await press(p[0],p[1]);mx=p[0];my=p[1];});
await move(1180,520,1.6);await move(1320,430,1.4);await move(1080,640,1.4);
{const p=await at('.home-actions .primary');await move(p[0],p[1],.9);await note(p[0]+40,p[1]-20,'悬停入口 · 主视觉转为图纸','HOVER → BLUEPRINT');await wait(2.4);}
await move(1500,760,1.1);await wait(.6);

/* ── 01 · 众生 ── */
await chapter('01','众生','THE PEOPLE','每位干员一张绘制的人员图版',async()=>{const p=await at('[data-nav="operators"]');await mouse('mouseMoved',p[0],p[1]);await press(p[0],p[1]);mx=p[0];my=p[1];});
{const c=await at('#operator-art');await move(c[0]-120,c[1]-60,1.1);await note(c[0]-100,c[1]-40,'悬停 · 显示构造线','CONSTRUCTION LINES');
 for(let k=0;k<=24;k++){const a=k/24*Math.PI*2;await move(c[0]+Math.cos(a)*170,c[1]+Math.sin(a)*110,.1);}
 await press(mx,my);await note(mx,my,'点击 · 切换钴蓝版式','LAYOUT B');await wait(1.8);}
for(let k=0;k<3;k++){await clickSel('[data-action="next"]',0,.5);await wait(1.7);}
{const c=await at('#operator-art');await click(c[0]+60,c[1]+40,.7);await wait(1.4);}
await clickSel('#construct-toggle');await wait(1.6);

/* ── 02 · 行迹 ── */
await chapter('02','行迹','THE ROUTE','拖动地图 · 连起节点，图形自己闭合',async()=>{const p=await at('[data-nav="records"]');await mouse('mouseMoved',p[0],p[1]);await press(p[0],p[1]);mx=p[0];my=p[1];});
const hex=async code=>ev(`(()=>{const b=[...document.querySelectorAll('.route-node')].find(n=>n.getAttribute('aria-label').startsWith(${JSON.stringify(code)}+' '));const r=b.querySelector('.hex').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
{let p=await hex('MT-2');await move(p[0],p[1],1);await note(p[0],p[1],'悬停 · 锁定节点','LOCK-ON');await wait(1.6);await press(p[0],p[1]);await wait(1.2);}
await drag(1150,700,420,720,2.4);await note(700,700,'拖动 · 背景序列随之播放','DRAG TO SCRUB');await wait(.8);await drag(420,700,1250,690,2.2);await wait(1);
{const spot=await ev(`(()=>{const hs=[...document.querySelectorAll('.route-node .hex')].map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});
  const c=[[1000,900],[820,950],[1120,860],[420,930],[900,760]];return c.map(p=>[p,Math.min(...hs.map(h=>Math.hypot(h[0]-p[0],h[1]-p[1])))]).sort((a,b)=>b[1]-a[1])[0][0];})()`);
 await hold(spot[0],spot[1],1.3);await note(spot[0],spot[1],'长按空白处 · 测绘脉冲','HOLD TO SURVEY');await wait(1.4);}
// Each pin re-measures its node: selecting a node slides the map to centre it.
{const pinNode=async(code,sec)=>{let p=await hex(code);await move(p[0],p[1],sec);p=await hex(code);await move(p[0],p[1],.1);await wait(.08);await press(p[0],p[1],1);await press(p[0],p[1],2);await wait(1);return p;};
 const a=await pinNode('MT-1',.8);await note(a[0],a[1],'双击落点 · 吸附到节点','PIN & SNAP');await wait(.4);await pinNode('MT-TR-1',.7);await pinNode('MT-2',.7);await wait(2.2);}
for(const [x,y] of [[300,760],[520,900],[760,800]]){await dbl(x,y,.55);await wait(.35);}
await dbl(304,763,.6);await note(304,763,'回到起点 · 图形闭合','CLOSE THE LOOP');await wait(2.6);

/* ── 03 · 图谱 ── */
await chapter('03','图谱','THE ATLAS','羽兽避开指针 · 构造圆吸附隐藏点位',async()=>{const p=await at('[data-nav="atlas"]');await mouse('mouseMoved',p[0],p[1]);await press(p[0],p[1]);mx=p[0];my=p[1];});
{const birds=await ev(`[...document.querySelectorAll('.p0 [data-bird] .bp-bird-body')].map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}).sort((a,b)=>a[0]-b[0])`);
 const path=[birds[2],birds[10],birds[18],birds[24],birds[30]];await move(path[0][0]-80,path[0][1]+60,1);await note(mx,my,'指针靠近 · 羽兽避让','THE FLOCK SHIES AWAY');
 for(const p of path)await move(p[0]+30,p[1]+20,.7);
 for(const i of [34,38,41]){const q=birds[i];await click(q[0],q[1],.45);await wait(.3);}
 await wait(.6);const L=birds.slice(4,16);const xs=L.map(p=>p[0]),ys=L.map(p=>p[1]);await drag(Math.min(...xs)-40,Math.min(...ys)-40,Math.max(...xs)+40,Math.max(...ys)+40,1.4);await wait(1.6);
 await clickSel('[data-action="atlas-recall"]');await wait(1.6);}
await clickSel('[data-action="atlas-plate"]',1);await wait(1.6);
{const T=await ev(`(()=>{const m=document.querySelector('.p1 svg').getScreenCTM();return [[800,104],[688,584],[912,584]].map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return [p.x,p.y];});})()`);
 await move(T[0][0]-90,T[0][1]+50,1);await move(T[0][0]-30,T[0][1]+20,.6);await note(T[0][0],T[0][1],'隐藏点位 · 靠近显现','HIDDEN POINTS');await wait(.6);
 await click(T[0][0]+8,T[0][1]+6,.4);await wait(.7);await click(T[1][0]-10,T[1][1]+8,.8);await wait(.6);await click(T[2][0]+9,T[2][1]-6,.8);await note(T[2][0],T[2][1],'连起光环与衣摆 · 圣像','SANCTA');await wait(2.8);
 await clickSel('#atlas-measure');await wait(1.4);}

/* ── 04 · 圣堂 ── */
await chapter('04','圣堂','THE SANCTUM','九组结构 · 展开、检查、连起光路',async()=>{const p=await at('[data-nav="sanctum"]');await mouse('mouseMoved',p[0],p[1]);await press(p[0],p[1]);mx=p[0];my=p[1];});
await move(900,520,1.2);await wait(.6);
{const p=await clickSel('[data-action="explode-play"]');await note(p[0],p[1],'逐层展开','EXPLODE, GROUP BY GROUP');await wait(4);}
await clickSel('#explode-toggle');await wait(2.6);
{const p=await clickSel('[data-action="sanctum-part"][data-part="8"]');await note(p[0]-30,p[1],'检查结构 · 手绘尺寸标注','INSPECT');await wait(3);}
await clickSel('[data-action="sanctum-part"][data-part="5"]');await wait(2.8);
await drag(900,560,1250,500,2.2);await wait(1.2);
await clickSel('[data-action="reset-view"]');await wait(1.8);
await clickSel('#light-toggle');await wait(3);
{for(let i=0;i<4;i++){let p=await at('.so-mark .so-hit',i);await move(p[0],p[1],.75);p=await at('.so-mark .so-hit',i);await move(p[0],p[1],.12);await wait(.08);await press(p[0],p[1]);if(i===0)await note(p[0],p[1],'依光的行进方向连线','FOLLOW THE LIGHT');await wait(.45);}
 await wait(3.6);}
await ev('__demo.end()');await wait(3.6);

const fl=await eev('E.flush()');for(const [k,b] of fl.chunks)mp4.video(Buffer.from(b,'base64'),k);mp4.v.desc=Buffer.from(fl.desc,'base64');
const au=await eev(`E.audio('/assets/game/bgm-sys.mp3',${F/60})`);
if(!au.unsupported){mp4.a.asc=Buffer.from(au.asc,'base64');for(const c of au.chunks)mp4.audio(Buffer.from(c,'base64'));}
console.log('audio',au.unsupported?'none':au.chunks.length+' AAC frames','· mp4 bytes',await mp4.finish(),'·',OUT);
console.log(`done · ${F} frames · ${(F/60).toFixed(1)} s · ${((performance.now()-t0)/1000/60).toFixed(1)} min`);
cdp.proc.kill();process.exit(0);
