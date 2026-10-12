import { birdPlate, angelPlate, flock, rng } from './graphics.ts';
import { ring, rule } from './sketch.ts';
import { sigil, area } from './sigil.ts';

// Plate 02 hides points worth marking. Construction circles snap onto them; marking every point of a
// figure draws it, and the plate answers (the halo lights and the wings open, or the orbits turn).
const TARGETS=[{id:'halo',x:800,y:104,label:'HALO · 光环'},{id:'hem-l',x:688,y:584,label:'HEM L · 左衣摆'},{id:'hem-r',x:912,y:584,label:'HEM R · 右衣摆'},{id:'orb-l',x:330,y:300,label:'ORB L · 左构造圆心'},{id:'orb-r',x:1250,y:330,label:'ORB R · 右构造圆心'}];
const FIGURES=[{ids:['halo','hem-l','hem-r'],label:'圣像 · SANCTA',cls:'sanctified'},{ids:['orb-l','halo','orb-r'],label:'双环 · TWIN ORBITS',cls:'orbited',open:true}];
import { scramble, countTo } from './fx.ts';
import { Covenant } from './covenant.ts';

const birds=flock();
const plates=[
 {code:'PLATE 01',title:'羽兽',en:'ON FLIGHT',caption:'FIG. 01 · 羽兽何以飞翔',hint:'点击放飞 · 拖出选框批量放飞 · 指针靠近时羽兽避开 · 召回重组'},
 {code:'PLATE 02',title:'圣像',en:'BENEATH THE HALO',caption:'FIG. 02 · 光环与羽翼的结构',hint:'点击空白处落下构造圆 · 对准光环、衣摆两角或两个构造圆心时会吸附 · 连起特定点位或闭合图形会触发变化'},
 {code:'PLATE 03',title:'契约',en:'THE COVENANT',caption:'FIG. 03 · 两只伸出的手',hint:'移动指针牵引右手 · 指尖相触时缔结契约 · 越靠近越蓝'}
];

