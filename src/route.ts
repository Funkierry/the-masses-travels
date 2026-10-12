import { assetUrl } from './assets.ts';
import { routeNodes, ROUTE_WIDTH, records, operators, type RouteNode } from './data.ts';
import { rng } from './graphics.ts';
import { ring, rule, poly, hexPts } from './sketch.ts';
import { sigil, area } from './sigil.ts';
import { clamp, wrap } from './util.ts';
import { personnelPlate, recordPlate, roleGlyph } from './plates.ts';
import { scramble, countTo } from './fx.ts';
import { PvSequence, STAGES } from './sequence.ts';

const at=(x:number,y:number,extra='')=>`style="--x:${x};--y:${y};${extra}"`;
const kindLabel:Record<RouteNode['kind'],string>={operation:'OPERATION',story:'OPERATION',tutorial:'TUTORIAL',special:'SPECIAL'};
const g=(name:string)=>assetUrl(`game/${name}.webp`);

// Pieces cut from the activity's map atlases: [asset, x, y, height (u), extra class]. Mid layer moves at .78, fore at 1.42.
const MID:[string,number,number,number,string?][]=[
 ['human-dec',52,47,12.5],['bird',96,2,20],['text-shrine',138,64,15],['sky-spire',146,6,13],['reflect-blue',178,64,21,'blue'],['boss',186,20,26],
 ['star-blue',122,30,8,'twinkle'],['car-shadow',204,6,16],['dec-03-03',206,0,2.6],['text-column',258,27,36],
 ['star-blue',240,52,6,'twinkle'],['dec-04-03',300,44,2.6],['arch-blue',322,68,18,'blue'],
 ['y-ruler',336,18,44],['doc-mosaic',352,8,30,'glitch'],['figure-joints',404,6,52],['star-blue',346,40,7,'twinkle'],
 ['op-label',392,85,9],['hex-set',424,70,14],['glow-line',112,62,14],['color-dec',430,4,6],['star-blue',446,22,9,'twinkle'],['rays-white',458,60,22]
];
const FORE:[string,number,number,number,string?][]=[
 ['blade-a',30,82,14],['blade-c',150,0,9],['stroke-white',214,74,6],['shard-black',300,2,15],['blade-b',330,88,13],['shard-gray',430,46,8],
 ['blade-d',520,76,9],['cracks',590,26,52,'faint'],['shard-black',680,84,10],['blade-c',740,6,8]
];
const ZONES:[number,string,string][]=[[0,'city','LATERANO'],[232,'people','THE PEOPLE'],[386,'light','INTO THE LIGHT'],[478,'ex','EXTRA · SHRINE']];

