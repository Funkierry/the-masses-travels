import { rng, BIRD } from './graphics.ts';
import type { Operator } from './data.ts';

// Graphic plates drawn in place of artwork: a personnel plate per operator, the home key plate and a
// small plate per record, in the PV and activity UI's graphic language. Lines are drawn by hand rather
// than ruled: rings wobble and overshoot their start, rules bow and run past their marks, accents are
// brush strokes that swell and taper, and key lines get a second, slightly offset pass like misregistered
// print. Plates are stacks of sheets so depth-of-field blur, parallax and rotation run on composited layers.
// Colours come in as a theme so the same markup works inline (CSS variables) and as an image (hex).
export type PlateTheme={ink:string;paper:string;accent:string;cobalt:string;muted:string};
export const PAGE:PlateTheme={ink:'var(--pl-ink)',paper:'var(--pl-paper)',accent:'var(--pl-accent)',cobalt:'var(--pl-cobalt)',muted:'var(--pl-muted)'};
// Single-quoted families: these sit inside double-quoted style attributes.
const SERIF="'Bodoni MT','Bodoni 72',Didot,Georgia,serif",MONO="Consolas,'Cascadia Mono',monospace",CN="'Noto Serif SC','Source Han Serif SC',STSong,SimSun,serif";
const f=(n:number)=>n.toFixed(1);
const TAU=Math.PI*2;
let uid=0;
type P=[number,number];
type R=()=>number;

/* ── Hand-drawn geometry ───────────────────────────────────────────────── */
// Catmull-Rom through the points, as cubic Béziers.
function curve(pts:P[],closed=false){
 const n=pts.length;const at=(i:number)=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];let d='';
 for(let i=0;i<(closed?n:n-1);i++){const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
  d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;}
 return d;
}
const path=(pts:P[],closed=false)=>`M${f(pts[0][0])} ${f(pts[0][1])}${curve(pts,closed)}${closed?'Z':''}`;
// Low-frequency radial wobble: two sines with random phase, so a ring breathes rather than jitters.
function wobble(r:R){const a=r()*TAU,b=r()*TAU,k=1+Math.floor(r()*2),m=3+Math.floor(r()*3);return (t:number)=>Math.sin(t*k+a)*.65+Math.sin(t*m+b)*.35;}
function arcPts(cx:number,cy:number,rad:number,a0:number,a1:number,r:R,amp=1.6,sy=1):P[]{
 const w=wobble(r);const n=Math.max(6,Math.ceil(Math.abs(a1-a0)*rad/26));
 return [...Array(n+1)].map((_,i)=>{const a=a0+(a1-a0)*i/n,rr=rad+w(a)*amp;return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*sy] as P;});
}
// A ring drawn in one stroke: it starts anywhere and overshoots its start a little.
const ring=(cx:number,cy:number,rad:number,r:R,amp=1.6,sy=1)=>{const a0=r()*TAU;return path(arcPts(cx,cy,rad,a0,a0+TAU+.1+r()*.3,r,amp,sy));};
const arc=(cx:number,cy:number,rad:number,a0:number,a1:number,r:R,amp=1.2,sy=1)=>path(arcPts(cx,cy,rad,a0,a1,r,amp,sy));
// A rule drawn by hand: a slight bow and ends that run past their marks.
function rule(x1:number,y1:number,x2:number,y2:number,r:R,over=10,bow=2.4){
 const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,o1=over*(.3+r()),o2=over*(.3+r()),b=(r()-.5)*2*bow;
 return `M${f(x1-ux*o1)} ${f(y1-uy*o1)}Q${f((x1+x2)/2-uy*b)} ${f((y1+y2)/2+ux*b)} ${f(x2+ux*o2)} ${f(y2+uy*o2)}`;
}
// Brush stroke: a filled outline that swells along the path and tapers to points at both ends.
function brush(pts:P[],w:number,bias=.5){
 const n=pts.length,L:P[]=[],Rt:P[]=[];
 pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let nx=-(b[1]-a[1]),ny=b[0]-a[0];const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;
  const t=i/(n-1),k=Math.pow(Math.sin(Math.PI*Math.pow(t,bias*2)),.75),hw=w*Math.max(.03,k)/2;L.push([p[0]+nx*hw,p[1]+ny*hw]);Rt.push([p[0]-nx*hw,p[1]-ny*hw]);});
 Rt.reverse();return `M${f(L[0][0])} ${f(L[0][1])}${curve(L)}L${f(Rt[0][0])} ${f(Rt[0][1])}${curve(Rt)}Z`;
}
// A sweep along a gentle S between two points.
function sweepPts(x1:number,y1:number,x2:number,y2:number,amp:number,n=14):P[]{const nx=-(y2-y1),ny=x2-x1,l=Math.hypot(nx,ny)||1;return [...Array(n+1)].map((_,i)=>{const t=i/n,s=Math.sin(t*Math.PI*1.6)*amp;return [x1+(x2-x1)*t+nx/l*s,y1+(y2-y1)*t+ny/l*s] as P;});}
// Blade shard: a curved sliver like the activity's light blades and the PV's flying debris.
function blade(cx:number,cy:number,len:number,w:number,ang:number,r:R){
 const ux=Math.cos(ang),uy=Math.sin(ang),nx=-uy,ny=ux,s=(r()-.3)*.5;const a:P=[cx-ux*len/2,cy-uy*len/2],b:P=[cx+ux*len/2,cy+uy*len/2];
 return `M${f(a[0])} ${f(a[1])}Q${f(cx+ux*len*s+nx*w)} ${f(cy+uy*len*s+ny*w)} ${f(b[0])} ${f(b[1])}Q${f(cx+ux*len*s*.6-nx*w*.2)} ${f(cy+uy*len*s*.6-ny*w*.2)} ${f(a[0])} ${f(a[1])}Z`;
}
const sparkle=(x:number,y:number,s:number)=>`M${f(x)} ${f(y-s)}Q${f(x)} ${f(y)} ${f(x+s*.7)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y+s)}Q${f(x)} ${f(y)} ${f(x-s*.7)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y-s)}Z`;
const hexPts=(cx:number,cy:number,s:number,r:R)=>[...Array(6)].map((_,k)=>{const a=k/6*TAU-Math.PI/2;return [cx+Math.cos(a)*s+(r()-.5)*1.4,cy+Math.sin(a)*s+(r()-.5)*1.4] as P;});
const poly=(pts:P[])=>`M${pts.map(p=>`${f(p[0])} ${f(p[1])}`).join('L')}Z`;
// Two passes of the same mark, the second nudged and fainter — ink that did not quite register.
const inked=(d:string,style:string,dx=1.6,dy=1.1,extra='')=>`<path d="${d}" style="${style}"${extra}/><path d="${d}" transform="translate(${dx} ${dy})" style="${style};opacity:.26"/>`;