export class Atlas{
 stage:HTMLElement;readout:HTMLElement;rect:HTMLElement;plate=0;released=new Set<number>();lit=new Set<string>();
 drag:{x:number;y:number}|null=null;covenant:Covenant;lens:HTMLElement;birdEls=new Map<number,SVGGElement>();windAt=0;notes:[number,number][]=[];noteIds:string[]=[];found=new Set<string>();noteLayer!:SVGGElement;targetLayer!:SVGGElement;onFigure?:(label:string)=>void;
 constructor(public root:HTMLElement,public sound:()=>void){
  root.innerHTML=`<div class="atlas-stage" data-cursor="图谱">
   <div class="atlas-plate p0">${birdPlate(true,'atlas-bird')}</div><div class="atlas-plate p1">${angelPlate(true,'atlas-angel')}</div><div class="atlas-plate p2"><div class="cv-root"></div></div><i class="atlas-select"></i><i class="atlas-scan"></i><i class="atlas-lens" aria-hidden="true"><svg viewBox="-110 -110 220 220"><path d="${ring(0,0,100,rng(3),2.2)}"/><path class="al-ticks" d="${[...Array(24)].map((_,i)=>{const a=i/24*Math.PI*2,l=i%6?5:12;return `M${(Math.cos(a)*100).toFixed(1)} ${(Math.sin(a)*100).toFixed(1)}L${(Math.cos(a)*(100+l)).toFixed(1)} ${(Math.sin(a)*(100+l)).toFixed(1)}`;}).join('')}"/></svg><span>WIND · R 170</span></i></div>
  <div class="atlas-head"><span class="eyebrow" data-scramble>BLUEPRINT ATLAS / PLATE 01</span><h2>图谱</h2><p id="atlas-caption"></p></div>
  <div class="atlas-tabs" role="tablist">${plates.map((p,i)=>`<button role="tab" data-action="atlas-plate" data-plate="${i}"><small>${p.code}</small>${p.title}<em>${p.en}</em></button>`).join('')}</div>
  <div class="atlas-readout"><small>SPECIMEN</small><b id="atlas-no">--</b><div id="atlas-spec">将指针移到图谱上<br>读取每一只羽兽的编号</div></div>
  <div class="atlas-tools"><div class="tools-0"><button class="line-button" data-action="atlas-recall">召回 RECALL</button><button class="line-button" data-action="atlas-invert" id="atlas-invert">反相 INVERT</button><span class="atlas-count">已放飞 <b id="atlas-count">00</b> / ${birds.length}</span></div>
   <div class="tools-1"><label class="atlas-slider"><span>羽翼展开</span><input type="range" id="atlas-open" min="0" max="100" value="100" aria-label="羽翼展开程度"><b id="atlas-open-value">100%</b></label><button class="line-button" data-action="atlas-measure" id="atlas-measure">测量 MEASURE</button><button class="line-button" data-action="atlas-clear">清除标记</button></div>
   <div class="tools-2"><span class="atlas-count">契约 <b id="covenant-count">00</b> 次</span><span class="atlas-count gap">指尖距离 <b id="covenant-gap">1.00</b></span><button class="line-button" data-action="covenant-reset">分开 PART</button><button class="line-button active" data-action="covenant-lines" id="covenant-lines">构造线 LINES</button></div></div>
  <div class="atlas-hint" id="atlas-hint"></div>`;
  this.stage=root.querySelector('.atlas-stage')!;this.readout=root.querySelector('.atlas-readout')!;this.rect=root.querySelector('.atlas-select')!;this.lens=root.querySelector('.atlas-lens')!;
  this.stage.querySelectorAll<SVGGElement>('.p0 [data-bird]').forEach(g=>this.birdEls.set(+g.dataset.bird!,g));
  this.noteLayer=document.createElementNS('http://www.w3.org/2000/svg','g');this.noteLayer.setAttribute('class','bp-notes');this.stage.querySelector('.p1 svg')!.append(this.noteLayer);
  this.targetLayer=document.createElementNS('http://www.w3.org/2000/svg','g');this.targetLayer.setAttribute('class','bp-targets');
  this.targetLayer.innerHTML=TARGETS.map((t,k)=>{const r=rng(k*7+1);return `<g data-target="${t.id}"><path d="${ring(t.x,t.y,22,r,1)}"/><path d="${rule(t.x-34,t.y,t.x+34,t.y,r,0,.6)}${rule(t.x,t.y-34,t.x,t.y+34,r,0,.6)}"/><text x="${t.x+28}" y="${t.y+30}">${t.label}</text></g>`;}).join('');
  this.stage.querySelector('.p1 svg')!.insertBefore(this.targetLayer,this.noteLayer);
  // Plate 01: birds near the pointer shy away from it; plate 02: clicks on open paper drop construction circles.
  this.stage.addEventListener('pointermove',e=>{if(this.drag||this.plate>1)return;const now=performance.now();if(now-this.windAt<16)return;this.windAt=now;if(this.plate===0)this.wind(e);else this.near(e);});
  this.stage.addEventListener('pointerleave',()=>this.calm());
  this.stage.addEventListener('pointerover',e=>this.hover(e.target as Element));
  this.stage.addEventListener('click',e=>{if(this.plate===1&&!(e.target as Element).closest('[data-feather],button'))this.note(e);const b=(e.target as Element).closest<SVGElement>('[data-bird]');if(b)this.release([+b.dataset.bird!]);const f=(e.target as Element).closest<SVGElement>('[data-feather]');if(f){const id=f.dataset.feather!;this.lit.has(id)?this.lit.delete(id):this.lit.add(id);f.classList.toggle('lit');this.sound();}});
  this.stage.addEventListener('pointerdown',e=>{if(this.plate!==0||e.button!==0||(e.target as Element).closest('[data-bird]'))return;this.drag={x:e.clientX,y:e.clientY};this.stage.setPointerCapture(e.pointerId);});
  this.stage.addEventListener('pointermove',e=>{if(!this.drag)return;const b=this.box(e);Object.assign(this.rect.style,{left:`${b.l}px`,top:`${b.t}px`,width:`${b.w}px`,height:`${b.h}px`});this.rect.classList.toggle('visible',b.w*b.h>60);this.pick(b,false);});
  this.stage.addEventListener('pointerup',e=>{if(!this.drag)return;const b=this.box(e);this.drag=null;this.rect.classList.remove('visible');if(b.w*b.h>60)this.pick(b,true);});
  const open=root.querySelector<HTMLInputElement>('#atlas-open')!;open.addEventListener('input',()=>{const v=+open.value/100;this.stage.style.setProperty('--open',String(v));root.querySelector('#atlas-open-value')!.textContent=`${open.value}%`;});
  this.covenant=new Covenant(root.querySelector('.cv-root')!,true);
  this.covenant.onContact=n=>{countTo(root.querySelector('#covenant-count')!,n);this.sound();this.show('✦','指尖相触<br>契约已缔结 · COVENANT');};
  this.setPlate(0,false);
 }
 frame(dt:number){if(this.plate!==2)return;this.covenant.frame(dt);const g=this.root.querySelector<HTMLElement>('#covenant-gap')!;const v=this.covenant.gap.toFixed(2);if(g.textContent!==v)g.textContent=v;}
 box(e:PointerEvent){const s=this.stage.getBoundingClientRect();const x0=this.drag!.x-s.left,y0=this.drag!.y-s.top,x1=e.clientX-s.left,y1=e.clientY-s.top;return {l:Math.min(x0,x1),t:Math.min(y0,y1),w:Math.abs(x1-x0),h:Math.abs(y1-y0),s};}
 pick(b:ReturnType<Atlas['box']>,commit:boolean){
  const hits:number[]=[];
  this.stage.querySelectorAll<SVGGElement>('.p0 [data-bird]').forEach(g=>{const r=g.querySelector('.bp-bird-body')!.getBoundingClientRect();const cx=r.left+r.width/2-b.s.left,cy=r.top+r.height/2-b.s.top;const inside=cx>b.l&&cx<b.l+b.w&&cy>b.t&&cy<b.t+b.h;g.classList.toggle('picked',inside&&!commit);if(inside)hits.push(+g.dataset.bird!);});
  if(commit){this.stage.querySelectorAll('.picked').forEach(g=>g.classList.remove('picked'));if(hits.length)this.release(hits);}
  else if(hits.length)this.show(`${hits.length}`,`框选 ${hits.length} 只羽兽<br>松开指针即放飞`);
 }
 hover(t:Element){
  const b=t.closest<SVGElement>('[data-bird]');const f=t.closest<SVGElement>('[data-feather]');
  this.stage.querySelectorAll('.hot').forEach(el=>el.classList.remove('hot'));
  if(b){b.classList.add('hot');const s=birds.find(x=>x.n===+b.dataset.bird!)!;this.show(String(s.n).padStart(2,'0'),`翼展　${(s.s*.62).toFixed(2)} m<br>航向　${s.r>0?'+':''}${s.r.toFixed(1)}°<br>坐标　${Math.round(s.x)}, ${Math.round(s.y)}<br>状态　${this.released.has(s.n)?'已放飞':'栖于图谱'}`);}
  if(f){f.classList.add('hot');const id=f.dataset.feather!;const i=+id.slice(1);this.show(id.toUpperCase(),`${id[0]==='l'?'左':'右'}翼第 ${i+1} 羽<br>长度　${150+i*26}<br>展角　${Math.abs(-4+i*17)}°<br>标记　${this.lit.has(id)?'已标记':'—'}`);}
 }
 show(no:string,spec:string){const n=this.readout.querySelector<HTMLElement>('#atlas-no')!;if(n.dataset.text!==no)scramble(n,320,no);this.readout.querySelector('#atlas-spec')!.innerHTML=spec;this.readout.classList.add('live');}
 release(ns:number[]){
  let changed=0;
  for(const n of ns){if(this.released.has(n))continue;this.released.add(n);changed++;const g=this.stage.querySelector<SVGGElement>(`.p0 [data-bird="${n}"]`);g?.classList.remove('returning');g?.classList.add('flown');}
  if(changed){this.sound();countTo(this.root.querySelector('#atlas-count')!,this.released.size);}
  if(this.released.size===birds.length)this.show('ALL','羽兽已全部飞离图谱<br>点击「召回」重新组合');
 }
 // Each bird within reach is pushed along the line from the pointer, harder the closer it is.
 wind(e:PointerEvent){
  const svg=this.stage.querySelector<SVGSVGElement>('.p0 svg')!;const m=svg.getScreenCTM();if(!m)return;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());const R=170;
  for(const b of birds){const g=this.birdEls.get(b.n);if(!g||this.released.has(b.n))continue;const dx=b.x-pt.x,dy=b.y-pt.y,d=Math.hypot(dx,dy);
   if(d<R){const k=(1-d/R)**2*80/(d||1);g.style.translate=`${(dx*k).toFixed(1)}px ${(dy*k).toFixed(1)}px`;g.dataset.wind='1';}else if(g.dataset.wind){g.style.translate='';delete g.dataset.wind;}}
  const s=this.stage.getBoundingClientRect(),size=R*2*m.a;Object.assign(this.lens.style,{width:`${size}px`,height:`${size}px`,transform:`translate(${(e.clientX-s.left-size/2).toFixed(0)}px,${(e.clientY-s.top-size/2).toFixed(0)}px)`});this.lens.classList.add('visible');
 }
 calm(){this.lens.classList.remove('visible');this.birdEls.forEach(g=>{if(g.dataset.wind){g.style.translate='';delete g.dataset.wind;}});}
 // A numbered construction circle, tied to the previous one by a hand-drawn leader with its length.
 toSvg(e:MouseEvent){const svg=this.stage.querySelector<SVGSVGElement>('.p1 svg')!;const m=svg.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null;}
 // Hidden points show themselves faintly when the pointer comes close.
 near(e:PointerEvent){const pt=this.toSvg(e);if(!pt)return;this.targetLayer.querySelectorAll<SVGGElement>('[data-target]').forEach(g=>{const t=TARGETS.find(x=>x.id===g.dataset.target)!;g.classList.toggle('near',Math.hypot(t.x-pt.x,t.y-pt.y)<70);});}
 note(e:MouseEvent){
  const pt=this.toSvg(e);if(!pt)return;
  if(this.notes.length>=12)this.notes=[],this.noteIds=[];
  const target=TARGETS.find(t=>Math.hypot(t.x-pt.x,t.y-pt.y)<40);if(target){pt.x=target.x;pt.y=target.y;this.targetLayer.querySelector(`[data-target="${target.id}"]`)!.classList.add('hit');}
  const j=this.notes.findIndex((p,n)=>this.notes.length-n>=3&&Math.hypot(p[0]-pt.x,p[1]-pt.y)<34),closes=j>=0;if(closes){pt.x=this.notes[j][0];pt.y=this.notes[j][1];}
  const k=this.noteLayer.querySelectorAll('.bp-note').length+1,r=rng(k*41+9),rad=16+r()*26,prev=this.notes.at(-1);
  let html=`<path class="nt-ring" d="${ring(pt.x,pt.y,rad,r,1.2)}"/><path class="nt-ring nt-echo" transform="translate(2.2 1.5)" d="${ring(pt.x,pt.y,rad,r,1.5)}"/><path class="nt-cross" d="${rule(pt.x-rad-12,pt.y,pt.x+rad+12,pt.y,r,0,.6)}${rule(pt.x,pt.y-rad-12,pt.x,pt.y+rad+12,r,0,.6)}"/><text class="nt-label" x="${(pt.x+rad+8).toFixed(1)}" y="${(pt.y-rad*.6).toFixed(1)}">A${k}</text>`;
  let dist='';if(prev){const d=Math.hypot(pt.x-prev[0],pt.y-prev[1]);dist=d.toFixed(0);html+=`<path class="nt-link" pathLength="1" d="${rule(prev[0],prev[1],pt.x,pt.y,r,0,7)}"/><text class="nt-dist" x="${((prev[0]+pt.x)/2+8).toFixed(1)}" y="${((prev[1]+pt.y)/2-8).toFixed(1)}">${dist}</text>`;}
  const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class',`bp-note${target?' snapped':''}`);g.innerHTML=html;this.noteLayer.append(g);this.notes.push([pt.x,pt.y]);this.noteIds.push(target?.id??'');this.sound();
  this.show(`A${k}`,`${target?`✦ 吸附 ${target.label}<br>`:'构造圆 '+`A${k}<br>`}半径　${rad.toFixed(0)}<br>坐标　${pt.x.toFixed(0)}, ${pt.y.toFixed(0)}${prev?`<br>至上一点　${dist}`:''}`);
  const ids=new Set(this.noteIds.filter(Boolean));
  for(const fig of FIGURES)if(!this.found.has(fig.label)&&fig.ids.every(id=>ids.has(id))){this.found.add(fig.label);this.figure(fig.ids.map(id=>{const t=TARGETS.find(x=>x.id===id)!;return [t.x,t.y] as [number,number];}),fig.label,!fig.open);this.stage.classList.add(fig.cls);
   if(fig.cls==='sanctified'){const open=this.root.querySelector<HTMLInputElement>('#atlas-open')!;open.value='100';open.dispatchEvent(new Event('input'));}}
  if(closes){const loop=this.notes.slice(j,-1);this.figure(loop,`闭合 · ${area(loop).toFixed(0)}`,true);this.notes=[];this.noteIds=[];}
 }
 figure(pts:[number,number][],label:string,closed:boolean){
  this.noteLayer.insertAdjacentHTML('beforeend',sigil(pts,rng(pts.length*67+this.found.size),9,label,closed));
  this.stage.classList.remove('figure-flash');void (this.stage as HTMLElement).offsetWidth;this.stage.classList.add('figure-flash');
  this.show('✦',`${label}<br>图形已闭合`);this.onFigure?.(label);
 }
 clearNotes(){this.notes=[];this.noteIds=[];this.found.clear();this.noteLayer.innerHTML='';this.targetLayer.querySelectorAll('.hit').forEach(g=>g.classList.remove('hit'));this.stage.classList.remove('sanctified','orbited');}
 recall(){this.stage.querySelectorAll('.flown').forEach(g=>{g.classList.remove('flown');g.classList.add('returning');});this.released.clear();countTo(this.root.querySelector('#atlas-count')!,0);}
 setPlate(i:number,animate=true){
  this.plate=i;this.stage.dataset.plate=String(i);if(i!==0)this.calm();this.covenant.active=i===2;if(i===2)this.covenant.resize();this.root.dataset.plate=String(i);const p=plates[i];
  this.root.querySelectorAll<HTMLElement>('[data-plate]').forEach(b=>{if(b.tagName==='BUTTON'){b.classList.toggle('active',(+b.dataset.plate!)===i);b.setAttribute('aria-selected',String((+b.dataset.plate!)===i));}});
  this.root.querySelector('#atlas-caption')!.textContent=p.caption;this.root.querySelector('#atlas-hint')!.textContent=p.hint;
  scramble(this.root.querySelector('.atlas-head [data-scramble]')!,600,`BLUEPRINT ATLAS / ${p.code}`);
  if(animate){this.stage.classList.remove('scanning');void this.stage.offsetWidth;this.stage.classList.add('scanning');}
  this.readout.classList.remove('live');
  this.readout.querySelector('#atlas-no')!.textContent='--';this.readout.querySelector('#atlas-spec')!.innerHTML=['将指针移到图谱上<br>读取每一只羽兽的编号','悬停羽片读取长度与展角<br>点击可标记','让右手的指尖靠近左手<br>颜色随距离由灰转蓝'][i];
 }
 enter(){this.stage.classList.remove('scanning');void this.stage.offsetWidth;this.stage.classList.add('scanning');this.setPlate(this.plate,false);}
}
