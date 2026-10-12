import { assetUrl } from './assets.ts';
import { BIRD, flock, rng } from './graphics.ts';
import { clamp } from './util.ts';

// A PV passage played behind the route map and scrubbed by dragging (PV 00:10–00:16 and after):
// one bird splits into a tracked flock, a scan glitch cuts to a blueprint plant drawing itself left to
// right, then a haloed figure unfolds its wings, then two hands reach for each other. Drag forward to play,
// drag back to rewind; the drawing itself is smooth, the cuts and pop-ins carry the frame-by-frame feel.
export type SeqStage={id:'flock'|'plant'|'halo'|'hands';from:number;to:number;label:string;pv:string};
export const STAGES:SeqStage[]=[
 {id:'flock',from:0,to:.27,label:'羽兽何以飞翔',pv:'00:12'},
 {id:'plant',from:.31,to:.58,label:'草木何以着花',pv:'00:14'},
 {id:'halo',from:.62,to:.84,label:'光环之下',pv:'00:24'},
 {id:'hands',from:.88,to:1,label:'以众生之名',pv:'00:45'}
];
const CUTS=[.29,.60,.86];
const BURST=.5;               // seconds of scan glitch after each cut
const ease=(x:number)=>1-(1-clamp(x))**3;
const birdPath=new Path2D(BIRD);
const INK='rgba(40,46,50,',BLUE='rgba(58,91,194,';

type Leaf={x:number;y:number;dx:number;dy:number;kind:'leaf'|'stamen';len:number;rot:number;n:number};
function plant(){const r=rng(17);const stem:[number,number][]=[];for(let i=0;i<=60;i++){const x=i/60;stem.push([x,.56+Math.sin(x*5.2)*.06+Math.sin(x*13)*.012]);}
 const leaves:Leaf[]=[];[.07,.16,.25,.34,.43,.52,.6,.69,.78,.87,.95].forEach((x,i)=>{const up=i%2===0;leaves.push({x,y:.56+Math.sin(x*5.2)*.06,dx:.03+r()*.04,dy:(up?-1:1)*(.08+r()*.12),kind:i%3===1?'stamen':'leaf',len:.07+r()*.07,rot:(up?-1:1)*(.3+r()*.6),n:Math.floor(10+r()*40)});});
 return {stem,leaves};}

