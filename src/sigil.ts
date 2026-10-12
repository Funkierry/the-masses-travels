import { f, type P, type R, ring, brush, sweepPts, sparkle } from './sketch.ts';

// The figure a set of marked points closes, drawn in the host drawing's own units. The edges are re-inked
// as brush strokes, slivers burst from the centre, a ring opens round it, the vertices spark and a label
// sits above. s is the stroke scale (≈ one pen width in host units); classes carry the CSS animation.
export function sigil(pts:P[],r:R,s:number,label:string,closed=true){
 const n=pts.length,cx=pts.reduce((a,p)=>a+p[0],0)/n,cy=pts.reduce((a,p)=>a+p[1],0)/n;
 const rad=Math.max(s*8,...pts.map(p=>Math.hypot(p[0]-cx,p[1]-cy)));
 const edges:string[]=[];for(let i=0;i<n-(closed?0:1);i++){const a=pts[i],b=pts[(i+1)%n];edges.push(brush(sweepPts(a[0],a[1],b[0],b[1],s*.5,10),s*1.7,.45));}
 const rays=[...Array(20)].map((_,i)=>{const a=i/20*Math.PI*2+r()*.12,r0=rad*(.2+r()*.15),r1=rad*(1.05+r()*.55),m=(r0+r1)/2;
  return `<path d="${brush([[cx+Math.cos(a)*r0,cy+Math.sin(a)*r0],[cx+Math.cos(a+.01)*m,cy+Math.sin(a+.01)*m],[cx+Math.cos(a)*r1,cy+Math.sin(a)*r1]],s*(.35+r()*.7),.3)}"/>`;}).join('');
 const poly=`M${pts.map(p=>`${f(p[0])} ${f(p[1])}`).join('L')}${closed?'Z':''}`;
 return `<g class="sigil"><path class="sg-fill" d="${closed?poly:''}"/><g class="sg-rays">${rays}</g>
  ${edges.map((d,i)=>`<path class="sg-edge" style="--i:${i}" d="${d}"/>`).join('')}
  <path class="sg-ring" pathLength="1" style="stroke-width:${f(s*.32)}" d="${ring(cx,cy,rad*1.2,r,s*.5)}"/><path class="sg-ring2" style="stroke-width:${f(s*.18)};stroke-dasharray:${f(s*.4)} ${f(s*1.6)}" d="${ring(cx,cy,rad*1.36,r,s*.7)}"/>
  ${pts.map((p,i)=>`<path class="sg-spark" style="--i:${i}" d="${sparkle(p[0],p[1],s*2.4)}"/>`).join('')}
  <text class="sg-label" x="${f(cx)}" y="${f(cy-rad*1.36-s*1.6)}" text-anchor="middle" style="font-size:${f(s*2.6)}px">${label}</text></g>`;
}
// Shoelace area of a closed figure, for its label.
export const area=(pts:P[])=>Math.abs(pts.reduce((a,p,i)=>{const q=pts[(i+1)%pts.length];return a+p[0]*q[1]-q[0]*p[1];},0))/2;
