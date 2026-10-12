import { rng } from './graphics.ts';

const fine=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
export const INTERACTIVE='button:not(:disabled),a,[data-action],[data-bird],[data-feather],[data-route],.glyph.key,input[type=range],select';

// Corner-bracket reticle. It snaps around whatever interactive element is under the pointer,
// like the crop frames that select details in the activity's key visual.
export class Reticle{
 el=document.createElement('div');box=document.createElement('div');label=document.createElement('span');
 x=-100;y=-100;bx=-100;by=-100;bw=30;bh=30;target:Element|null=null;visible=false;enabled=fine();
 constructor(root:HTMLElement){
  this.el.id='reticle';this.el.setAttribute('aria-hidden','true');
  this.box.className='r-box';this.box.innerHTML='<b></b><b></b><b></b><b></b>';this.label.className='r-label';
  this.el.append(Object.assign(document.createElement('i'),{className:'r-dot'}),this.box,this.label);root.append(this.el);
  root.classList.toggle('has-reticle',this.enabled);
  matchMedia('(hover:hover) and (pointer:fine)').addEventListener?.('change',e=>{this.enabled=e.matches;root.classList.toggle('has-reticle',e.matches);});
  root.addEventListener('pointermove',e=>this.move(e));root.addEventListener('pointerdown',()=>this.el.classList.add('press'));
  addEventListener('pointerup',()=>this.el.classList.remove('press'));root.addEventListener('pointerleave',()=>{this.visible=false;this.el.classList.remove('visible');});
 }
 move(e:PointerEvent){
  if(!this.enabled||e.pointerType==='touch')return;this.x=e.clientX;this.y=e.clientY;
  if(!this.visible){this.visible=true;this.el.classList.add('visible');this.bx=this.x-15;this.by=this.y-15;}
  const t=(e.target as Element)?.closest?.(INTERACTIVE)??null;
  if(t!==this.target){this.target=t;this.el.classList.toggle('locked',!!t);}
  const name=t?.getAttribute('data-cursor')??t?.getAttribute('aria-label');
  this.label.textContent=name&&name.length<18?name:`X ${String(Math.round(this.x)).padStart(4,'0')}  Y ${String(Math.round(this.y)).padStart(4,'0')}`;
 }
 frame(dt:number){
  if(!this.enabled||!this.visible)return;
  let tx=this.x-15,ty=this.y-15,tw=30,th=30;
  if(this.target&&this.target.isConnected){const r=this.target.getBoundingClientRect();if(r.width<innerWidth*.6&&r.height<innerHeight*.5){tx=r.left-6;ty=r.top-6;tw=r.width+12;th=r.height+12;}}
  const k=1-Math.exp(-dt*22);this.bx+=(tx-this.bx)*k;this.by+=(ty-this.by)*k;this.bw+=(tw-this.bw)*k;this.bh+=(th-this.bh)*k;
  this.el.style.setProperty('--x',`${this.x}px`);this.el.style.setProperty('--y',`${this.y}px`);
  this.box.style.transform=`translate(${this.bx}px,${this.by}px)`;this.box.style.width=`${this.bw}px`;this.box.style.height=`${this.bh}px`;
  this.label.style.transform=`translate(${this.bx}px,${this.by+this.bh+6}px)`;
 }
}

// Letters resolve out of noise, the way the PV's captions and map labels flicker into place.
const LATIN='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+<>*';const WIDE='▚▞▙▟■□▪◆◇▤▥';
const running=new WeakMap<HTMLElement,number>();
export function scramble(el:HTMLElement,ms=520,text?:string){
 const final=text??el.dataset.text??el.textContent??'';el.dataset.text=final;cancelAnimationFrame(running.get(el)??0);
 if(document.documentElement.dataset.reduced==='1'){el.textContent=final;return;}
 const chars=[...final];const start=performance.now();
 const step=(now:number)=>{const p=Math.min(1,(now-start)/ms);
  el.textContent=chars.map((c,i)=>c===' '||i/chars.length<p*1.15-.15?c:(/[　-鿿]/.test(c)?WIDE:LATIN)[Math.floor(Math.random()*(/[　-鿿]/.test(c)?WIDE.length:LATIN.length))]).join('');
  if(p<1)running.set(el,requestAnimationFrame(step));else el.textContent=final;};
 running.set(el,requestAnimationFrame(step));
}
export function countTo(el:HTMLElement,to:number,ms=700,pad=2){const from=Number(el.dataset.value??0);el.dataset.value=String(to);const start=performance.now();const step=(now:number)=>{const p=Math.min(1,(now-start)/ms);el.textContent=String(Math.round(from+(to-from)*(1-(1-p)**3))).padStart(pad,'0');if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);}