/* ── Graphic elements ──────────────────────────────────────────────────── */
function ticks(cx:number,cy:number,rad:number,n:number,r:R){
 let d='';for(let i=0;i<n;i++){const a=i/n*TAU,l=(i%(n/12)===0?20:i%(n/24)===0?11:5)*(.8+r()*.4);d+=`M${f(cx+Math.cos(a)*rad)} ${f(cy+Math.sin(a)*rad)}L${f(cx+Math.cos(a)*(rad+l))} ${f(cy+Math.sin(a)*(rad+l))}`;}return d;
}
// An axis broken into strokes with gaps, each running a touch past its end.
function brokenAxis(x1:number,y1:number,x2:number,y2:number,r:R,parts=4){let d='';for(let i=0;i<parts;i++){const t0=i/parts+r()*.03,t1=(i+1)/parts-.02-r()*.05;d+=rule(x1+(x2-x1)*t0,y1+(y2-y1)*t0,x1+(x2-x1)*t1,y1+(y2-y1)*t1,r,6,1.6);}return d;}
function yRuler(x:number,y0:number,y1:number,r:R,ink:string){
 let d=rule(x,y0,x,y1,r,6,1.2),labels='';for(let y=y0,k=0;y<=y1;y+=20,k++){const l=k%5===0?14:6;d+=`M${x} ${f(y)}h${f(l*(.85+r()*.3))}`;if(k%5===0)labels+=`<text x="${x+18}" y="${f(y+4)}" style="font:11px ${MONO};fill:${ink};opacity:.7">Y${k/5+1}</text>`;}
 return `<path d="${d}" style="fill:none;stroke:${ink};stroke-width:.9;opacity:.7"/>${labels}`;
}
const column=(x:number,y:number,text:string,ink:string)=>`<text transform="translate(${x} ${y}) rotate(90)" style="font:600 12px ${MONO};letter-spacing:5px;fill:${ink};opacity:.55">${text}</text>`;
function registration(x:number,y:number,s:number,r:R,ink:string){return `<path d="${ring(x,y,s*.42,r,.4)}${rule(x-s,y,x+s,y,r,0,.5)}${rule(x,y-s,x,y+s,r,0,.5)}" style="fill:none;stroke:${ink};stroke-width:.9"/>`;}
const crops=(x0:number,y0:number,x1:number,y1:number,ink:string,l=26)=>`<path d="M${x0} ${y0+l}V${y0}H${x0+l}M${x1-l} ${y0}H${x1}V${y0+l}M${x1} ${y1-l}V${y1}H${x1-l}M${x0+l} ${y1}H${x0}V${y1-l}" style="fill:none;stroke:${ink};stroke-width:1.1"/>`;
// Nodes of varied size tied by hand-drawn lines, as in the PV's construction diagrams.
function constellation(cx:number,cy:number,rad:number,n:number,r:R,ink:string,accent:string){
 const nodes=[...Array(n)].map(()=>{const a=r()*TAU,d=rad*(.25+r()*.75);return [cx+Math.cos(a)*d,cy+Math.sin(a)*d*.78,3+r()*13] as [number,number,number];}).sort((a,b)=>a[0]-b[0]);
 let lines='';nodes.forEach((p,i)=>{if(i)lines+=rule(nodes[i-1][0],nodes[i-1][1],p[0],p[1],r,4,3);if(i>1&&r()>.55){const q=nodes[Math.floor(r()*(i-1))];lines+=rule(q[0],q[1],p[0],p[1],r,3,4);}});
 return `<path class="draw" pathLength="1" d="${lines}" style="fill:none;stroke:${ink};stroke-width:.8;opacity:.75"/>`+nodes.map(([x,y,s],i)=>s<6?`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.6)}" style="fill:${i%3?ink:accent}"/>`:`<path d="${ring(x,y,s,r,.5)}" style="fill:none;stroke:${i%4?ink:accent};stroke-width:1.1"/><text x="${f(x+s+4)}" y="${f(y-s*.4)}" style="font:10px ${MONO};fill:${ink};opacity:.7">${String(i+1).padStart(2,'0')}</text>`).join('');
}
function hexCluster(cx:number,cy:number,s:number,r:R,T:{ink:string;paper:string;accent:string;cobalt:string},inner:string,labels:string[]){
 const cells:[number,number][]=[[0,0],...[...Array(6)].map((_,k)=>{const a=k/6*TAU-Math.PI/6;return [Math.cos(a)*s*1.78,Math.sin(a)*s*1.78] as [number,number];})];
 return cells.map(([dx,dy],k)=>{const p=hexPts(cx+dx,cy+dy,s,r),main=k===0;
  return inked(poly(p),`fill:${main?T.cobalt:T.paper};stroke:${main?T.paper:T.cobalt};stroke-width:1.3`,1.4,1)+(main?`<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s/120)})" style="fill:none;stroke:${T.paper};stroke-width:${f(240/s)}">${inner}</g>`:`<text x="${f(cx+dx)}" y="${f(cy+dy+4)}" text-anchor="middle" style="font:600 ${f(s*.42)}px ${MONO};fill:${T.cobalt}">${labels[k-1]??''}</text>`);}).join('');
}
function mosaic(cx:number,cy:number,rad:number,cell:number,r:R,fills:string[]){
 let out='';for(let y=cy-rad;y<cy+rad;y+=cell)for(let x=cx-rad*.7;x<cx+rad*.7;x+=cell){const d=Math.hypot((x-cx)/(rad*.7),(y-cy)/rad);if(d<1&&r()>d*.9){const i=Math.min(fills.length-1,Math.floor(d*fills.length+r()*.8));out+=`<rect x="${f(x)}" y="${f(y)}" width="${cell-1}" height="${cell-1}" style="fill:${fills[i]};opacity:${f(.95-d*.5)}"/>`;}}
 return out;
}
function glitchStrip(x:number,y:number,w:number,h:number,r:R,fills:string[]){let out='',cy=y;while(cy<y+h){const lh=1+r()*4,off=(r()-.5)*40;out+=`<rect x="${f(x+off+r()*w*.2)}" y="${f(cy)}" width="${f(w*(.3+r()*.7))}" height="${f(lh)}" style="fill:${fills[Math.floor(r()*fills.length)]};opacity:${f(.3+r()*.6)}"/>`;cy+=lh+1+r()*4;}return out;}
function blocks(r:R,n:number,area:[number,number,number,number],fills:string[]){
 return [...Array(n)].map((_,k)=>{const w=8+r()*70,h=6+r()*30;return `<rect class="pl-block" x="${f(area[0]+r()*(area[2]-w))}" y="${f(area[1]+r()*(area[3]-h))}" width="${f(w)}" height="${f(h)}" style="fill:${fills[Math.floor(r()*fills.length)]};--k:${k}"/>`;}).join('');
}
function barcode(r:R,x:number,y:number,w:number,h:number,ink:string){let out='',cx=x;while(cx<x+w){const bw=1+Math.floor(r()*4);if(r()>.35)out+=`<rect x="${cx}" y="${y}" width="${bw}" height="${h}"/>`;cx+=bw+1+Math.floor(r()*3);}return `<g style="fill:${ink}">${out}</g>`;}
function textBlock(x:number,y:number,text:string,per:number,ink:string,anchor='start'){const lines:string[]=[];for(let i=0;i<text.length&&lines.length<4;i+=per)lines.push(text.slice(i,i+per));return lines.map((l,i)=>`<text x="${x}" y="${y+i*18}" text-anchor="${anchor}" style="font:12px ${CN};fill:${ink};opacity:.62">${l}</text>`).join('');}