// Route lines drawn by hand: the axis is laid in strokes with small gaps over a pencil guide, and each
// branch bows slightly, runs past its nodes and has a faint offset second pass.
function lines(o:RouteOptions){
 const r=rng(23);const p=(id:string)=>o.nodes.find(n=>n.id===id)!;
 const seg=(a:string,b:string)=>`<path pathLength="1" data-a="${a}" data-b="${b}" d="${rule(p(a).x,p(a).y,p(b).x,p(b).y,r,.9,.45)}"/>`;
 const base:string[]=[];for(let x=0;x<o.width;){const w=40+r()*50;base.push(`<path class="baseline" pathLength="1" d="${rule(x,60,Math.min(o.width,x+w),60,r,.6,.28)}"/>`);x+=w+1.4+r()*1.6;}
 return `<svg class="route-lines" viewBox="0 0 ${o.width} 100" preserveAspectRatio="none" style="width:calc(var(--u)*${o.width})" aria-hidden="true">${base.join('')}<path class="guide" pathLength="1" d="${rule(0,60.8,o.width,59.5,r,0,.5)}"/>
  <g class="branch-echo">${o.links.map(([a,b])=>`<path pathLength="1" d="${rule(p(a).x+.5,p(a).y+.6,p(b).x+.5,p(b).y+.6,r,1.6,.7)}"/>`).join('')}</g>
  <g class="branches">${o.links.map(([a,b])=>seg(a,b)).join('')}${o.extraLines??''}</g></svg>`;
}
function nodeMarkup(n:RouteNode,i:number){
 const r=rng(i*13+3);
 const hex=`<svg class="hex" viewBox="-20 -20 40 40" aria-hidden="true"><path d="${poly(hexPts(0,0,17,r))}"/><path class="hex-echo" d="${poly(hexPts(1,.8,17.8,r))}"/></svg>`;
 // Lock-on ring and a title tip, shown on hover, focus and selection.
 const lock=`<svg class="rn-lock" viewBox="-40 -40 80 80" aria-hidden="true"><path d="${ring(0,0,30,r,1.2)}"/><path class="rn-lock-t" d="${rule(-40,0,-33,0,r,0,0)}${rule(33,0,40,0,r,0,0)}${rule(0,-40,0,-33,r,0,0)}${rule(0,33,0,40,r,0,0)}"/></svg>`;
 const op=n.operator!==undefined?operators[n.operator]:null;
 const badge=op?`<span class="rn-badge role" style="--c:${op.color}"><svg viewBox="-110 -110 220 220">${roleGlyph(op.role)}</svg></span>`:n.kind==='tutorial'?'<span class="rn-badge book"><svg viewBox="0 0 30 30"><path d="M4 7q6-3 11 1q5-4 11-1v16q-6-3-11 1q-5-4-11-1zM15 8v16"/></svg></span>':n.kind==='special'?'<span class="rn-badge halo"><svg viewBox="0 0 30 30"><ellipse cx="15" cy="8" rx="8" ry="2.4"/><path d="M15 12v14M9 18h12"/></svg></span>':'';
 return `<button class="route-node kind-${n.kind}" data-route="${i}" ${at(n.x,n.y,`--i:${i}`)} aria-label="${n.code} ${n.title}" data-cursor="${n.code}">${lock}${badge}${hex}<span class="rn-tip"><b>${n.title}</b><small>${n.en}</small></span><span class="rn-label"><small>${n.label??kindLabel[n.kind]}</small><b>${n.code}</b></span><em class="rn-done">COMPLETED</em></button>`;
}
const piece=([a,x,y,h,cls]:[string,number,number,number,string?],i:number)=>`<img class="rd ${cls??''}" src="${g(a)}" alt="" draggable="false" ${at(x,y,`--h:${h};--i:${i}`)}>`;

type Item={el:HTMLElement;x:number;w:number;depth:number;near:number;boost:number};
// Everything that makes this map the festival route; another site can pass its own nodes and panel.
// A hidden figure: pin every one of these nodes and the figure draws itself.
export type Figure={ids:string[];label:string;open?:boolean};
export type RouteOptions={figures?:Figure[];nodes:RouteNode[];width:number;links:[string,string][];extraLines?:string;head:{eyebrow:string;title:string;sub:string};counter:string;portals:string;panel:(n:RouteNode,i:number,map:RouteMap)=>string};
function festivalPanel(n:RouteNode,i:number,map:RouteMap){
 const op=n.operator!==undefined?operators[n.operator]:null;const rec=n.record!==undefined?records[n.record]:null;
  const saveId=rec?.id??op?.id;const saved=saveId?map.saved().has(saveId):false;
 const actions=n.kind==='special'?'<button class="line-button solid" data-action="sanctum">进入圣堂 →</button>':n.kind==='tutorial'?'<button class="line-button solid" data-action="atlas">打开图谱 →</button>':op?'<button class="line-button solid" data-action="route-open">查看档案 →</button>':'';
 return `<div class="rp-head"><span class="rp-kind">${kindLabel[n.kind]}</span><span class="rp-code" data-scramble>${n.code}</span><span class="rp-time">X ${String(n.x).padStart(3,'0')} · Y ${String(n.y).padStart(2,'0')}</span></div>
   <figure class="rp-image${op?' operator':' stage'}">${op?personnelPlate(op,n.operator!):`<img src="${assetUrl(n.preview??'game/stage-01.webp')}" alt="" draggable="false"><span class="rp-inset">${recordPlate(n.motif??'prologue',n.code,i)}</span>`}<b></b><b></b><b></b><b></b><figcaption>${op?'PERSONNEL PLATE':'STAGE PREVIEW'} · ${String(i+1).padStart(2,'0')} / ${String(map.o.nodes.length).padStart(2,'0')}</figcaption></figure>
   <h3>${n.title}</h3><p class="rp-en">${n.en}</p><p class="rp-desc">${n.description}</p>
   <div class="rp-actions">${actions}${saveId?`<button class="line-button${saved?' active':''}" data-action="route-save">${saved?'★ 已收藏':'☆ 收藏'}</button>`:''}<button class="line-button" data-action="card">生成卡片</button></div>
   <div class="rp-step"><button data-action="route-prev" aria-label="上一个节点">←</button><span>${n.code}</span><button data-action="route-next" aria-label="下一个节点">→</button></div>`;
}
const festival=():RouteOptions=>({figures:[{ids:['st-1','st-2','st-3','st-4'],label:'众生 · THE PEOPLE'},{ids:['mt-1','tr-1','mt-2'],label:'启程 · PROLOGUE'},{ids:['mt-5','mt-6','ex-1'],label:'向光 · INTO THE LIGHT',open:true}],nodes:routeNodes,width:ROUTE_WIDTH,links:[['mt-1','tr-1'],['tr-1','mt-2'],['mt-4','st-1'],['st-1','st-2'],['st-2','st-3'],['st-3','st-4'],['st-4','mt-5']],extraLines:`<path pathLength="1" d="${rule(304,24,304,60,rng(9),.8,.4)}"/>`,
 head:{eyebrow:'FRAGMENTS OF A JOURNEY',title:'行迹',sub:'ROUTE / RECOLLECTIONS'},counter:'已阅行迹',panel:festivalPanel,
 portals:`<button data-action="sanctum" aria-label="瞻望圣堂 · 进入圣堂"><img src="${g('portal-shrine')}" alt="" draggable="false"></button><button data-action="operators" aria-label="谒见神祇 · 众生档案"><img src="${g('portal-god')}" alt="" draggable="false"></button><button data-action="atlas" aria-label="息止安所 · 图谱"><img src="${g('portal-rest')}" alt="" draggable="false"></button>`});
