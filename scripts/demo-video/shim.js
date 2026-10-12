// Virtual clock for frame-exact capture. Installed before any page script: time only moves when the
// recorder calls __advance(ms), which runs due timers, then animation-frame callbacks, then steps every
// CSS animation, transition and Web Animation to the same virtual time.
(()=>{
 const W=window;let vt=0;const dateBase=Date.now();
 const RealDate=Date;
 performance.now=()=>vt;
 W.Date=class extends RealDate{constructor(...a){a.length?super(...a):super(dateBase+vt);}static now(){return dateBase+vt;}};
 let raf=[],rafId=0;
 W.requestAnimationFrame=cb=>{const id=++rafId;raf.push([id,cb]);return id;};
 W.cancelAnimationFrame=id=>{raf=raf.filter(([i])=>i!==id);};
 const timers=new Map();let tid=0;
 const add=(cb,ms,a,every)=>{const id=++tid;timers.set(id,{at:vt+Math.max(0,+ms||0),cb,a,every});return id;};
 W.setTimeout=(cb,ms,...a)=>add(cb,ms,a,0);W.setInterval=(cb,ms,...a)=>add(cb,ms,a,Math.max(1,+ms||1));
 W.clearTimeout=W.clearInterval=id=>{timers.delete(id);};
 const start=new WeakMap();
 W.__vt=()=>vt;
 W.__advance=(dt)=>{
  const end=vt+dt;
  for(let guard=0;guard<10000;guard++){let best=null;for(const e of timers)if(e[1].at<=end&&(!best||e[1].at<best[1].at))best=e;if(!best)break;
   const [id,t]=best;vt=Math.max(vt,t.at);if(t.every)t.at+=t.every;else timers.delete(id);try{typeof t.cb==='function'?t.cb(...t.a):0;}catch(e){console.error(e);}}
  vt=end;
  const q=raf;raf=[];for(const [,cb] of q){try{cb(vt);}catch(e){console.error(e);}}
  for(const a of document.getAnimations()){
   if(!start.has(a)){start.set(a,vt-(a.currentTime??0));}
   const ct=Math.max(0,vt-start.get(a)),endAt=a.effect?.getComputedTiming().endTime;
   // Past its end: finish it, so finish events fire and the animation leaves the list.
   if(Number.isFinite(endAt)&&ct>=endAt){if(a.playState!=='finished')try{a.finish();}catch{}continue;}
   if(a.playState!=='paused')a.pause();
   try{a.currentTime=ct;}catch{}
  }
  return vt;
 };
})();