/* ── Sheets ────────────────────────────────────────────────────────────── */
// d: parallax depth; blur: depth of field in px (CSS on the page, an SVG filter in an image); cls adds behaviour.
type Sheet={body:string;d:number;blur?:number;cls?:string;defs?:string};
function render(sheets:Sheet[],kind:string,label:string,format:'html'|'svg',id:string){
 if(format==='html')return `<div class="plate ${kind}" role="img" aria-label="${label}">${sheets.map(s=>`<svg class="pl-sheet${s.cls?' '+s.cls:''}" viewBox="0 0 1000 1000" style="--d:${s.d}${s.blur?`;--blur:${s.blur}px`:''}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${s.defs?`<defs>${s.defs}</defs>`:''}${s.body}</svg>`).join('')}<i class="pl-sweep"></i></div>`;
 const blurs=[...new Set(sheets.map(s=>s.blur).filter((b):b is number=>!!b))];
 return `<svg viewBox="0 0 1000 1000" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><defs>${blurs.map(b=>`<filter id="${id}-b${String(b).replace('.','_')}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${b*.8}"/></filter>`).join('')}${sheets.map(s=>s.defs??'').join('')}</defs>${sheets.filter(s=>!s.cls?.includes('pl-construct')).map(s=>`<g${s.blur?` filter="url(#${id}-b${String(s.blur).replace('.','_')})"`:''}>${s.body}</g>`).join('')}</svg>`;
}

