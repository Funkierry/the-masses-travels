// Presentation layer for the demo recording only: chapter cards and hand-drawn call-outs, drawn in the
// site's own language (outline numerals, brush sweeps, wobbling rings). Not part of the site.
(()=>{
 const css=`
 .dm-card{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:"Bodoni MT",Georgia,serif;
  clip-path:polygon(0 0,0 0,-12% 100%,-12% 100%);animation:dm-wipe 2.8s cubic-bezier(.7,0,.2,1) both}
 @keyframes dm-wipe{0%{clip-path:polygon(0 0,0 0,-12% 100%,-12% 100%)}24%{clip-path:polygon(0 0,112% 0,100% 100%,-12% 100%)}72%{clip-path:polygon(0 0,112% 0,100% 100%,-12% 100%)}100%{clip-path:polygon(112% 0,112% 0,100% 100%,100% 100%)}}
 .dm-card .bg{position:absolute;inset:0;background:#eff1ef}
 .dm-card .dots{position:absolute;inset:0;background:radial-gradient(circle,#3a5bc244 1.4px,transparent 1.6px) 0 0/34px 34px}
 .dm-card svg{position:absolute;inset:0;width:100%;height:100%}
 .dm-card .num{position:absolute;left:12%;top:16%;font-size:430px;line-height:1;color:transparent;-webkit-text-stroke:2.4px #3a5bc2;letter-spacing:-20px;animation:dm-num 2.8s both}
 .dm-card .num.echo{-webkit-text-stroke:1.6px #c94b5c;opacity:.35;translate:7px 5px}
 @keyframes dm-num{0%,14%{opacity:0;translate:-60px 0}34%{opacity:1;translate:0 0}}
 .dm-card .cn{position:absolute;left:46%;top:36%;font:400 92px "Noto Serif SC","Source Han Serif SC",STSong,serif;letter-spacing:.3em;color:#22282b;animation:dm-in 2.8s both .05s}
 .dm-card .en{position:absolute;left:46.3%;top:50%;font:600 20px Consolas,monospace;letter-spacing:.5em;color:#3a5bc2;animation:dm-in 2.8s both .1s}
 .dm-card .sub{position:absolute;left:46.3%;top:56%;font:24px "Noto Serif SC",STSong,serif;letter-spacing:.12em;color:#4b5559;animation:dm-in 2.8s both .15s}
 .dm-card .tag{position:absolute;left:46.3%;top:30%;background:#22282b;color:#fff;font:600 15px Consolas,monospace;letter-spacing:4px;padding:6px 14px;animation:dm-in 2.8s both}
 @keyframes dm-in{0%,18%{opacity:0;translate:40px 0}38%{opacity:1;translate:0 0}}
 .dm-card .sweep{fill:#3a5bc2;opacity:.85;animation:dm-sweep 2.8s both}
 @keyframes dm-sweep{0%,20%{opacity:0;scale:.6 1}42%{opacity:.85;scale:1 1}}
 .dm-card .ring{fill:none;stroke:#22282b;stroke-width:1.6;stroke-dasharray:1;stroke-dashoffset:1;animation:dm-draw 2.8s cubic-bezier(.6,0,.2,1) both}
 @keyframes dm-draw{0%,16%{stroke-dashoffset:1}48%,100%{stroke-dashoffset:0}}
 .dm-card .blk{animation:dm-blk 2.8s ease-out both}
 @keyframes dm-blk{0%,24%{opacity:0;translate:-12px 0}40%,100%{opacity:.85;translate:0 0}}
 .dm-note{position:fixed;left:0;top:0;z-index:2147482000;pointer-events:none;animation:dm-note 3.2s both}
 @keyframes dm-note{0%{opacity:0}8%,82%{opacity:1}100%{opacity:0}}
 .dm-note svg{position:absolute;left:-60px;top:-60px;width:400px;height:200px;overflow:visible}
 .dm-note .r{fill:none;stroke:#3a5bc2;stroke-width:2.2;stroke-dasharray:1;animation:dm-draw2 .6s cubic-bezier(.6,0,.2,1) both}
 .dm-note .l{fill:none;stroke:#3a5bc2;stroke-width:1.4;stroke-dasharray:1;animation:dm-draw2 .5s both .25s}
 @keyframes dm-draw2{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
 .dm-note .lab{position:absolute;left:96px;top:-74px;white-space:nowrap;background:#22282bee;color:#f3f4f2;padding:7px 14px 8px;font:20px "Noto Serif SC",STSong,serif;letter-spacing:.12em;animation:dm-in2 .5s both .3s}
 .dm-note .lab small{display:block;font:11px Consolas,monospace;letter-spacing:3px;color:#9fb3ff;margin-top:3px}
 @keyframes dm-in2{from{opacity:0;translate:-10px 0}}
 .dm-end{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:grid;place-items:center;animation:dm-fade 3.4s both}
 @keyframes dm-fade{0%{opacity:0}20%,100%{opacity:1}}
 .dm-end .bg{position:absolute;inset:0;background:#eff1efee}
 .dm-end .t{position:relative;text-align:center}
 .dm-end h1{font:400 120px "Noto Serif SC",STSong,serif;letter-spacing:.35em;margin:0 0 0 .35em;color:#22282b}
 .dm-end p{font:600 18px Consolas,monospace;letter-spacing:.6em;color:#3a5bc2;margin:26px 0 0}
 .dm-end em{display:block;font:italic 40px "Bodoni MT",Georgia,serif;color:#4b5559;margin-top:18px;letter-spacing:.05em}
 `;
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 // Seeded hand-drawn ring and brush sweep, same idea as the site's sketch module.
 const rng=s=>()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};
 const ring=(cx,cy,R,r,amp=2,sy=1)=>{const a0=r()*6.28,k=1+Math.floor(r()*2),p=r()*6.28,pts=[];for(let i=0;i<=64;i++){const a=a0+(6.28+.3)*i/64,rr=R+Math.sin(a*k+p)*amp+Math.sin(a*3+p*2)*amp*.4;pts.push(`${(cx+Math.cos(a)*rr).toFixed(1)} ${(cy+Math.sin(a)*rr*sy).toFixed(1)}`);}return 'M'+pts.join('L');};
 const brush=(x1,y1,x2,y2,w,amp)=>{const n=24,L=[],R=[];for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t+Math.sin(t*Math.PI*1.6)*amp,h=w*Math.pow(Math.sin(Math.PI*t),.75)/2;L.push(`${x.toFixed(1)} ${(y-h).toFixed(1)}`);R.unshift(`${x.toFixed(1)} ${(y+h).toFixed(1)}`);}return `M${L.join('L')}L${R.join('L')}Z`;};
 let seed=7;
 window.__demo={
  card(no,cn,en,sub){const r=rng(seed+=31);const d=document.createElement('div');d.className='dm-card';
   const blocks=[...Array(9)].map(()=>`<rect class="blk" x="${(100+r()*1700).toFixed(0)}" y="${(80+r()*900).toFixed(0)}" width="${(10+r()*90).toFixed(0)}" height="${(8+r()*36).toFixed(0)}" fill="${['#3a5bc2','#22282b','#c94b5c','#c7cecd'][Math.floor(r()*4)]}"/>`).join('');
   d.innerHTML=`<i class="bg"></i><i class="dots"></i><svg viewBox="0 0 1920 1080" preserveAspectRatio="none"><path class="sweep" d="${brush(140,860,1820,640,70,40)}"/><path class="ring" pathLength="1" d="${ring(470,430,300,r,6)}"/><path class="ring" pathLength="1" style="stroke-width:.8;opacity:.5" d="${ring(470,430,330,r,8)}"/>${blocks}</svg>
    <span class="num echo">${no}</span><span class="num">${no}</span><span class="tag">CHAPTER ${no}</span><span class="cn">${cn}</span><span class="en">${en}</span><span class="sub">${sub}</span>`;
   document.body.append(d);setTimeout(()=>d.remove(),2850);},
  note(x,y,cn,en){const r=rng(seed+=17);const d=document.createElement('div');d.className='dm-note';d.style.left=x+'px';d.style.top=y+'px';
   d.innerHTML=`<svg viewBox="-60 -60 400 200"><path class="r" pathLength="1" d="${ring(0,0,30,r,2)}"/><path class="l" pathLength="1" d="M24 -20Q60 -60 96 -56"/></svg><span class="lab">${cn}<small>${en}</small></span>`;
   document.body.append(d);setTimeout(()=>d.remove(),3250);},
  end(){const d=document.createElement('div');d.className='dm-end';d.innerHTML=`<i class="bg"></i><div class="t"><h1>众生行记</h1><em>The Masses' Travels</em><p>INTERACTIVE GRAPHIC ATLAS</p></div>`;document.body.append(d);}
 };
})();