// Screen transitions: horizontal scan bands (PV 00:12), pixel mosaic (operator reveal) and a diagonal light wipe (activity entry).
export type Burst='scan'|'mosaic'|'wipe';
// Screen transitions: one eased light veil plus three held "frames" of construction marks (rings, links,
// numbered dots, a serif letter) that cut in and out like stop-motion — soft overall, stepped in detail.
function markFrame(r:()=>number,accent:string){
 const ink='#2a3034';const items:string[]=[];const pts:[number,number][]=[];
 for(let i=0;i<4+Math.floor(r()*3);i++){const x=8+r()*84,y=10+r()*78,rad=1.5+r()*7;pts.push([x,y]);items.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="${ink}" stroke-opacity=".55" stroke-width=".18"/>`);}
 for(let i=1;i<pts.length;i++)if(r()<.7)items.push(`<line x1="${pts[i-1][0].toFixed(1)}" y1="${pts[i-1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}" stroke="${ink}" stroke-opacity=".4" stroke-width=".12"/>`);
 const [dx,dy]=pts[0];items.push(`<circle cx="${dx+3}" cy="${dy-3}" r="1.3" fill="${ink}"/><text x="${dx+3}" y="${dy-2.55}" font-size="1.4" fill="#f3f5f4" text-anchor="middle" font-family="Consolas">${1+Math.floor(r()*9)}</text>`);
 const [cx,cy]=pts[pts.length-1];items.push(`<path d="M${cx-4} ${cy}h8M${cx} ${cy-4}v8" stroke="${accent}" stroke-width=".2"/>`);
 const ch='NACTIEVSOKR'[Math.floor(r()*11)];const lx=6+r()*80,ly=20+r()*70;items.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="${(8+r()*10).toFixed(1)}" font-family="Bodoni MT,Georgia,serif" fill="${ink}" fill-opacity=".75" transform="${r()<.5?`scale(-1 1) translate(${(-2*lx).toFixed(1)} 0)`:''}">${ch}</text>`);
 return `<svg class="fx-frame" viewBox="0 0 100 100" preserveAspectRatio="none">${items.join('')}</svg>`;
}
export function burst(layer:HTMLElement,kind:Burst,accent='#3a5bc2'){
 const r=rng(Math.floor(Math.random()*1e6));const parts:string[]=['<i class="fx-veil"></i>'];
 for(let i=0;i<3;i++)parts.push(markFrame(r,accent).replace('class="fx-frame"',`class="fx-frame" style="--f:${i}"`));
 if(kind==='mosaic')for(let i=0;i<10;i++){const s=1.2+r()*3.4;parts.push(`<i class="fx-block" style="left:${(30+r()*65).toFixed(1)}%;top:${(r()*90).toFixed(1)}%;width:${s.toFixed(1)}vw;height:${(s*(.3+r()*.6)).toFixed(1)}vw;background:${['var(--ink)','var(--cobalt)',accent,'#d5dadb'][Math.floor(r()*4)]};--f:${Math.floor(r()*3)}"></i>`);}
 layer.innerHTML=parts.join('');layer.className=`fx-${kind} run`;
 window.setTimeout(()=>{layer.className='';layer.innerHTML='';},900);
}