// Line glyphs for each class, drawn in a 200 × 200 box centred on 0,0.
const ROLE:Record<string,string>={
 先锋:'<path d="M-46 92V-92"/><path d="M-46-88 64-58-46-26"/><path d="M-46-70 30-58M-46-44 12-52"/><path d="M-64 92h36"/>',
 近卫:'<path d="M0-96 15-70V36H-15V-70Z"/><path d="M0-70V30"/><path d="M-50 36h100M-40 48h80"/><path d="M0 48v40M-14 92h28"/>',
 重装:'<path d="M0-92 72-64V4Q72 60 0 94Q-72 60-72 4V-64Z"/><path d="M0-62 48-44V4Q48 42 0 66Q-48 42-48 4V-44Z"/><path d="M0-40V40M-26-4h52"/>',
 狙击:'<circle r="78"/><circle r="40"/><path d="M0-100V-46M0 46V100M-100 0H-46M46 0H100"/><path d="M0-14 14 0 0 14-14 0Z"/>'
};
export const roleGlyph=(role:string)=>ROLE[role]??ROLE['先锋'];

/* Personnel plate, 1000 × 1000. */
export function personnelPlate(o:Operator,index:number,T:PlateTheme=PAGE,alt=false,format:'html'|'svg'='html'){
 const id=`pp${index}-${uid++}`,r=rng(index*97+13);const accent=T.accent==='var(--pl-accent)'?o.color:T.accent;
 const ink=alt?T.paper:T.ink,paper=alt?T.cobalt:T.paper,line=alt?T.paper:T.ink;
 const up=o.english.toUpperCase().replace(/[^A-Z]/g,''),initial=up[0],num=String(index+1).padStart(2,'0');
 const orbit=`${o.english.toUpperCase()} · ${o.roleEn} · ${o.tags.join(' · ')} · RHODES ISLAND · LATERANO 1099 · `;
 const C:P=[500,520];
 const arcStart=-2.1+index*.66,arcLen=.5+o.stars*.36;
 const star=(k:number)=>`<path transform="translate(${80+k*26} 150)" d="M0-9 7 0 0 9-7 0Z" style="fill:${k<o.stars?accent:'none'};stroke:${line};stroke-width:1.2"/>`;
 const sheets:Sheet[]=[
  ...(alt?[{d:.3,body:`<path d="${ring(500,500,432,r,2.4)}" style="fill:${T.cobalt}"/>`}]:[]),
  // Far: halftone, the mirrored initial, a broad faint sweep and big blurred blades.
  {d:.15,blur:3,defs:`<pattern id="${id}-dot" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="2.4" style="fill:${alt?T.paper:accent}"/></pattern><radialGradient id="${id}-fade"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}-mask"><circle cx="600" cy="400" r="380" fill="url(#${id}-fade)"/></mask>`,
   body:`<rect width="1000" height="1000" fill="url(#${id}-dot)" mask="url(#${id}-mask)" opacity="${alt?.3:.5}"/>
   <text x="-560" y="850" transform="scale(-1 1)" text-anchor="middle" style="font:400 860px ${SERIF};fill:${ink};opacity:.07">${initial}</text>
   <path d="${brush(sweepPts(60,820,960,220,60),130,.42)}" style="fill:${accent};opacity:.13"/>
   ${[...Array(4)].map(()=>`<path d="${blade(120+r()*760,140+r()*720,180+r()*260,14+r()*20,r()*TAU,r)}" style="fill:${ink};opacity:${f(.06+r()*.08)}"/>`).join('')}`},
  // Construction: hand-drawn rings, ticks, broken axes, a Y ruler, a text column, registration and crop marks.
  {d:.35,body:`<g style="fill:none;stroke:${line}">
   <path class="draw" pathLength="1" d="${ring(500,500,400,r,2)}" style="stroke-width:1.3"/><path d="${ring(500,500,401,r,2.6)}" style="stroke-width:.6;opacity:.4"/>
   <path d="${ring(500,500,342,r,1.6)}" style="stroke-width:.9;stroke-dasharray:2 7;opacity:.6"/>
   <path d="${arc(500,500,300,2.4,4.6,r,1.4)}" style="stroke-width:.7;opacity:.45"/>
   <path d="${ticks(500,500,400,96,r)}" style="stroke-width:1;opacity:.65"/>
   <path d="${brokenAxis(500,40,500,960,r,5)}${brokenAxis(40,500,960,500,r,5)}" style="stroke-width:.7;opacity:.4"/>
   <path d="${rule(170,170,830,830,r,0,3)}${rule(170,830,830,170,r,0,3)}" style="stroke-width:.5;opacity:.2"/></g>
   ${['000°','090°','180°','270°'].map((t,k)=>{const a=k*Math.PI/2-Math.PI/2;return `<text x="${f(500+Math.cos(a)*452)}" y="${f(504+Math.sin(a)*452)}" text-anchor="middle" style="font:13px ${MONO};fill:${line};opacity:.7">${t}</text>`;}).join('')}
   ${yRuler(30,230,770,r,line)}${column(978,200,`LATERANO · MEMORY ARCHIVE · ${o.english.toUpperCase()}`,line)}
   ${registration(72,250,18,r,line)}${registration(930,930,18,r,line)}${crops(18,18,982,982,line)}`},
  // Orbit: dotted ring with nodes and the running legend, slowly turning.
  {d:.45,cls:'spin',defs:`<path id="${id}-orbit" d="M500 64a436 436 0 1 1 0 872a436 436 0 1 1 0-872"/>`,
   body:`<text style="font:600 15px ${MONO};letter-spacing:5px;fill:${line}"><textPath href="#${id}-orbit">${orbit.repeat(3)}</textPath></text>
   <path d="${ring(500,500,418,r,1.2)}" style="fill:none;stroke:${line};stroke-width:1.6;stroke-dasharray:.5 11;stroke-linecap:round"/>
   ${[...Array(5)].map((_,k)=>{const a=r()*TAU,x=500+Math.cos(a)*418,y=500+Math.sin(a)*418;return `<circle cx="${f(x)}" cy="${f(y)}" r="${k%2?4:7}" style="fill:${k%2?line:paper};stroke:${accent};stroke-width:1.6"/>`;}).join('')}`},
  // The class arc: a tapered brush along the ring, its length set by rarity, with a hairline twin.
  {d:.5,cls:'spin rev',body:`<path d="${brush(arcPts(500,500,372,arcStart,arcStart+arcLen,r,1.4),22,.45)}" style="fill:${accent}"/>
   <path d="${arc(500,500,384,arcStart+.1,arcStart+arcLen+.35,r,1)}" style="fill:none;stroke:${accent};stroke-width:1"/>
   ${[arcStart,arcStart+arcLen].map(a=>`<path d="${ring(500+Math.cos(a)*372,500+Math.sin(a)*372,10,r,.4)}" style="fill:${paper};stroke:${accent};stroke-width:1.4"/>`).join('')}`},
  // Mid: misregistered numeral, sketched halo with a brush crest, constellation, hexagons, mosaic, glitch strip.
  {d:.8,body:`<text x="46" y="934" style="font:400 540px ${SERIF};fill:none;stroke:${T.cobalt};stroke-width:2.4;letter-spacing:-30px;opacity:.32">${num}</text>
   <text class="pl-num" x="40" y="930" style="font:400 540px ${SERIF};fill:none;stroke:${accent};stroke-width:3;letter-spacing:-30px;opacity:.85">${num}</text>
   <path d="${ring(500,196,158,r,1.4,.21)}" style="fill:none;stroke:${line};stroke-width:2.2"/><path d="${ring(500,198,124,r,1,.19)}" style="fill:none;stroke:${line};stroke-width:.8;opacity:.6"/>
   <path d="${brush(arcPts(500,196,158,.25,2.9,r,1,.21),9,.5)}" style="fill:${accent}"/>
   ${constellation(300,320,150,9,r,line,accent)}
   ${hexCluster(838,612,25,r,{ink,paper,accent,cobalt:T.cobalt},roleGlyph(o.role),[num,'★'+o.stars,o.role,o.tags[0][0],'+',initial])}
   ${mosaic(880,420,72,13,r,[T.cobalt,accent,ink,'#c7cecd'])}
   ${glitchStrip(70,606,360,38,r,[ink,T.cobalt,accent])}
   <path d="${brush(sweepPts(110,770,920,300,26),34,.4)}" style="fill:${accent};opacity:.32"/><path d="${brush(sweepPts(130,790,900,320,18),5,.5)}" style="fill:${ink};opacity:.55"/>
   <text x="880" y="300" style="font:400 150px ${SERIF};fill:${ink};opacity:.16" transform="rotate(180 920 250)">${up[1]??initial}</text>`},
  {d:.85,cls:'flick',body:blocks(r,12,[110,110,780,780],[accent,T.cobalt,ink,alt?T.paper:'#c7cecd'])},
  // The class glyph on its disc, drawn twice like an ink stamp, with a brush mark through it.
  {d:1.05,cls:'pl-glyph',body:`<circle cx="${C[0]}" cy="${C[1]}" r="236" style="fill:${paper}"/>
   ${inked(ring(C[0],C[1],236,r,1.6),`fill:none;stroke:${line};stroke-width:1.6`)}
   <path d="${brush(sweepPts(300,640,720,430,14),26,.45)}" style="fill:${accent};opacity:.55"/>
   <g transform="translate(${C[0]} ${C[1]}) scale(2)" style="fill:none;stroke:${ink};stroke-width:2.1;stroke-linejoin:round;stroke-linecap:round">${roleGlyph(o.role)}</g>
   <g transform="translate(${C[0]+2.6} ${C[1]+1.8}) scale(2) rotate(.8)" style="fill:none;stroke:${T.cobalt};stroke-width:1.2;opacity:.45">${roleGlyph(o.role)}</g>
   <circle cx="${C[0]}" cy="${C[1]}" r="6" style="fill:${accent}"/>`},
  {d:1.05,cls:'pl-construct',body:`<g style="fill:none;stroke:${accent}">
   <path d="${ring(C[0],C[1],262,r,1)}" style="stroke-width:.8;stroke-dasharray:2 5"/>
   <path d="${rule(238,820,762,820,r,8,1)}M238 808v24M762 808v24${rule(270,520,730,520,r,8,1)}${rule(500,260,500,780,r,8,1)}${rule(500,520,686,334,r,6,1)}" style="stroke-width:.9"/>
   <path d="${arc(C[0],C[1],60,-.78,0,r,.3)}" style="stroke-width:.9"/></g>
   <text x="500" y="850" text-anchor="middle" style="font:13px ${MONO};fill:${accent}">Ø 472 · ${o.roleEn}</text>
   <text x="598" y="404" style="font:13px ${MONO};fill:${accent}">R 236 · 45°</text>
   <text x="742" y="512" style="font:12px ${MONO};fill:${accent}">X ${500+index*12}</text>`},
  // Near: blurred foreground blades, sparkles and one letter cut by the frame.
  {d:1.5,blur:1.6,body:`${[...Array(3)].map((_,k)=>`<path d="${blade([90,880,700][k],[860,140,930][k],220+r()*140,16+r()*14,r()*TAU,r)}" style="fill:${[ink,T.cobalt,accent][k]};opacity:.62"/>`).join('')}
   <text x="900" y="1040" style="font:400 260px ${SERIF};fill:${T.cobalt};opacity:.22">${up[up.length-1]}</text>`},
  {d:1.3,cls:'twinkles',body:[[170,420,22,accent],[760,250,14,T.cobalt],[640,860,18,ink],[250,880,10,accent]].map(([x,y,s,c])=>`<path class="pl-twinkle" d="${sparkle(+x,+y,+s)}" style="fill:${c}"/>`).join('')},
  {d:1.3,body:`   <path d="${rule(64,70,274,70,r,0,.6)}" style="stroke:${ink};stroke-width:34;opacity:1"/><rect x="274" y="53" width="14" height="34" style="fill:${accent}"/>
   <text x="78" y="77" style="font:600 17px ${MONO};letter-spacing:3px;fill:${paper}">PERSONNEL ${num}</text>
   ${[...Array(6)].map((_,k)=>star(k)).join('')}
   <text x="66" y="200" style="font:13px ${MONO};fill:${line};opacity:.75">${o.role} · ${o.branch}</text>
   <text x="66" y="220" style="font:11px ${MONO};fill:${line};opacity:.5">41°54′N 12°27′E · 1099</text>
   <text x="936" y="96" text-anchor="end" style="font:400 44px ${CN};fill:${ink}">${o.name}</text>
   <text x="936" y="126" text-anchor="end" style="font:italic 22px ${SERIF};fill:${line};opacity:.75">${o.english}</text>
   ${[[accent,o.color],[T.cobalt,'#3A5BC2'],[ink,alt?'#EFF1EF':'#22282B']].map(([c,hex],k)=>`<rect x="${800+k*46}" y="150" width="36" height="36" style="fill:${c};stroke:${line};stroke-width:.6"/><text x="${800+k*46}" y="202" style="font:9px ${MONO};fill:${line};opacity:.7">${hex.toUpperCase()}</text>`).join('')}
   ${textBlock(936,790,o.note,15,line,'end')}
   ${barcode(r,736,866,200,40,ink)}<text x="736" y="926" style="font:11px ${MONO};fill:${line};opacity:.7">LAT.1099-${num}-${o.stars}</text>`}
 ];
 return render(sheets,`pplate${alt?' alt':''}`,`${o.name} 档案图版`,format,id);
}

