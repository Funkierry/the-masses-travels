import { assetUrl } from './assets.ts';
import { clamp } from './util.ts';

// PV 00:45 — two reaching hands under construction lines. The hand sprites come from the activity's map atlas.
type Pt=[number,number];
type Hand={src:string;ratio:number;tip:Pt;palm:Pt;joints:[number,number,number][]};
const LEFT:Hand={src:'game/hand-white.webp',ratio:120/140,tip:[.955,.235],palm:[.66,.37],joints:[[.955,.235,7],[.93,.31,5],[.8,.24,9],[.78,.04,6],[.7,.3,12],[.55,.47,16],[.32,.68,9],[.12,.88,6]]};
const RIGHT:Hand={src:'game/arm-hand.webp',ratio:128/220,tip:[.335,.27],palm:[.5,.38],joints:[[.335,.27,7],[.41,.21,5],[.47,.19,6],[.56,.21,5],[.5,.42,13],[.6,.47,18],[.76,.66,9],[.93,.95,6]]};
const WORDS='COVENANT';

export class Covenant{
 canvas=document.createElement('canvas');ctx:CanvasRenderingContext2D;left:HTMLElement;right:HTMLElement;letters:HTMLElement[]=[];
 w=0;h=0;dx=0;dy=0;tx=0;ty=0;blue=0;assemble=0;assembleTarget=0;clock=0;cool=0;contacts=0;gap=1;lines=true;active=false;
 auto=false;phase=0;lettersAt=0;onContact?:(n:number)=>void;
 constructor(public root:HTMLElement,interactive:boolean){
  root.classList.add('covenant');
  const hand=(h:Hand,side:string)=>`<div class="cv-hand ${side}"><img src="${assetUrl(h.src)}" alt="" draggable="false"><i class="cv-tint" style="--m:url('${assetUrl(h.src)}')"></i><i class="cv-band" style="--m:url('${assetUrl(h.src)}')"></i></div>`;
  root.innerHTML=`<div class="cv-haze"></div>${hand(LEFT,'left')}${hand(RIGHT,'right')}<div class="cv-letters">${[...WORDS].map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div><i class="cv-flash"></i>`;
  root.append(this.canvas);this.canvas.className='cv-lines';this.ctx=this.canvas.getContext('2d')!;
  this.left=root.querySelector('.cv-hand.left')!;this.right=root.querySelector('.cv-hand.right')!;this.letters=[...root.querySelectorAll<HTMLElement>('.cv-letters span')];
  new ResizeObserver(()=>this.resize()).observe(root);this.resize();
  if(interactive){
   root.addEventListener('pointermove',e=>{const r=root.getBoundingClientRect();const rest=this.rest();this.tx=clamp(e.clientX-r.left-rest.x,-this.w*.3,this.w*.3);this.ty=clamp(e.clientY-r.top-rest.y,-this.h*.35,this.h*.35);});
   root.addEventListener('pointerleave',()=>{this.tx=this.w*.1;this.ty=0;});
  }
 }
 resize(){const dpr=Math.min(devicePixelRatio,1.5);this.w=this.root.clientWidth;this.h=this.root.clientHeight;this.canvas.width=this.w*dpr;this.canvas.height=this.h*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.tx=this.w*.1;this.dx=this.tx;}
 size(h:Hand,share:number){const k=this.w<this.h?1.45:1;const w=Math.min(this.w*share*k,this.h*.92/h.ratio);return {w,h:w*h.ratio};}
 // Where the right fingertip rests when nothing pulls it.
 rest(){return {x:this.w*.535,y:this.h*.45};}
 boxes(){
  const L=this.size(LEFT,.47),R=this.size(RIGHT,.56);
  const l={x:this.w*.465-LEFT.tip[0]*L.w,y:this.h*.45-LEFT.tip[1]*L.h,...L};
  const rest=this.rest();const r={x:rest.x-RIGHT.tip[0]*R.w+this.dx,y:rest.y-RIGHT.tip[1]*R.h+this.dy,...R};
  return {l,r};
 }
 contact(){this.contacts++;this.assembleTarget=1;this.cool=2.6;this.root.classList.remove('touch');void this.root.offsetWidth;this.root.classList.add('touch');this.onContact?.(this.contacts);}
 reset(){this.tx=this.w*.14;this.ty=0;this.assembleTarget=0;}
 frame(dt:number){
  if(!this.active||!this.w)return;this.clock+=dt;
  if(this.auto){this.tx=(1-this.phase)*this.w*.2;this.ty=Math.sin(this.clock*1.3)*this.h*.01;}
  const k=1-Math.exp(-dt*(this.auto?3:7));this.dx+=(this.tx-this.dx)*k;this.dy+=(this.ty-this.dy)*k;
  const {l,r}=this.boxes();
  for(const [el,b] of [[this.left,l],[this.right,r]] as const){el.style.transform=`translate(${b.x}px,${b.y}px)`;el.style.width=`${b.w}px`;el.style.height=`${b.h}px`;}
  const lt:Pt=[l.x+LEFT.tip[0]*l.w,l.y+LEFT.tip[1]*l.h],rt:Pt=[r.x+RIGHT.tip[0]*r.w,r.y+RIGHT.tip[1]*r.h];
  const gapPx=Math.hypot(rt[0]-lt[0],rt[1]-lt[1]);this.gap=clamp(gapPx/(this.w*.35));
  // Colour follows distance: grey when apart, cobalt as the fingertips approach (PV 00:44 → 00:45 in reverse).
  const targetBlue=this.auto?(this.phase<.55?1-this.phase*.4:Math.max(0,1-(this.phase-.55)*4)):1-this.gap;
  this.blue+=(targetBlue-this.blue)*(1-Math.exp(-dt*5));this.root.style.setProperty('--blue',this.blue.toFixed(3));this.root.style.setProperty('--gap',this.gap.toFixed(3));
  this.cool=Math.max(0,this.cool-dt);if(this.cool===0)this.assembleTarget=0;
  if(gapPx<16&&this.cool===0&&!this.auto)this.contact();
  if(this.auto&&this.phase>.92&&this.assembleTarget===0&&this.cool===0){this.assembleTarget=1;this.cool=9;this.root.classList.add('touch');}
  this.assemble+=(this.assembleTarget-this.assemble)*(1-Math.exp(-dt*4));
  if(Math.abs(this.assemble-this.assembleTarget)>.002||this.clock-this.lettersAt>.05){this.lettersAt=this.clock;this.placeLetters(lt,rt);}this.draw(l,r,lt,rt,gapPx);
 }
 placeLetters(lt:Pt,rt:Pt){
  const mid:Pt=[(lt[0]+rt[0])/2,(lt[1]+rt[1])/2];
  this.letters.forEach((el,i)=>{
   const a=i*2.39+this.clock*.05;const sx=this.w*(.5+Math.cos(a)*(.32+(i%3)*.05)),sy=this.h*(.5+Math.sin(a*1.3)*.36);
   const wx=mid[0]+(i-3.5)*Math.min(this.w,this.h)*.06,wy=mid[1]+this.h*.2;const t=this.assemble;
   el.style.transform=`translate(${sx+(wx-sx)*t}px,${sy+(wy-sy)*t}px) translate(-50%,-50%) scale(${i%2&&t<.5?-1:1},${i===3&&t<.5?-1:1})`;
   el.style.filter=`blur(${((1-t)*(i%3)*1.4+(1-t)*.6).toFixed(2)}px)`;const m=Math.min(this.w,this.h);el.style.fontSize=`${(t>.5?m*.07:m*(.08+(i%4)*.04)).toFixed(0)}px`;
  });
 }
 draw(l:{x:number;y:number;w:number;h:number},r:{x:number;y:number;w:number;h:number},lt:Pt,rt:Pt,gapPx:number){
  const c=this.ctx;c.clearRect(0,0,this.w,this.h);if(!this.lines)return;
  c.save();c.lineWidth=1;const ink='rgba(40,46,50,',blue='rgba(58,91,194,';
  const pts=(h:Hand,b:typeof l)=>h.joints.map(([u,v,s])=>[b.x+u*b.w,b.y+v*b.h,s*b.w/220] as [number,number,number]);
  const L=pts(LEFT,l),R=pts(RIGHT,r);
  for(const [set,palm,b] of [[L,LEFT.palm,l],[R,RIGHT.palm,r]] as const){
   const px=b.x+palm[0]*b.w,py=b.y+palm[1]*b.h;
   c.strokeStyle=ink+'.42)';c.beginPath();set.slice(0,4).forEach(([x,y])=>{c.moveTo(px,py);c.lineTo(x,y);});c.stroke();
   c.strokeStyle=ink+'.28)';c.beginPath();set.slice(4).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
   set.forEach(([x,y,s])=>{c.strokeStyle=ink+'.5)';c.beginPath();c.arc(x,y,Math.max(4,s),0,Math.PI*2);c.stroke();});
   c.strokeStyle=ink+'.3)';c.beginPath();c.arc(px,py,b.w*.17,0,Math.PI*2);c.stroke();
  }
  // Dotted orbit around the left hand and long construction rays leaving the frame.
  const ox=l.x+LEFT.palm[0]*l.w,oy=l.y+LEFT.palm[1]*l.h,or=l.w*.42;
  c.fillStyle=ink+'.4)';for(let i=0;i<110;i++){const a=i/110*Math.PI*2+this.clock*.04;c.fillRect(ox+Math.cos(a)*or-.8,oy+Math.sin(a)*or-.8,1.5,1.5);}
  c.strokeStyle=ink+'.18)';c.beginPath();c.moveTo(0,this.h*.62);c.lineTo(lt[0],lt[1]);c.moveTo(this.w,this.h*.3);c.lineTo(rt[0],rt[1]);c.moveTo(0,this.h*.2);c.lineTo(ox,oy);c.stroke();
  // Fingertip link with the measured gap.
  const near=1-this.gap;c.setLineDash([3,4]);c.strokeStyle=blue+(.25+near*.6).toFixed(2)+')';c.beginPath();c.moveTo(lt[0],lt[1]);c.lineTo(rt[0],rt[1]);c.stroke();c.setLineDash([]);
  const mx=(lt[0]+rt[0])/2,my=(lt[1]+rt[1])/2;c.strokeStyle=blue+'.8)';c.beginPath();c.moveTo(mx-8,my);c.lineTo(mx+8,my);c.moveTo(mx,my-8);c.lineTo(mx,my+8);c.stroke();
  c.fillStyle=ink+'.75)';c.font='9px Consolas,monospace';c.fillText(`Δ ${(gapPx/this.w).toFixed(3)}`,mx+12,my-10);
  const dot=(x:number,y:number,n:number)=>{c.fillStyle=ink+'.85)';c.beginPath();c.arc(x,y,6.5,0,Math.PI*2);c.fill();c.fillStyle='#f3f5f4';c.textAlign='center';c.textBaseline='middle';c.font='bold 9px Consolas,monospace';c.fillText(String(n),x,y+.5);c.textAlign='start';c.textBaseline='alphabetic';};
  dot(ox+l.w*.2,oy-l.h*.42,1);dot(r.x+RIGHT.palm[0]*r.w+r.w*.05,r.y+RIGHT.palm[1]*r.h+r.h*.35,2);
  c.save();c.translate(lt[0]-6,lt[1]+20);c.rotate(Math.PI/2);c.fillStyle=ink+'.6)';c.font='8px Consolas,monospace';c.fillText('C O V E N A N T ↵',0,0);c.restore();
  c.restore();
 }
}