export class RouteMap{
 o:RouteOptions;view:HTMLElement;layers:HTMLElement[];seq:PvSequence;seqStage='';panel:HTMLElement;mini:HTMLElement;sky:HTMLElement;skyImg:HTMLElement;zoneWord:HTMLElement;glitch:HTMLElement;items:Item[]=[];
 scroll=0;target=0;u=6;drag:{x:number;s:number;t:number;v:number}|null=null;moved=false;selected=0;
 last=0;vel=0;speed=-1;zone='';glitchClock=0;hot='';holdTimer=0;selectedAt=-1e9;pins:[number,number][]=[];pinIds:string[]=[];found=new Set<string>();pinLayer!:HTMLElement;marks!:HTMLElement;sigils!:SVGSVGElement;onFigure?:(label:string)=>void;
 constructor(public root:HTMLElement,public visited:Set<string>,public saved:()=>Set<string>,public onVisit:(id:string)=>void,options?:RouteOptions){
  const o=this.o=options??festival();
  root.innerHTML=`<div class="route-view" data-cursor="拖动 · 滚轮浏览">
   <div class="route-sky"><img class="sky-img" src="${g('map-pano-sky')}" alt="" draggable="false"><i class="sky-tint"></i><span class="route-zone-word"></span></div>
   <div class="route-layer back" data-depth=".5"><img class="route-pano" src="${g('map-pano')}" alt="" draggable="false"><img class="route-ex" src="${g('map-ex')}" alt="" draggable="false"><img class="route-ex s" src="${g('map-s')}" alt="" draggable="false">${['A','K','T','N'].map((c,i)=>`<span class="route-letter" ${at(30+i*130,i%2?52:-8)}>${c}</span>`).join('')}</div>
   <canvas class="route-seq" aria-hidden="true"></canvas>
   <div class="route-layer mid" data-depth=".78">${MID.map(piece).join('')}<div class="route-circles rd" ${at(382,-4)}>${'<i></i>'.repeat(7)}</div><span class="route-word rd" ${at(232,90)}>THE COVENANT</span><span class="route-word rd" ${at(18,92)}>SANCTUM · 1099</span><span class="route-word big rd" ${at(332,95)}>GLANCE</span></div>
   <div class="route-layer main" data-depth="1">${lines(o)}<div class="route-pins"></div><span class="route-xaxis">X AXIS</span>${o.nodes.map(nodeMarkup).join('')}</div>
   <div class="route-layer fore" data-depth="1.42">${FORE.map(piece).join('')}</div>
   <div class="route-streaks">${'<i></i>'.repeat(9)}</div><div class="route-glitch"></div></div>
  <div class="route-head"><span class="eyebrow" data-scramble>${o.head.eyebrow}</span><h2>${o.head.title}</h2><p>${o.head.sub}</p></div>
  <div class="route-seq-bar" aria-label="背景序列"><span class="rs-label">SEQUENCE · PLATE <b id="seq-pv">01</b> · <em id="seq-name">羽兽何以飞翔</em></span><div class="rs-track"><i class="rs-fill"></i>${STAGES.map((s,i)=>`<button data-action="route-seq" data-seq="${i}" style="left:${s.from*100}%" aria-label="跳到 ${s.label}" data-cursor="${s.label}"></button>`).join('')}</div></div>
  <div class="route-mini" aria-label="行迹缩略图">${o.nodes.map((n,i)=>`<button data-route="${i}" style="--x:${n.x/o.width}" aria-label="${n.code}"></button>`).join('')}<i class="mini-window"></i></div>
  <aside class="route-panel" aria-live="polite"></aside>
  <div class="route-tools"><span>拖动浏览 · 长按空白处测绘 · 双击落下标记</span><button data-action="route-pins-clear" aria-label="清除标记">清除标记 <b id="route-pin-count">00</b></button></div>
  <div class="route-counter" style="--bar:url('${g('counter-bar')}')"><small>${o.counter}</small><b><span id="route-count">00</span><i>/ ${String(o.nodes.length).padStart(2,'0')}</i></b></div>
  <nav class="route-portals" aria-label="入口">${o.portals}</nav>`;
  this.view=root.querySelector('.route-view')!;this.layers=[...root.querySelectorAll<HTMLElement>('.route-layer')];this.panel=root.querySelector('.route-panel')!;this.mini=root.querySelector('.route-mini')!;
  this.sky=root.querySelector('.route-sky')!;this.skyImg=root.querySelector('.sky-img')!;this.zoneWord=root.querySelector('.route-zone-word')!;this.glitch=root.querySelector('.route-glitch')!;
  this.seq=new PvSequence(root.querySelector<HTMLCanvasElement>('.route-seq')!);this.pinLayer=root.querySelector('.route-pins')!;
  this.pinLayer.innerHTML=`<svg class="route-sigils" viewBox="0 0 ${o.width} 100" preserveAspectRatio="none" style="width:calc(var(--u)*${o.width})" aria-hidden="true"></svg><div class="route-pin-marks"></div>`;this.sigils=this.pinLayer.querySelector('svg')!;this.marks=this.pinLayer.querySelector('.route-pin-marks')!;
  // Hovering a node lights the branches that meet it.
  this.view.addEventListener('pointerover',e=>{const nd=(e.target as Element).closest<HTMLElement>('.route-node');const id=nd?this.o.nodes[+nd.dataset.route!].id:'';if(id===this.hot)return;this.hot=id;
   this.root.querySelectorAll('.route-lines .branches path').forEach(p=>p.classList.toggle('hot',!!id&&(p.getAttribute('data-a')===id||p.getAttribute('data-b')===id)));});
  // Press and hold on open map: a survey pulse; double-click: a marker that stays on the map.
  this.view.addEventListener('pointerdown',e=>{clearTimeout(this.holdTimer);if(e.button!==0||(e.target as Element).closest('.route-node'))return;const x=e.clientX,y=e.clientY;this.holdTimer=window.setTimeout(()=>{if(this.drag&&!this.moved)this.pulse(x,y);},420);});
  addEventListener('pointerup',()=>clearTimeout(this.holdTimer));
  // Double-clicking a node pins that node — also when its first click already slid the map to centre it;
  // anywhere else pins the open map.
  this.view.addEventListener('dblclick',e=>{if(performance.now()-this.selectedAt<650){const n=this.o.nodes[this.selected];this.addPin(n.x,n.y);return;}const nd=(e.target as Element).closest<HTMLElement>('.route-node');if(nd){const n=this.o.nodes[+nd.dataset.route!];this.addPin(n.x,n.y);return;}const v=this.view.getBoundingClientRect();this.addPin((this.scroll+e.clientX-v.left)/this.u,(e.clientY-v.top)/this.u);});
  for(const layer of this.layers){if(layer.classList.contains('main'))continue;const depth=Number(layer.dataset.depth);layer.querySelectorAll<HTMLElement>('.rd').forEach(el=>this.items.push({el,x:Number(el.style.getPropertyValue('--x')),w:0,depth,near:-1,boost:0}));}
  new ResizeObserver(()=>this.resize()).observe(this.view);
  this.view.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,s:this.target,t:performance.now(),v:0};this.moved=false;});
  addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x;if(Math.abs(dx)>8&&!this.moved){this.moved=true;this.view.classList.add('dragging');this.view.setPointerCapture?.(e.pointerId);}if(this.moved){const now=performance.now();const next=this.drag.s-dx;this.drag.v=(next-this.target)/Math.max(1,now-this.drag.t);this.drag.t=now;this.target=this.clampScroll(next);this.scroll=this.target;}});
  addEventListener('pointerup',()=>{if(!this.drag)return;if(this.moved)this.target=this.clampScroll(this.target+this.drag.v*300);this.drag=null;this.view.classList.remove('dragging');});
  this.view.addEventListener('click',e=>{if(this.moved){e.stopPropagation();e.preventDefault();this.moved=false;}},true);
  this.view.addEventListener('wheel',e=>{e.preventDefault();this.target=this.clampScroll(this.target+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*.9);},{passive:false});
 }
 get width(){return this.o.width*this.u;}
 clampScroll(v:number){const w=this.view.clientWidth;return clamp(v,-w*.08,Math.max(0,this.width-w*.6));}
 resize(){this.u=this.view.clientHeight/100;this.seq?.resize(this.view.clientWidth,this.view.clientHeight);this.root.style.setProperty('--u',`${this.u}px`);this.target=this.clampScroll(this.target);this.scroll=this.target;for(const it of this.items)it.w=it.el.offsetWidth/this.u;}
 enter(){this.root.classList.remove('entered');void this.root.offsetWidth;this.root.classList.add('entered');this.resize();this.select(this.selected,true,true);this.seq.p=this.progress();this.last=this.scroll;this.vel=0;scramble(this.root.querySelector('[data-scramble]')!,700);this.zone='';}
 progress(){const w=this.view.clientWidth;return clamp(this.scroll/Math.max(1,this.width-w*.6));}
 seekStage(i:number){const w=this.view.clientWidth;this.target=this.clampScroll((STAGES[i].from+(STAGES[i].to-STAGES[i].from)*.55)*(this.width-w*.6));}
 step(dir:number){this.select(wrap(this.selected+dir,this.o.nodes.length));}
 select(i:number,center=true,instant=false){
  this.selected=wrap(i,this.o.nodes.length);const n=this.o.nodes[this.selected];
  this.root.querySelectorAll<HTMLElement>('[data-route]').forEach(b=>{const on=(+b.dataset.route!)===this.selected;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  if(center){this.target=this.clampScroll(n.x*this.u-this.view.clientWidth*.34);if(instant)this.scroll=this.target;else this.selectedAt=performance.now();}
  this.visited.add(n.id);this.onVisit(n.id);this.render();
 }
 render(){
  const n=this.o.nodes[this.selected];
  this.panel.innerHTML=this.o.panel(n,this.selected,this);
  this.panel.classList.remove('swap');void this.panel.offsetWidth;this.panel.classList.add('swap');
  const code=this.panel.querySelector<HTMLElement>('[data-scramble]');if(code)scramble(code,480);
  this.root.querySelectorAll<HTMLElement>('.route-node').forEach(b=>b.classList.toggle('done',this.visited.has(this.o.nodes[+b.dataset.route!].id)));
  countTo(this.root.querySelector('#route-count')!,this.visited.size);
 }
 frame(dt:number){
  if(!this.drag)this.scroll+=(this.target-this.scroll)*(1-Math.exp(-dt*7));
  // Velocity drives blur, skew, streaks and the occasional pixel glitch while the map is moving.
  const v=(this.scroll-this.last)/Math.max(dt,.001);this.last=this.scroll;this.vel+=(v-this.vel)*(1-Math.exp(-dt*10));
  const speed=clamp(Math.abs(this.vel)/2400);const dir=Math.sign(this.vel);
  if(Math.abs(speed-this.speed)>.004){this.speed=speed;this.root.style.setProperty('--speed',speed.toFixed(3));}
  for(const l of this.layers){const d=Number(l.dataset.depth);const skew=l.classList.contains('main')?0:-dir*speed*(d-.4)*7;l.style.transform=`translate3d(${(-this.scroll*d).toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;}
  // The sequence behind the map is scrubbed by how far the map has been dragged.
  const progress=this.progress();this.seq.frame(dt,progress,speed);const st=this.seq.stageAt(this.seq.p);
  if(st.id!==this.seqStage){this.seqStage=st.id;this.root.querySelector('#seq-pv')!.textContent=String(STAGES.indexOf(st)+1).padStart(2,'0');scramble(this.root.querySelector('#seq-name')!,420,st.label);this.root.querySelectorAll<HTMLElement>('[data-seq]').forEach((b,i)=>b.classList.toggle('active',STAGES[i].id===st.id));}
  this.root.querySelector<HTMLElement>('.rs-fill')!.style.transform=`scaleX(${this.seq.p.toFixed(3)})`;
  this.skyImg.style.transform=`translate3d(${(-this.scroll*.2).toFixed(1)}px,0,0)`;
  // Pieces sharpen, colour in and settle as they cross the centre of the view.
  const w=this.view.clientWidth,cx=w*.42;
  for(const it of this.items){const sx=it.x*this.u-this.scroll*it.depth+it.w*this.u/2;const d=Math.abs(sx-cx)/w;if(it.boost>0)it.boost-=dt;const level=it.boost>0||d<.24?2:d<.5?1:0;if(level!==it.near){it.near=level;it.el.dataset.near=String(level);}}
  const centre=(this.scroll+cx)/this.u;const z=[...ZONES].reverse().find(z=>centre>=z[0])!;
  if(z[1]!==this.zone){this.zone=z[1];this.root.dataset.zone=z[1];scramble(this.zoneWord,700,z[2]);}
  this.glitchClock-=dt;if(speed>.6&&this.glitchClock<=0){this.glitchClock=.18;this.spawnGlitch();}
  const win=this.mini.querySelector<HTMLElement>('.mini-window')!;win.style.left=`${clamp(this.scroll/this.width)*100}%`;win.style.width=`${clamp(w/this.width)*100}%`;
 }
 // Survey pulse: hand-drawn rings spread from the pointer, nearby nodes answer with their distance and
 // nearby map pieces come into focus for a moment.
 pulse(cx:number,cy:number){
  const v=this.view.getBoundingClientRect(),px=cx-v.left,py=cy-v.top,mx=(this.scroll+px)/this.u,my=py/this.u;const r=rng(Math.floor(mx*7+my*3));
  const el=document.createElement('div');el.className='route-pulse';el.style.left=`${px}px`;el.style.top=`${py}px`;
  el.innerHTML=`<svg viewBox="-110 -110 220 220">${[0,1,2].map(k=>`<path style="--k:${k}" d="${ring(0,0,32+k*30,r,1.8)}"/>`).join('')}<path class="rp-cross" d="${rule(-14,0,14,0,r,2,.4)}${rule(0,-14,0,14,r,2,.4)}"/></svg><span>SURVEY · X ${mx.toFixed(1)} · Y ${my.toFixed(1)}</span>`;
  this.view.append(el);setTimeout(()=>el.remove(),1700);
  this.root.querySelectorAll<HTMLElement>('.route-node').forEach(b=>{const n=this.o.nodes[+b.dataset.route!];const d=Math.hypot(n.x-mx,n.y-my);if(d<48){b.dataset.dist=`Δ ${d.toFixed(1)}u`;b.classList.remove('pinged');void b.offsetWidth;b.classList.add('pinged');setTimeout(()=>b.classList.remove('pinged'),1900);}});
  for(const it of this.items){const sx=it.x*this.u-this.scroll*it.depth+it.w*this.u/2;if(Math.abs(sx-px)<v.width*.28)it.boost=1.6;}
 }
 // Pins snap onto a node when dropped close to it; closing a loop or pinning a hidden figure draws it.
 addPin(x:number,y:number){
  const near=this.o.nodes.map(n=>({n,d:Math.hypot(n.x-x,n.y-y)})).sort((a,b)=>a.d-b.d)[0];const snap=near&&near.d<6?near.n:null;if(snap){x=snap.x;y=snap.y;}
  // Returning to any earlier pin with at least three pins in between closes a loop.
  const j=this.pins.findIndex((p,k)=>this.pins.length-k>=3&&Math.hypot(p[0]-x,p[1]-y)<6);const closes=j>=0;const first=closes?this.pins[j]:null;
  if(this.pins.length>=12){this.pins.shift();this.pinIds.shift();}
  this.pins.push(first?[first[0],first[1]]:[x,y]);this.pinIds.push(snap?.id??'');this.renderPins();
  if(snap)this.flash([snap.id],'✦ 吸附');
  const ids=new Set(this.pinIds.filter(Boolean));
  for(const fig of this.o.figures??[])if(!this.found.has(fig.label)&&fig.ids.every(id=>ids.has(id))){this.found.add(fig.label);this.drawFigure(fig.ids.map(id=>{const n=this.o.nodes.find(m=>m.id===id)!;return [n.x,n.y] as [number,number];}),fig.label,!fig.open);this.flash(fig.ids,'✦ '+fig.label.split(' · ')[0]);}
  if(closes){const loop=this.pins.slice(j,-1);this.drawFigure(loop,`闭合 · ${area(loop).toFixed(0)} u²`,true);this.pins=[];this.pinIds=[];this.renderPins();}
 }
 drawFigure(pts:[number,number][],label:string,closed:boolean){
  this.sigils.insertAdjacentHTML('beforeend',sigil(pts,rng(this.sigils.childElementCount*53+11),.9,label,closed));
  this.root.classList.remove('figure-flash');void this.root.offsetWidth;this.root.classList.add('figure-flash');
  for(const it of this.items)it.boost=1.2;
  this.onFigure?.(label);
 }
 flash(ids:string[],text:string){this.root.querySelectorAll<HTMLElement>('.route-node').forEach(b=>{if(!ids.includes(this.o.nodes[+b.dataset.route!].id))return;b.dataset.dist=text;b.classList.remove('pinged');void b.offsetWidth;b.classList.add('pinged');setTimeout(()=>b.classList.remove('pinged'),1900);});}
 clearPins(){this.pins=[];this.pinIds=[];this.found.clear();this.sigils.innerHTML='';this.renderPins();}
 renderPins(){
  const r=rng(this.pins.length*31+5);
  this.marks.innerHTML=`<svg class="route-pin-lines" viewBox="0 0 ${this.o.width} 100" preserveAspectRatio="none" style="width:calc(var(--u)*${this.o.width})">${this.pins.slice(1).map((p,i)=>`<path pathLength="1" d="${rule(this.pins[i][0],this.pins[i][1],p[0],p[1],r,.6,.8)}"/>`).join('')}</svg>`
   +this.pins.map(([x,y],i)=>`<span class="route-pin" style="--px:${x.toFixed(2)};--py:${y.toFixed(2)}"><svg viewBox="-30 -30 60 60"><path d="${ring(0,0,15,r,.8)}"/><path d="${rule(-26,0,26,0,r,0,.4)}${rule(0,-26,0,26,r,0,.4)}"/></svg><b>PIN ${String(i+1).padStart(2,'0')}</b><small>X ${x.toFixed(1)} · Y ${y.toFixed(1)}</small></span>`).join('');
  const c=this.root.querySelector('#route-pin-count');if(c)c.textContent=String(this.pins.length).padStart(2,'0');
 }
 spawnGlitch(){
  if(this.glitch.childElementCount>14)return;const b=document.createElement('i');const s=1+Math.random()*4;
  b.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${s}vw;height:${s*(.3+Math.random())}vw;background:${['#22282b','#3a5bc2','#c94b5c','#d8dcdd','#f4f5f4'][Math.floor(Math.random()*5)]}`;
  this.glitch.append(b);setTimeout(()=>b.remove(),380);
 }
}