/* Home key plate: cobalt disc, halo, seal, brush rays, circular legend and birds leaving the disc. */
export function homePlate(T:PlateTheme=PAGE,mark='06',legend="LATERANO · 1099 · THE MASSES' TRAVELS · FAITH · ORDER · FREEDOM · SIDESTORY 06 · ",format:'html'|'svg'='html'){
 const id=`hp-${uid++}`,r=rng(61);const C:P=[520,470];
 // Rays as thin tapered slivers rather than ruled lines.
 const rays=[...Array(40)].map((_,i)=>{const a=i/40*TAU+r()*.07,a0=262+r()*24,l=320+r()*190,w=2+r()*5;const p:P[]=[[C[0]+Math.cos(a)*a0,C[1]+Math.sin(a)*a0],[C[0]+Math.cos(a+.004)*(a0+l)/2+ (r()-.5)*3,C[1]+Math.sin(a+.004)*(a0+l)/2],[C[0]+Math.cos(a)*l,C[1]+Math.sin(a)*l]];return `<path class="hp-ray" style="--i:${i};fill:${T.ink};opacity:${f(.25+r()*.5)}" d="${brush(p,w,.25)}"/>`;}).join('');
 const birds=[...Array(9)].map((_,i)=>{const x=580+i*44+r()*30,y=230-i*18+r()*40,s=.32+r()*.38;return `<path class="hp-bird" style="--i:${i}" transform="translate(${f(x)} ${f(y)}) scale(${f(s*(i%3?1:-1))} ${f(s)})" d="${BIRD}"/>`;}).join('');
 const sheets:Sheet[]=[
  {d:.15,blur:3,body:`<text x="-760" y="860" transform="scale(-1 1)" text-anchor="middle" style="font:400 900px ${SERIF};fill:${T.ink};opacity:.06">N</text>
   <path d="${brush(sweepPts(40,860,980,260,70),150,.42)}" style="fill:${T.cobalt};opacity:.1"/>
   ${[...Array(4)].map(()=>`<path d="${blade(100+r()*800,120+r()*760,200+r()*260,16+r()*22,r()*TAU,r)}" style="fill:${T.ink};opacity:${f(.05+r()*.07)}"/>`).join('')}`},
  {d:.4,body:`${rays}<g style="fill:none;stroke:${T.ink}"><path class="draw" pathLength="1" d="${ring(C[0],C[1],300,r,2)}" style="stroke-width:1.3"/><path d="${ring(C[0],C[1],302,r,2.6)}" style="stroke-width:.6;opacity:.4"/>
   <path d="${ring(C[0],C[1],268,r,1.4)}" style="stroke-width:.8;stroke-dasharray:2 6"/><path d="${ticks(C[0],C[1],300,96,r)}" style="stroke-width:.9;opacity:.7"/>
   <path d="${brokenAxis(C[0],80,C[0],900,r,5)}${brokenAxis(90,C[1],950,C[1],r,5)}" style="stroke-width:.6;opacity:.35"/></g>
   ${yRuler(40,240,760,r,T.ink)}${column(968,150,'FAITH · ORDER · FREEDOM · A JOURNEY TOWARDS THE LIGHT',T.ink)}${registration(90,170,18,r,T.ink)}${registration(930,880,18,r,T.ink)}${crops(16,16,984,984,T.ink)}`},
  {d:.45,cls:'spin',defs:`<path id="${id}-orbit" d="M520 70a400 400 0 1 1 0 800a400 400 0 1 1 0-800"/>`,body:`<text style="font:600 15px ${MONO};letter-spacing:6px;fill:${T.ink}"><textPath href="#${id}-orbit">${legend.repeat(2)}</textPath></text>
   <path d="${ring(C[0],C[1],382,r,1.2)}" style="fill:none;stroke:${T.ink};stroke-width:1.6;stroke-dasharray:.5 11;stroke-linecap:round"/>
   ${[...Array(4)].map((_,k)=>{const a=r()*TAU;return `<circle cx="${f(C[0]+Math.cos(a)*382)}" cy="${f(C[1]+Math.sin(a)*382)}" r="${k%2?4:7}" style="fill:${T.paper};stroke:${T.accent};stroke-width:1.6"/>`;}).join('')}`},
  {d:.5,cls:'spin rev',body:`<path d="${brush(arcPts(C[0],C[1],322,-2.6,-.4,r,1.4),20,.45)}" style="fill:${T.accent}"/><path d="${arc(C[0],C[1],334,-2.5,.1,r,1)}" style="fill:none;stroke:${T.accent};stroke-width:1"/>`},
  {d:.6,defs:`<pattern id="${id}-dot" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2" style="fill:${T.paper}"/></pattern><linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="${id}-mask"><rect width="1000" height="1000" fill="url(#${id}-fade)"/></mask>`,
   body:`<path class="hp-disc" d="${ring(C[0],C[1],236,r,1.8)}" style="fill:${T.cobalt}"/><circle cx="${C[0]}" cy="${C[1]}" r="234" fill="url(#${id}-dot)" mask="url(#${id}-mask)" opacity=".45"/>
   ${inked(ring(C[0],C[1],238,r,1.4),`fill:none;stroke:${T.ink};stroke-width:1.2`)}`},
  {d:.9,body:`<path d="${ring(C[0],196,190,r,1.6,.21)}" style="fill:none;stroke:${T.ink};stroke-width:2.8"/><path d="${ring(C[0],198,150,r,1,.19)}" style="fill:none;stroke:${T.ink};stroke-width:.9;opacity:.6"/>
   <path d="${brush(arcPts(C[0],196,190,.2,2.95,r,1,.21),11,.5)}" style="fill:${T.accent}"/>
   <g transform="translate(408 340) scale(1.4)" style="fill:none;stroke:${T.paper};stroke-width:1.6"><circle cx="80" cy="68" r="45"/><circle cx="80" cy="68" r="39"/><path d="M80 5v148M18 115h124M35 141 80 63l45 78M12 68h136M27 31l106 106M133 31 27 137"/><path d="m4 92 31 7 24 22-30-4zm152 0-31 7-24 22 30-4z" style="fill:${T.paper}"/><circle cx="80" cy="68" r="5" style="fill:${T.paper}"/></g>
   <path d="${brush(sweepPts(330,600,720,380,16),22,.45)}" style="fill:${T.paper};opacity:.6"/>
   ${constellation(250,700,140,8,r,T.ink,T.accent)}
   ${hexCluster(850,690,26,r,{ink:T.ink,paper:T.paper,accent:T.accent,cobalt:T.cobalt},'<circle r="60"/><path d="M0-90V90M-90 0H90"/>',['01','02','03','04','05','06'])}
   ${mosaic(170,300,64,12,r,[T.cobalt,T.accent,T.ink,'#c7cecd'])}${glitchStrip(620,820,300,34,r,[T.ink,T.cobalt,T.accent])}`},
  {d:.95,cls:'flick',body:blocks(r,10,[220,180,620,620],[T.accent,T.ink,T.paper,'#c94b5c'])},
  {d:1.15,body:`<g style="fill:${T.ink}">${birds}</g>${[[820,420,20,T.accent],[300,190,14,T.cobalt],[690,770,16,T.ink]].map(([x,y,s,c])=>`<path class="pl-twinkle" d="${sparkle(+x,+y,+s)}" style="fill:${c}"/>`).join('')}`},
  {d:1.5,blur:1.6,body:`${[...Array(3)].map((_,k)=>`<path d="${blade([110,900,760][k],[880,180,960][k],240+r()*140,18+r()*14,r()*TAU,r)}" style="fill:${[T.ink,T.cobalt,T.accent][k]};opacity:.6"/>`).join('')}`},
  {d:1.35,body:`<text x="76" y="964" style="font:400 300px ${SERIF};fill:none;stroke:${T.cobalt};stroke-width:1.4;opacity:.35">${mark}</text><text x="70" y="960" style="font:400 300px ${SERIF};fill:none;stroke:${T.accent};stroke-width:1.8">${mark}</text>`},
  {d:.6,cls:'pl-construct',body:`<g style="fill:none;stroke:${T.accent}"><path d="${rule(220,C[1],820,C[1],r,8,1)}${rule(C[0],170,C[0],770,r,8,1)}${rule(284,800,756,800,r,6,1)}M284 788v24M756 788v24${rule(C[0],C[1],732,258,r,6,1)}" style="stroke-width:.9"/>
   <rect x="300" y="250" width="440" height="440" style="stroke-width:.8;stroke-dasharray:4 6"/></g>
   <text x="520" y="832" text-anchor="middle" style="font:13px ${MONO};fill:${T.accent}">Ø 600 · DISC R 236</text><text x="640" y="320" style="font:13px ${MONO};fill:${T.accent}">HALO 380 × 80</text><text x="742" y="462" style="font:12px ${MONO};fill:${T.accent}">01 / SEAL</text>`}
 ];
 return render(sheets,'hplate','众生行记主视觉图版',format,id);
}