export class PvSequence{
 ctx:CanvasRenderingContext2D;buf=document.createElement('canvas');bx:CanvasRenderingContext2D;w=0;h=0;p=0;target=0;clock=0;speed=0;shown='';burst=0;lastBurst=-1;
 birds=flock(9,40).sort((a,b)=>a.x-b.x);plant=plant();hands:HTMLCanvasElement[]=[];greys:HTMLCanvasElement[]=[];handImgs:HTMLImageElement[]=[];reduced=false;
 constructor(public canvas:HTMLCanvasElement){
  this.ctx=canvas.getContext('2d')!;this.bx=this.buf.getContext('2d')!;
  ['game/hand-white.webp','game/arm-hand.webp'].forEach((src,i)=>{const img=new Image();img.onload=()=>{this.handImgs[i]=img;
   // Pre-tinted copy (filters run once at load, never per frame).
   const tint=(f:string)=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d')!;x.filter=f;x.drawImage(img,0,0);return c;};
   this.hands[i]=tint('grayscale(1) sepia(1) hue-rotate(178deg) saturate(2.8) brightness(.8)');this.greys[i]=tint('grayscale(1) brightness(.6) contrast(1.3)');};img.src=assetUrl(src);});
 }
 resize(w:number,h:number){this.w=w;this.h=h;const dpr=Math.min(devicePixelRatio,1.25);for(const c of [this.canvas,this.buf]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}this.ctx.setTransform(dpr,0,0,dpr,0,0);this.bx.setTransform(dpr,0,0,dpr,0,0);}
 stageAt(p:number){return p<CUTS[0]?STAGES[0]:p<CUTS[1]?STAGES[1]:p<CUTS[2]?STAGES[2]:STAGES[3];}
 frame(dt:number,progress:number,speed:number){
  if(!this.w)return;this.clock+=dt;this.target=progress;this.p+=(this.target-this.p)*(1-Math.exp(-dt*(this.reduced?40:9)));this.speed+=(speed-this.speed)*(1-Math.exp(-dt*8));
  const b=this.bx,p=this.p;b.clearRect(0,0,this.w,this.h);
  const s=this.stageAt(p);const q=clamp((p-s.from)/(s.to-s.from));
  // The drawing occupies the left part of the view; the detail panel covers the right.
  const box={x:this.w*.02,y:this.h*.08,w:this.w*.66,h:this.h*.84};
  this.drawPaper(b,box,s.id);
  if(s.id==='flock')this.drawFlock(b,box,q);else if(s.id==='plant')this.drawPlant(b,box,q);else if(s.id==='halo')this.drawHalo(b,box,q);else this.drawHands(b,box,q);
  this.drawCaption(b,box,p);
  // Scan glitch fires once when the drawing actually cuts to another stage and decays; parking on a cut
  // stays clean. Fast drags add a light flicker that fades as soon as the map stops.
  if(s.id!==this.shown){if(this.shown&&this.clock-this.lastBurst>.25){this.burst=BURST;this.lastBurst=this.clock;}this.shown=s.id;}
  this.burst=Math.max(0,this.burst-dt);
  const g=this.reduced?0:Math.max((this.burst/BURST)**1.5,clamp((this.speed-.18)*.7,0,.3));
  const c=this.ctx;c.clearRect(0,0,this.w,this.h);
  if(g<.02){c.drawImage(this.buf,0,0,this.w,this.h);return;}
  const bh=this.buf.height/this.h;let y=0;
  while(y<this.h){const hgt=4+Math.random()*28;const off=(Math.random()-.5)*g*(Math.random()<.3?220:60);c.drawImage(this.buf,0,y*bh,this.buf.width,hgt*bh,off,y,this.w,hgt);if(Math.random()<g*.5){c.fillStyle=Math.random()<.5?BLUE+(g*.35).toFixed(2)+')':`rgba(255,255,255,${(g*.5).toFixed(2)})`;c.fillRect(0,y,this.w,hgt*(.2+Math.random()*.6));}y+=hgt;}
  c.fillStyle=`rgba(58,91,194,${(g*.08).toFixed(3)})`;for(let yy=0;yy<this.h;yy+=3)c.fillRect(0,yy,this.w,1);
 }
 // A soft sheet of paper behind the drawing so it reads over the map; dotted like the PV's blueprint plates.
 // Draw a single stage straight to the screen — used by the film's shots.
 drawPaper(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},id:string){
  const cx=box.x+box.w*.45,cy=box.y+box.h*.5;const g=c.createRadialGradient(cx,cy,0,cx,cy,box.w*.62);
  const tone=id==='plant'||id==='flock'?'228,233,235':'240,242,240';g.addColorStop(0,`rgba(${tone},.86)`);g.addColorStop(.62,`rgba(${tone},.6)`);g.addColorStop(1,`rgba(${tone},0)`);c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
  c.fillStyle=BLUE+'.22)';for(let y=box.y+18;y<box.y+box.h;y+=38)for(let x=box.x+18;x<box.x+box.w;x+=38){const d=Math.hypot(x-cx,(y-cy)*1.4)/(box.w*.6);if(d<1)c.fillRect(x,y,1.6,1.6);}
 }
 drawFlock(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},q:number){
  const k=box.w/1600;const n=this.birds.length;const origin=this.birds[0];
  this.birds.forEach((bd,i)=>{
   const start=.02+(i/n)*.58;const t=ease((q-start)/.14);if(q<start&&i>0)return;const tt=i===0?1:t;
   const ox=box.x+origin.x*k,oy=box.y+(origin.y*k)*(box.h/(700*k));
   const tx=box.x+bd.x*k+Math.sin(this.clock*.4+i)*4,ty=box.y+bd.y*k*(box.h/(700*k))+Math.cos(this.clock*.5+i)*3;
   const x=ox+(tx-ox)*tt,y=oy+(ty-oy)*tt-Math.sin(tt*Math.PI)*40*k*4;const sc=bd.s*k*(.55+tt*.45)*(i===0&&q<.08?1.6:1);
   c.save();c.translate(x,y);c.rotate((bd.r*tt)*Math.PI/180);c.scale(bd.flip?-sc:sc,sc);c.translate(-50,-30);
   const fresh=tt<.18;c.fillStyle=fresh?'rgba(255,255,255,.95)':'rgba(222,227,229,.88)';c.fill(birdPath);
   if(!fresh){c.lineWidth=1.5/sc;c.strokeStyle=BLUE+'.85)';c.stroke(birdPath);}
   c.restore();
   if(tt>.6&&i%2===0){const bs=62*bd.s*k;c.strokeStyle=INK+(Math.floor(this.clock*6+i)%9===0?'.15)':'.5)');c.lineWidth=1;c.strokeRect(x-bs/2,y-bs/2,bs,bs);c.fillStyle=BLUE+'.8)';c.font='9px Consolas,monospace';c.fillText(String(bd.n),x+bs/2+3,y-bs/2+8);}
  });
 }
 drawPlant(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},q:number){
  const X=(u:number)=>box.x+u*box.w,Y=(v:number)=>box.y+v*box.h;const front=q*1.12;
  c.lineWidth=1.7;c.strokeStyle=BLUE+'.85)';c.beginPath();let started=false;
  for(let i=0;i<this.plant.stem.length;i++){const [u,v]=this.plant.stem[i];if(u>front){const [pu,pv]=this.plant.stem[i-1]??[0,v];const f=(front-pu)/(u-pu);if(f>0)c.lineTo(X(pu+(u-pu)*f),Y(pv+(v-pv)*f));break;}started?c.lineTo(X(u),Y(v)):c.moveTo(X(u),Y(v));started=true;}
  c.stroke();
  // Second, fainter stem offset like the PV's doubled outline.
  c.strokeStyle=BLUE+'.25)';c.beginPath();this.plant.stem.forEach(([u,v],i)=>{if(u>front)return;i?c.lineTo(X(u),Y(v+.012)):c.moveTo(X(u),Y(v+.012));});c.stroke();
  const joints:[number,number][]=[];
  this.plant.leaves.forEach(l=>{const k=clamp((front-l.x)/.09);if(k<=0)return;
   const bx=X(l.x),by=Y(l.y),ex=X(l.x+l.dx*k),ey=Y(l.y+l.dy*k);c.lineWidth=1.5;c.strokeStyle=BLUE+'.85)';c.beginPath();c.moveTo(bx,by);c.lineTo(ex,ey);c.stroke();joints.push([ex,ey]);
   if(k<.45)return;const kk=(k-.45)/.55;
   c.save();c.translate(ex,ey);c.rotate(l.rot);
   if(l.kind==='leaf'){const L=l.len*box.w,W=L*.22;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(L*.5,-W*2,L*kk,0);c.quadraticCurveTo(L*.5,W*2*kk,0,0);c.fillStyle='rgba(226,231,233,.6)';c.fill();c.stroke();c.strokeStyle=BLUE+'.3)';c.beginPath();c.moveTo(0,0);c.lineTo(L*kk*.9,0);c.stroke();}
   else for(let s=0;s<5;s++){const a=(s-2)*.22,L=l.len*box.w*.8*kk;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*L,Math.sin(a)*L);c.stroke();c.beginPath();c.ellipse(Math.cos(a)*L,Math.sin(a)*L,4,1.6,a,0,Math.PI*2);c.stroke();}
   c.restore();
   if(kk>.6){c.fillStyle=BLUE+'.8)';c.font='9px Consolas,monospace';c.fillText(String(l.n),ex+8,ey-6);}
  });
  // Construction rings pop in at joints and get linked once the drawing is mostly done.
  const ringsOn=Math.floor(clamp((q-.45)/.5)*joints.length);
  for(let i=0;i<ringsOn;i++){const [x,y]=joints[i*2%joints.length];const age=(q-.45)/.5*joints.length-i;c.strokeStyle=INK+'.6)';c.lineWidth=age<.6?2:1;c.beginPath();c.arc(x,y,age<.6?18:12,0,Math.PI*2);c.stroke();
   if(i>0){const [px,py]=joints[(i-1)*2%joints.length];c.lineWidth=1;c.strokeStyle=INK+'.4)';c.beginPath();c.moveTo(px,py);c.lineTo(x,y);c.stroke();}}
  c.lineWidth=1;
 }
 drawHalo(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},q:number){
  const cx=box.x+box.w*.42,cy=box.y+box.h*.5,S=box.h/700;
  // Halo and robe draw on, wings unfold, blue stepped echoes cut in.
  c.lineWidth=1.3;c.strokeStyle=BLUE+'.8)';c.beginPath();c.ellipse(cx,cy-260*S,58*S,13*S,0,-Math.PI/2,-Math.PI/2+Math.PI*2*ease(q/.3));c.stroke();
  const open=ease((q-.15)/.6);
  for(const side of [-1,1])for(let i=0;i<7;i++){const a=(-4+i*17)*side*open*Math.PI/180;const len=(170+i*30)*S*(.4+.6*ease((q-.1-i*.05)/.3)),w=(16+i*1.5)*S;
   c.save();c.translate(cx+side*50*S,cy-150*S);c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(w,-len*.35,0,-len);c.quadraticCurveTo(-w,-len*.35,0,0);c.fillStyle='rgba(224,229,232,.75)';c.fill();c.strokeStyle=BLUE+'.7)';c.stroke();c.restore();}
  const robe=ease((q-.05)/.4);c.save();c.beginPath();c.rect(0,0,this.w,cy-260*S+robe*620*S);c.clip();
  c.beginPath();c.arc(cx,cy-205*S,34*S,0,Math.PI*2);c.moveTo(cx-50*S,cy-150*S);c.quadraticCurveTo(cx-80*S,cy-80*S,cx-130*S,cy+300*S);c.lineTo(cx+130*S,cy+300*S);c.quadraticCurveTo(cx+80*S,cy-80*S,cx+50*S,cy-150*S);c.closePath();c.fillStyle='rgba(230,234,236,.9)';c.fill();c.strokeStyle=BLUE+'.8)';c.stroke();c.restore();
  c.strokeStyle=BLUE+'.8)';c.beginPath();c.moveTo(cx-16*S,cy-205*S);c.lineTo(cx+16*S,cy-205*S);c.moveTo(cx,cy-221*S);c.lineTo(cx,cy-189*S);c.stroke();
  [[.2,-.3,90,180],[.28,.1,70,240],[.66,-.4,100,140],[.72,.05,70,110]].forEach(([u,v,w,h],i)=>{if(q<.35+i*.12)return;const x=box.x+box.w*u,y=cy+box.h*v;for(let e=2;e>=0;e--){c.fillStyle=BLUE+[.25,.5,.9][e]+')';c.beginPath();c.moveTo(x-e*7,y+e*9);for(let t=0;t*14<h*S;t++)c.lineTo(x+w*S+(t%2?10:0)-e*7,y+t*14+e*9);c.lineTo(x-e*7,y+h*S+e*9);c.closePath();c.fill();}});
  c.strokeStyle=INK+'.3)';c.lineWidth=1;c.beginPath();c.arc(box.x+box.w*.15,cy,box.h*.36,0,Math.PI*2*ease(q/.5));c.stroke();c.beginPath();c.arc(box.x+box.w*.78,cy,box.h*.3,0,Math.PI*2*ease((q-.2)/.5));c.stroke();
 }
 drawHands(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},q:number){
  const [L,R]=this.handImgs;if(!L||!R||!this.greys[1])return;const gap=1-ease(q/.85);
  const lw=box.w*.46,lh=lw*L.height/L.width,rw=box.w*.55,rh=rw*R.height/R.width;
  const lx=box.x+box.w*.47-.955*lw-gap*box.w*.12,ly=box.y+box.h*.45-.235*lh,rx=box.x+box.w*.53-.335*rw+gap*box.w*.2,ry=box.y+box.h*.45-.27*rh;
  const blue=q<.55?1:Math.max(0,1-(q-.55)*3);
  for(const [grey,tint,x,y,w,h] of [[this.greys[0],this.hands[0],lx,ly,lw,lh],[this.greys[1],this.hands[1],rx,ry,rw,rh]] as const){c.globalAlpha=.9;c.drawImage(grey,x,y,w,h);c.globalAlpha=blue*.95;c.drawImage(tint,x,y,w,h);c.globalAlpha=1;}
  const lt=[lx+.955*lw,ly+.235*lh],rt=[rx+.335*rw,ry+.27*rh];
  c.strokeStyle=INK+'.5)';c.lineWidth=1;for(const [x,y,r] of [[lt[0],lt[1],8],[lx+.66*lw,ly+.37*lh,lw*.17],[rt[0],rt[1],8],[rx+.5*rw,ry+.38*rh,rw*.14]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
  c.setLineDash([3,4]);c.strokeStyle=BLUE+'.7)';c.beginPath();c.moveTo(lt[0],lt[1]);c.lineTo(rt[0],rt[1]);c.stroke();c.setLineDash([]);
  const word='COVENANT';c.font=`400 ${Math.round(box.h*.06)}px "Bodoni MT",Georgia,serif`;c.fillStyle=INK+'.85)';const shown=Math.floor(clamp((q-.4)/.5)*word.length);c.fillText(word.slice(0,shown),box.x+box.w*.34,box.y+box.h*.66);
 }
 drawCaption(c:CanvasRenderingContext2D,box:{x:number;y:number;w:number;h:number},p:number){
  const reached=STAGES.filter(s=>p>=s.from-.01);c.font='14px "Noto Serif SC",STSong,serif';c.textAlign='center';
  reached.slice(-2).forEach((s,i,arr)=>{const y=box.y+box.h*.96-(arr.length-1-i)*20;c.lineWidth=3;c.strokeStyle='rgba(34,40,43,.55)';c.strokeText(s.label,box.x+box.w*.5,y);c.fillStyle='rgba(246,247,245,.95)';c.fillText(s.label,box.x+box.w*.5,y);});
  c.textAlign='start';
 }
}
