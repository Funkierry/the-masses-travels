import * as THREE from 'three';
import type { World } from './scene.ts';
import { GROUPS, KEYPOINTS } from './sanctum.ts';
import { rng } from './graphics.ts';
import { f, ring, rule, brush, sweepPts, sparkle } from './sketch.ts';

const NS='http://www.w3.org/2000/svg';
const el=<K extends keyof SVGElementTagNameMap>(tag:K,cls:string,parent:Element)=>{const e=document.createElementNS(NS,tag);e.setAttribute('class',cls);parent.append(e);return e;};

// A hand-drawn layer over the 3D sanctum. While a structure is inspected it carries dimension marks that
// follow the camera; in light-path mode it shows the four points the light passes, to be joined in order.
// Elements persist and only their attributes change per frame, so a marker never disappears under a click.
// Wobble is seeded per mark, so the hand-drawn lines move with the model without shimmering.
export class SanctumOverlay{
 svg:SVGSVGElement;annot:SVGGElement;light:SVGGElement;chainPath:SVGPathElement;band:SVGPathElement;burst:SVGGElement;
 marks:SVGGElement[]=[];mode:'off'|'light'='off';chain:number[]=[];solved=false;pointer:{x:number;y:number}|null=null;
 a:{crop:SVGPathElement;w:SVGPathElement;h:SVGPathElement;ring:SVGPathElement;lead:SVGPathElement;tw:SVGTextElement;th:SVGTextElement;td:SVGTextElement;tl:SVGTextElement;ts:SVGTextElement};
 onStep?:(i:number)=>void;onMiss?:()=>void;onSolve?:()=>void;
 constructor(public host:HTMLElement,public world:World){
  this.svg=document.createElementNS(NS,'svg');this.svg.setAttribute('class','so-svg');host.append(this.svg);
  this.annot=el('g','so-annot',this.svg);
  this.a={crop:el('path','so-crop',this.annot),w:el('path','so-dim',this.annot),h:el('path','so-dim',this.annot),ring:el('path','so-ring',this.annot),lead:el('path','so-lead',this.annot),
   tw:el('text','so-t',this.annot),th:el('text','so-t',this.annot),td:el('text','so-t dim',this.annot),tl:el('text','so-t big',this.annot),ts:el('text','so-t',this.annot)};
  this.a.ring.setAttribute('d',ring(0,0,16,rng(4),.8)+ring(0,0,4,rng(5),.2));
  this.light=el('g','so-light',this.svg);this.band=el('path','so-band',this.light);this.chainPath=el('path','so-chain',this.light);this.burst=el('g','so-burst',this.light);
  this.burst.innerHTML=[...Array(22)].map((_,i)=>{const r=rng(i+90),a=i/22*Math.PI*2,r0=26+r()*14,r1=90+r()*110;return `<path d="${brush([[Math.cos(a)*r0,Math.sin(a)*r0],[Math.cos(a+.01)*(r0+r1)/2,Math.sin(a+.01)*(r0+r1)/2],[Math.cos(a)*r1,Math.sin(a)*r1]],2+r()*4,.3)}"/>`;}).join('')+`<path class="so-burst-ring" d="${ring(0,0,60,rng(7),2)}"/>`+[0,1,2,3].map(k=>`<path class="so-spark" d="${sparkle(Math.cos(k*1.6)*80,Math.sin(k*1.6)*60,12)}"/>`).join('');
  KEYPOINTS.forEach((k,i)=>{const g=el('g','so-mark',this.light);g.dataset.key=String(i);const r=rng(i*19+3);
   g.innerHTML=`<circle class="so-hit" r="26"/><path class="so-mark-ring" d="${ring(0,0,15,r,1)}"/><path class="so-mark-ring echo" transform="translate(2 1.4)" d="${ring(0,0,15,r,1.3)}"/><path class="so-mark-cross" d="${rule(-24,0,24,0,r,0,.4)}${rule(0,-24,0,24,r,0,.4)}"/><text x="22" y="-14">${k.name}</text><text class="en" x="22" y="0">${k.en}</text>`;this.marks.push(g);});
  this.svg.addEventListener('click',e=>{const g=(e.target as Element).closest<SVGGElement>('.so-mark');if(g){e.stopPropagation();this.press(+g.dataset.key!);}});
  addEventListener('pointermove',e=>{const r=this.host.getBoundingClientRect();this.pointer={x:e.clientX-r.left,y:e.clientY-r.top};});
 }
 setLight(on:boolean){this.mode=on?'light':'off';this.world.lightView=on;this.chain=[];this.solved=false;this.world.setBeam(false);this.host.classList.toggle('light-mode',on);this.host.classList.remove('solved');this.marks.forEach(m=>m.classList.remove('lit'));}
 // The next point in the light's order extends the chain; any other point breaks it.
 press(i:number){
  if(this.mode!=='light'||this.solved||this.chain.includes(i))return;
  if(i===this.chain.length){this.chain.push(i);this.marks[i].classList.add('lit');this.onStep?.(i);
   if(this.chain.length===KEYPOINTS.length){this.solved=true;this.host.classList.add('solved');this.world.setBeam(true);this.onSolve?.();}}
  else{this.chain=[];this.marks.forEach(m=>m.classList.remove('lit'));this.host.classList.remove('miss');void this.host.offsetWidth;this.host.classList.add('miss');this.onMiss?.();}
 }
 frame(){
  const W=this.host.clientWidth,H=this.host.clientHeight;if(!W)return;this.svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const inspect=this.mode==='off'&&this.world.focus>=0;this.annot.style.display=inspect?'':'none';this.light.style.display=this.mode==='light'?'':'none';
  if(inspect)this.annotate(this.world.focus,W,H);
  if(this.mode==='light')this.drawLight();
 }
 annotate(i:number,W:number,H:number){
  const box=this.world.box(i);if(box.isEmpty())return;const r=rng(i*31+7),size=box.getSize(new THREE.Vector3());
  const pts=[...Array(8)].map((_,k)=>this.world.project(new THREE.Vector3(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z))).filter(p=>p.front);if(pts.length<2)return;
  const cl=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
  const x0=cl(Math.min(...pts.map(p=>p.x)),40,W-40),x1=cl(Math.max(...pts.map(p=>p.x)),40,W-40),y0=cl(Math.min(...pts.map(p=>p.y)),70,H-90),y1=cl(Math.max(...pts.map(p=>p.y)),70,H-90);
  const L=18;this.a.crop.setAttribute('d',`M${f(x0)} ${f(y0+L)}V${f(y0)}H${f(x0+L)}M${f(x1-L)} ${f(y0)}H${f(x1)}V${f(y0+L)}M${f(x1)} ${f(y1-L)}V${f(y1)}H${f(x1-L)}M${f(x0+L)} ${f(y1)}H${f(x0)}V${f(y1-L)}`);
  const yb=Math.min(H-70,y1+22),xr=Math.min(W-30,x1+22);
  this.a.w.setAttribute('d',rule(x0,yb,x1,yb,r,8,1.5)+`M${f(x0)} ${f(yb-7)}v14M${f(x1)} ${f(yb-7)}v14`);
  this.a.h.setAttribute('d',rule(xr,y0,xr,y1,r,8,1.5)+`M${f(xr-7)} ${f(y0)}h14M${f(xr-7)} ${f(y1)}h14`);
  this.a.tw.setAttribute('x',f((x0+x1)/2-30));this.a.tw.setAttribute('y',f(yb+18));this.a.tw.textContent=`W ${size.x.toFixed(1)} m`;
  this.a.th.setAttribute('x',f(xr+10));this.a.th.setAttribute('y',f((y0+y1)/2));this.a.th.textContent=`H ${size.y.toFixed(1)} m`;
  this.a.td.setAttribute('x',f(x0));this.a.td.setAttribute('y',f(y0-10));this.a.td.textContent=`D ${size.z.toFixed(1)} m · ${GROUPS[i].en}`;
  const c=this.world.project(box.getCenter(new THREE.Vector3()));const lx=cl(c.x+120,60,W-260),ly=cl(c.y-90,90,H-120);
  this.a.ring.setAttribute('transform',`translate(${f(c.x)} ${f(c.y)})`);
  this.a.lead.setAttribute('d',rule(c.x+12,c.y-10,lx-6,ly+6,r,0,6)+`M${f(lx-6)} ${f(ly+6)}h120`);
  this.a.tl.setAttribute('x',f(lx));this.a.tl.setAttribute('y',f(ly));this.a.tl.textContent=`S-0${i+1} · ${GROUPS[i].name}`;
  const rep=this.world.reports[i];this.a.ts.setAttribute('x',f(lx));this.a.ts.setAttribute('y',f(ly+22));this.a.ts.textContent=`${rep.parts} 件 · ${rep.triangles.toLocaleString()} 面`;
 }
 drawLight(){
  const sp=KEYPOINTS.map(k=>this.world.project(new THREE.Vector3(...k.pos)));
  sp.forEach((p,i)=>{this.marks[i].setAttribute('transform',`translate(${f(p.x)} ${f(p.y)})`);this.marks[i].style.display=p.front?'':'none';});
  // Joined points are re-inked as a brush stroke; the open end follows the pointer as a dashed band.
  let d='';for(let k=1;k<this.chain.length;k++){const a=sp[this.chain[k-1]],b=sp[this.chain[k]];d+=this.solved?brush(sweepPts(a.x,a.y,b.x,b.y,4,10),9,.45):rule(a.x,a.y,b.x,b.y,rng(k*13),10,5);}
  this.chainPath.setAttribute('d',d);this.chainPath.classList.toggle('brush',this.solved);
  const last=this.chain.length?sp[this.chain[this.chain.length-1]]:null;
  this.band.setAttribute('d',last&&this.pointer&&!this.solved?`M${f(last.x)} ${f(last.y)}L${f(this.pointer.x)} ${f(this.pointer.y)}`:'');
  const eye=sp[sp.length-1];this.burst.setAttribute('transform',`translate(${f(eye.x)} ${f(eye.y)})`);
 }
}