/* Record plates, 400 × 260: one motif per record in the same hand-drawn line language. */
const MOTIF:Record<string,(T:PlateTheme,r:R)=>string>={
 wings:(T,r)=>[...Array(13)].map((_,i)=>`<path d="M200 190Q${150-i*9} ${150-i*8} ${70-i*3} ${70+i*7}M200 190Q${250+i*9} ${150-i*8} ${330+i*3} ${70+i*7}"/>`).join('')+`<path d="${poly([[150,60],[250,61],[251,200],[149,199]])}" style="stroke:${T.accent}"/>`,
 altar:(T,r)=>[...Array(8)].map((_,i)=>`<path d="${rule(80+i*18,220-i*18,320-i*18,220-i*18,r,4,1)}"/>`).join('')+`<path d="M200 40V76"/><circle cx="200" cy="64" r="9" style="fill:#c94b5c;stroke:none"/>`,
 street:(T,r)=>[...Array(9)].map((_,i)=>`<path d="${rule(200,130,i*50,0,r,0,2)}${rule(200,130,i*50,260,r,0,2)}"/>`).join('')+`<path d="${poly([[186,110],[214,110],[214,150],[186,150]])}" style="stroke:${T.accent}"/>`,
 city:(T,r)=>[...Array(6)].map((_,i)=>`<path d="M${200-30-i*22} 240V${120-i*6}Q200 ${20+i*8} ${200+30+i*22} ${120-i*6}V240"/>`).join('')+`<path d="${ring(200,80,14,r,.4)}" style="stroke:${T.accent}"/>`,
 passage:(T,r)=>[...Array(12)].map((_,i)=>{const s=1-i*.07;return `<path d="${rule(200-170*s,130-90*s,200-170*s,130+90*s,r,2,1)}${rule(200+170*s,130-90*s,200+170*s,130+90*s,r,2,1)}"/>`;}).join('')+`<path d="${brush(sweepPts(60,214,340,214,2),9,.5)}" style="fill:${T.cobalt};stroke:none"/>`,
 water:(T,r)=>`<path d="M120 130V60Q200-10 280 60V130"/>`+[...Array(8)].map((_,i)=>`<path d="${rule(120+i*4,140+i*12,280-i*4,140+i*12,r,4,1)}" style="stroke-dasharray:${12-i} ${3+i}"/>`).join('')+`<path d="${rule(60,136,340,136,r,6,1)}" style="stroke:${T.accent}"/>`,
 prologue:(T,r)=>`<g transform="translate(120 50)"><path d="${ring(80,68,45,r,.8)}${ring(80,68,39,r,.6)}"/><path d="M80 5v148M18 115h124M35 141 80 63l45 78M12 68h136"/></g>`,
 sanctum:(T,r)=>`<path d="M130 240V110Q200 0 270 110V240M160 240V122Q200 50 240 122V240"/><path d="${ring(200,44,46,r,.8,.22)}" style="stroke:${T.accent}"/>`+[...Array(6)].map((_,i)=>`<path d="${rule(60+i*14,240,60+i*14,150+i*10,r,2,.6)}${rule(340-i*14,240,340-i*14,150+i*10,r,2,.6)}"/>`).join('')
};
export function recordPlate(motif:string,code:string,index:number,T:PlateTheme=PAGE){
 const r=rng(index*31+7);const draw=MOTIF[motif]??MOTIF.prologue;const body=draw(T,r);
 return `<svg class="rplate" viewBox="0 0 400 260" role="img" aria-label="${code} 图版" xmlns="http://www.w3.org/2000/svg">
 <rect width="400" height="260" style="fill:${T.paper}"/>
 <path d="${[...Array(9)].map((_,i)=>`M${i*50} 0V260`).join('')}${[...Array(6)].map((_,i)=>`M0 ${i*52}H400`).join('')}" style="stroke:${T.ink};stroke-width:.4;opacity:.12"/>
 <path d="${brush(sweepPts(-10,230,410,60,18),46,.42)}" style="fill:${T.accent};opacity:.12"/>
 <text x="392" y="250" text-anchor="end" style="font:400 150px ${SERIF};fill:none;stroke:${T.accent};stroke-width:1.2;opacity:.6">${String(index+1).padStart(2,'0')}</text>
 <g style="fill:none;stroke:${T.cobalt};stroke-width:1.1;stroke-linecap:round;opacity:.3" transform="translate(2.2 1.6)">${body}</g>
 <g class="rp-motif" style="fill:none;stroke:${T.ink};stroke-width:1.4;stroke-linecap:round">${body}</g>
 ${glitchStrip(16,222,150,16,r,[T.ink,T.cobalt,T.accent])}
 ${blocks(r,4,[10,10,380,240],[T.accent,T.ink,T.cobalt])}
 <path d="${sparkle(352,46,12)}" style="fill:${T.accent}"/>
 <rect x="10" y="10" width="${12+code.length*8}" height="18" style="fill:${T.ink}"/><text x="16" y="23" style="font:600 11px ${MONO};letter-spacing:1px;fill:${T.paper}">${code}</text>
</svg>`;
}
// A plate as an image source (for the canvas card): concrete colours, no CSS needed.
export const svgImage=(svg:string)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
