import { birdPlate, angelPlate, flock } from './graphics.ts';
import { scramble, countTo } from './fx.ts';
import { Covenant } from './covenant.ts';

const birds=flock();
const plates=[
 {code:'PLATE 01',title:'羽兽',en:'ON FLIGHT',caption:'FIG. 01 · 羽兽何以飞翔',hint:'点击放飞 · 拖出选框批量放飞 · 召回重组'},
 {code:'PLATE 02',title:'圣像',en:'BENEATH THE HALO',caption:'FIG. 02 · 光环与羽翼的结构',hint:'拖动滑杆展开羽翼 · 点击羽片标记 · 测量显示编号'},
 {code:'PLATE 03',title:'契约',en:'THE COVENANT',caption:'FIG. 03 · 两只伸出的手',hint:'移动指针牵引右手 · 指尖相触时缔结契约 · 越靠近越蓝'}
];

export class Atlas{
 stage:HTMLElement;readout:HTMLElement;rect:HTMLElement;plate=0;released=new Set<number>();lit=new Set<string>();
 drag:{x:number;y:number}|null=null;covenant:Covenant;
 constructor(public root:HTMLElement,public sound:()=>void){
  root.innerHTML=`<div class="atlas-stage" data-cursor="图谱">
   <div class="atlas-plate p0">${birdPlate(true,'atlas-bird')}</div><div class="atlas-plate p1">${angelPlate(true,'atlas-angel')}</div><div class="atlas-plate p2"><div class="cv-root"></div></div><i class="atlas-select"></i><i class="atlas-scan"></i></div>
  <div class="atlas-head"><span class="eyebrow" data-scramble>BLUEPRINT ATLAS / PLATE 01</span><h2>图谱</h2><p id="atlas-caption"></p></div>
  <div class="atlas-tabs" role="tablist">${plates.map((p,i)=>`<button role="tab" data-action="atlas-plate" data-plate="${i}"><small>${p.code}</small>${p.title}<em>${p.en}</em></button>`).join('')}</div>
  <div class="atlas-readout"><small>SPECIMEN</small><b id="atlas-no">--</b><div id="atlas-spec">将指针移到图谱上<br>读取每一只羽兽的编号</div></div>
  <div class="atlas-tools"><div class="tools-0"><button class="line-button" data-action="atlas-recall">召回 RECALL</button><button class="line-button" data-action="atlas-invert" id="atlas-invert">反相 INVERT</button><span class="atlas-count">已放飞 <b id="atlas-count">00</b> / ${birds.length}</span></div>
   <div class="tools-1"><label class="atlas-slider"><span>羽翼展开</span><input type="range" id="atlas-open" min="0" max="100" value="100" aria-label="羽翼展开程度"><b id="atlas-open-value">100%</b></label><button class="line-button" data-action="atlas-measure" id="atlas-measure">测量 MEASURE</button><button class="line-button" data-action="atlas-clear">清除标记</button></div>
   <div class="tools-2"><span class="atlas-count">契约 <b id="covenant-count">00</b> 次</span><span class="atlas-count gap">指尖距离 <b id="covenant-gap">1.00</b></span><button class="line-button" data-action="covenant-reset">分开 PART</button><button class="line-button active" data-action="covenant-lines" id="covenant-lines">构造线 LINES</button></div></div>
  <div class="atlas-hint" id="atlas-hint"></div>`;
  this.stage=root.querySelector('.atlas-stage')!;this.readout=root.querySelector('.atlas-readout')!;this.rect=root.querySelector('.atlas-select')!;
  this.stage.addEventListener('pointerover',e=>this.hover(e.target as Element));
  this.stage.addEventListener('click',e=>{const b=(e.target as Element).closest<SVGElement>('[data-bird]');if(b)this.release([+b.dataset.bird!]);const f=(e.target as Element).closest<SVGElement>('[data-feather]');if(f){const id=f.dataset.feather!;this.lit.has(id)?this.lit.delete(id):this.lit.add(id);f.classList.toggle('lit');this.sound();}});
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
 recall(){this.stage.querySelectorAll('.flown').forEach(g=>{g.classList.remove('flown');g.classList.add('returning');});this.released.clear();countTo(this.root.querySelector('#atlas-count')!,0);}
 setPlate(i:number,animate=true){
  this.plate=i;this.stage.dataset.plate=String(i);this.covenant.active=i===2;if(i===2)this.covenant.resize();this.root.dataset.plate=String(i);const p=plates[i];
  this.root.querySelectorAll<HTMLElement>('[data-plate]').forEach(b=>{if(b.tagName==='BUTTON'){b.classList.toggle('active',(+b.dataset.plate!)===i);b.setAttribute('aria-selected',String((+b.dataset.plate!)===i));}});
  this.root.querySelector('#atlas-caption')!.textContent=p.caption;this.root.querySelector('#atlas-hint')!.textContent=p.hint;
  scramble(this.root.querySelector('.atlas-head [data-scramble]')!,600,`BLUEPRINT ATLAS / ${p.code}`);
  if(animate){this.stage.classList.remove('scanning');void this.stage.offsetWidth;this.stage.classList.add('scanning');}
  this.readout.classList.remove('live');
  this.readout.querySelector('#atlas-no')!.textContent='--';this.readout.querySelector('#atlas-spec')!.innerHTML=['将指针移到图谱上<br>读取每一只羽兽的编号','悬停羽片读取长度与展角<br>点击可标记','让右手的指尖靠近左手<br>颜色随距离由灰转蓝'][i];
 }
 enter(){this.stage.classList.remove('scanning');void this.stage.offsetWidth;this.stage.classList.add('scanning');this.setPlate(this.plate,false);}
}