// Construction lines that join the pointer to the nearest joints, after the "Creation" frames at PV 00:45.
// Nodes drift slightly and are chained in fours like finger bones; everything is drawn soft, never crisp.
export type FieldNode={x:number;y:number;r:number;n?:number;seed:number};
export class NodeField{
 ctx:CanvasRenderingContext2D;nodes:FieldNode[]=[];hub={x:.5,y:.5};target={x:.5,y:.5};anchor={x:.6,y:.45,r:.2};w=0;h=0;active=false;auto=false;clock=0;ink='54,62,66';blue='58,91,194';alpha=1;
 constructor(public canvas:HTMLCanvasElement){this.ctx=canvas.getContext('2d')!;new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();}
 resize(){const dpr=Math.min(devicePixelRatio,1.5);this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;this.canvas.width=this.w*dpr;this.canvas.height=this.h*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 set(seed:number,region:[number,number,number,number],count:number,anchor:{x:number;y:number;r:number}){
  const r=rng(seed);const [x0,y0,x1,y1]=region;this.anchor=anchor;
  this.nodes=[...Array(count)].map((_,i)=>({x:x0+r()*(x1-x0),y:y0+r()*(y1-y0),r:4+r()*(i%5===0?22:10),n:i===2?1:i===7?2:undefined,seed:r()*10}));
  this.hub={x:anchor.x,y:anchor.y};this.target={...this.hub};
 }
 point(px:number,py:number){if(!this.w)return;this.target={x:px/this.w,y:py/this.h};}
 frame(dt:number){
  const c=this.ctx;c.clearRect(0,0,this.w,this.h);if(!this.active||!this.nodes.length)return;this.clock+=dt;
  if(this.auto)this.target={x:this.anchor.x+Math.cos(this.clock*.7)*this.anchor.r*.6,y:this.anchor.y+Math.sin(this.clock*1.1)*this.anchor.r*.35};
  const k=1-Math.exp(-dt*6);this.hub.x+=(this.target.x-this.hub.x)*k;this.hub.y+=(this.target.y-this.hub.y)*k;
  const hx=this.hub.x*this.w,hy=this.hub.y*this.h,reach=Math.min(this.w,this.h)*.42;
  const pos=this.nodes.map(n=>{const pull=Math.max(0,1-Math.hypot(n.x*this.w-hx,n.y*this.h-hy)/reach)*.03;return {x:(n.x+Math.sin(this.clock*.4+n.seed)*.004+(this.hub.x-n.x)*pull)*this.w,y:(n.y+Math.cos(this.clock*.33+n.seed)*.004+(this.hub.y-n.y)*pull)*this.h};});
  const ranked=this.nodes.map((n,i)=>({n,i,d:Math.hypot(pos[i].x-hx,pos[i].y-hy)})).sort((a,b)=>a.d-b.d);
  c.save();c.lineWidth=1;
  const ax=this.anchor.x*this.w,ay=this.anchor.y*this.h,ar=this.anchor.r*Math.min(this.w,this.h);
  c.save();c.translate(ax,ay);c.rotate(this.clock*.05);c.fillStyle=`rgba(${this.ink},${.38*this.alpha})`;for(let i=0;i<96;i++){const a=i/96*Math.PI*2;c.fillRect(Math.cos(a)*ar-1,Math.sin(a)*ar-1,1.5,1.5);}c.restore();
  // Finger-bone chains.
  c.strokeStyle=`rgba(${this.ink},${.26*this.alpha})`;c.beginPath();pos.forEach((p,i)=>{if(i%4===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.stroke();
  ranked.forEach(({n,i,d},rank)=>{const {x,y}=pos[i];const linked=rank<6&&d<reach;const a=(linked?.55:.16)*this.alpha;const rr=n.r*(1+(linked?Math.sin(this.clock*2+n.seed)*.08:0));
   c.strokeStyle=`rgba(${this.ink},${a})`;c.beginPath();c.arc(x,y,rr,0,Math.PI*2);c.stroke();
   if(linked){c.strokeStyle=`rgba(${rank===0?this.blue:this.ink},${(1-d/reach)*.6*this.alpha})`;c.beginPath();c.moveTo(hx,hy);c.lineTo(x-(x-hx)/d*rr,y-(y-hy)/d*rr);c.stroke();}
   if(n.n){c.fillStyle=`rgba(${this.ink},${.8*this.alpha})`;c.beginPath();c.arc(x+rr+10,y-rr,6.5,0,Math.PI*2);c.fill();c.fillStyle='#f4f6f3';c.font='bold 9px Consolas,monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(String(n.n),x+rr+10,y-rr+.5);}
  });
  const t=pos[2];if(t){c.save();c.translate(t.x+22,t.y+18);c.rotate(Math.PI/2);c.fillStyle=`rgba(${this.ink},${.55*this.alpha})`;c.font='8px Consolas,monospace';c.fillText('C O V E N A N T',0,0);c.restore();}
  c.strokeStyle=`rgba(${this.blue},${.7*this.alpha})`;c.beginPath();c.moveTo(hx-9,hy);c.lineTo(hx+9,hy);c.moveTo(hx,hy-9);c.lineTo(hx,hy+9);c.stroke();
  c.strokeStyle=`rgba(${this.ink},${.35*this.alpha})`;c.beginPath();c.arc(hx,hy,18+Math.sin(this.clock*2)*2,0,Math.PI*2);c.stroke();
  c.restore();
 }
}

// Click marks: a ring, a crosshair, the coordinate and a stamped letter that fade like PV annotations.
export function ripple(layer:HTMLElement,x:number,y:number){
 const ch='NACTIEVSOKRL'[Math.floor(Math.random()*12)];const el=document.createElement('div');el.className='ripple';el.style.left=`${x}px`;el.style.top=`${y}px`;
 el.innerHTML=`<i></i><i></i><b>${ch}</b><span>${String(Math.round(x)).padStart(4,'0')} · ${String(Math.round(y)).padStart(4,'0')}</span>`;layer.append(el);setTimeout(()=>el.remove(),1500);
}

// Floating letters occasionally smear, flip and turn into another letter.
export function morphGlyph(container:HTMLElement){
 const list=[...container.querySelectorAll<HTMLElement>('.glyph:not(.key)')];if(!list.length)return;const g=list[Math.floor(Math.random()*list.length)];
 g.classList.remove('morphing');void g.offsetWidth;g.classList.add('morphing');
 setTimeout(()=>{g.textContent='NACTIEVSOKRΛИ'[Math.floor(Math.random()*13)];g.classList.toggle('flip-x');},260);
 setTimeout(()=>g.classList.remove('morphing'),700);
}

// Where an object-fit:contain image actually paints, plus a cheap alpha probe so tools only react over the figure.
const alphaCache=new Map<string,{data:Uint8ClampedArray;w:number;h:number}|null>();
export function paintedRect(img:HTMLImageElement,posX:number,posY:number){
 const r=img.getBoundingClientRect();if(!img.naturalWidth||!r.width)return null;const s=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight);
 const w=img.naturalWidth*s,h=img.naturalHeight*s;return {left:r.left+(r.width-w)*posX,top:r.top+(r.height-h)*posY,width:w,height:h};
}
export function opaqueAt(img:HTMLImageElement,u:number,v:number){
 if(!alphaCache.has(img.src)){try{const w=160,h=Math.round(160*img.naturalHeight/img.naturalWidth);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(img,0,0,w,h);alphaCache.set(img.src,{data:x.getImageData(0,0,w,h).data,w,h});}catch{alphaCache.set(img.src,null);}}
 const a=alphaCache.get(img.src);if(!a)return true;const px=Math.floor(u*a.w),py=Math.floor(v*a.h);if(px<0||py<0||px>=a.w||py>=a.h)return false;return a.data[(py*a.w+px)*4+3]>40;
}

// Crop frame with blue corner handles and a magnified, full-colour sample of the artwork.
export class Loupe{
 el=document.createElement('div');inner=document.createElement('div');label=document.createElement('span');zoom=2.4;size=138;
 constructor(root:HTMLElement){this.el.id='loupe';this.el.setAttribute('aria-hidden','true');this.el.innerHTML='<b></b><b></b><b></b><b></b>';this.inner.className='loupe-image';this.label.className='loupe-label';this.el.prepend(this.inner);this.el.append(this.label);root.append(this.el);}
 show(img:HTMLImageElement,x:number,y:number,posX:number,posY:number){
  const p=paintedRect(img,posX,posY);if(!p)return this.hide();const u=(x-p.left)/p.width,v=(y-p.top)/p.height;
  if(u<0||v<0||u>1||v>1||!opaqueAt(img,u,v))return this.hide();
  const z=this.zoom,s=this.size;this.el.classList.add('visible');this.el.style.transform=`translate(${x-s/2}px,${y-s/2}px)`;
  this.inner.style.backgroundImage=`url("${img.currentSrc||img.src}")`;this.inner.style.backgroundSize=`${p.width*z}px ${p.height*z}px`;this.inner.style.backgroundPosition=`${-(u*p.width*z-s/2)}px ${-(v*p.height*z-s/2)}px`;
  this.label.textContent=`x ${u.toFixed(3)}  y ${v.toFixed(3)}  ×${z.toFixed(1)}`;
 }
 hide(){this.el.classList.remove('visible');}
}
export function annotate(layer:HTMLElement,img:HTMLImageElement,posX:number,posY:number,points:{u:number;v:number;label:string;size?:number}[]){
 const p=paintedRect(img,posX,posY);const base=layer.getBoundingClientRect();if(!p){layer.innerHTML='';return;}
 layer.innerHTML=points.map((pt,i)=>{const s=pt.size??96,z=2;const x=p.left-base.left+pt.u*p.width,y=p.top-base.top+pt.v*p.height;
  return `<div class="crop-box" style="left:${x-s/2}px;top:${y-s/2}px;width:${s}px;height:${s}px;--i:${i}"><div class="crop-image" style="background-image:url('${img.currentSrc||img.src}');background-size:${p.width*z}px ${p.height*z}px;background-position:${-(pt.u*p.width*z-s/2)}px ${-(pt.v*p.height*z-s/2)}px"></div><b></b><b></b><b></b><b></b><span>${pt.label}</span></div>`;}).join('');
}
