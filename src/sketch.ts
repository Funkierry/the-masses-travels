// Hand-drawn line vocabulary shared by the plates, the route map and the atlas. Nothing here is ruled:
// rings breathe and overshoot their start, rules bow and run past their marks, accents are brush strokes
// that swell and taper, and a mark can be inked twice, the second pass nudged like misregistered print.
export type P=[number,number];
export type R=()=>number;
export const f=(n:number)=>n.toFixed(1);
export const TAU=Math.PI*2;
// Catmull-Rom through the points, as cubic Béziers.
export function curve(pts:P[],closed=false){
 const n=pts.length;const at=(i:number)=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];let d='';
 for(let i=0;i<(closed?n:n-1);i++){const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
  d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;}
 return d;
}
export const path=(pts:P[],closed=false)=>`M${f(pts[0][0])} ${f(pts[0][1])}${curve(pts,closed)}${closed?'Z':''}`;
// Low-frequency radial wobble: two sines with random phase, so a ring breathes rather than jitters.
export function wobble(r:R){const a=r()*TAU,b=r()*TAU,k=1+Math.floor(r()*2),m=3+Math.floor(r()*3);return (t:number)=>Math.sin(t*k+a)*.65+Math.sin(t*m+b)*.35;}
export function arcPts(cx:number,cy:number,rad:number,a0:number,a1:number,r:R,amp=1.6,sy=1):P[]{
 const w=wobble(r);const n=Math.max(6,Math.ceil(Math.abs(a1-a0)*rad/26));
 return [...Array(n+1)].map((_,i)=>{const a=a0+(a1-a0)*i/n,rr=rad+w(a)*amp;return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*sy] as P;});
}
// A ring drawn in one stroke: it starts anywhere and overshoots its start a little.
export const ring=(cx:number,cy:number,rad:number,r:R,amp=1.6,sy=1)=>{const a0=r()*TAU;return path(arcPts(cx,cy,rad,a0,a0+TAU+.1+r()*.3,r,amp,sy));};
export const arc=(cx:number,cy:number,rad:number,a0:number,a1:number,r:R,amp=1.2,sy=1)=>path(arcPts(cx,cy,rad,a0,a1,r,amp,sy));
// A rule drawn by hand: a slight bow and ends that run past their marks.
export function rule(x1:number,y1:number,x2:number,y2:number,r:R,over=10,bow=2.4){
 const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,o1=over*(.3+r()),o2=over*(.3+r()),b=(r()-.5)*2*bow;
 return `M${f(x1-ux*o1)} ${f(y1-uy*o1)}Q${f((x1+x2)/2-uy*b)} ${f((y1+y2)/2+ux*b)} ${f(x2+ux*o2)} ${f(y2+uy*o2)}`;
}
// Brush stroke: a filled outline that swells along the path and tapers to points at both ends.
export function brush(pts:P[],w:number,bias=.5){
 const n=pts.length,L:P[]=[],Rt:P[]=[];
 pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let nx=-(b[1]-a[1]),ny=b[0]-a[0];const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;
  const t=i/(n-1),k=Math.pow(Math.sin(Math.PI*Math.pow(t,bias*2)),.75),hw=w*Math.max(.03,k)/2;L.push([p[0]+nx*hw,p[1]+ny*hw]);Rt.push([p[0]-nx*hw,p[1]-ny*hw]);});
 Rt.reverse();return `M${f(L[0][0])} ${f(L[0][1])}${curve(L)}L${f(Rt[0][0])} ${f(Rt[0][1])}${curve(Rt)}Z`;
}
// A sweep along a gentle S between two points.
export function sweepPts(x1:number,y1:number,x2:number,y2:number,amp:number,n=14):P[]{const nx=-(y2-y1),ny=x2-x1,l=Math.hypot(nx,ny)||1;return [...Array(n+1)].map((_,i)=>{const t=i/n,s=Math.sin(t*Math.PI*1.6)*amp;return [x1+(x2-x1)*t+nx/l*s,y1+(y2-y1)*t+ny/l*s] as P;});}
// Blade shard: a curved sliver like the activity's light blades and the PV's flying debris.
export function blade(cx:number,cy:number,len:number,w:number,ang:number,r:R){
 const ux=Math.cos(ang),uy=Math.sin(ang),nx=-uy,ny=ux,s=(r()-.3)*.5;const a:P=[cx-ux*len/2,cy-uy*len/2],b:P=[cx+ux*len/2,cy+uy*len/2];
 return `M${f(a[0])} ${f(a[1])}Q${f(cx+ux*len*s+nx*w)} ${f(cy+uy*len*s+ny*w)} ${f(b[0])} ${f(b[1])}Q${f(cx+ux*len*s*.6-nx*w*.2)} ${f(cy+uy*len*s*.6-ny*w*.2)} ${f(a[0])} ${f(a[1])}Z`;
}
export const sparkle=(x:number,y:number,s:number)=>`M${f(x)} ${f(y-s)}Q${f(x)} ${f(y)} ${f(x+s*.7)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y+s)}Q${f(x)} ${f(y)} ${f(x-s*.7)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y-s)}Z`;
export const hexPts=(cx:number,cy:number,s:number,r:R)=>[...Array(6)].map((_,k)=>{const a=k/6*TAU-Math.PI/2;return [cx+Math.cos(a)*s+(r()-.5)*1.4,cy+Math.sin(a)*s+(r()-.5)*1.4] as P;});
export const poly=(pts:P[])=>`M${pts.map(p=>`${f(p[0])} ${f(p[1])}`).join('L')}Z`;
// Two passes of the same mark, the second nudged and fainter — ink that did not quite register.
export const inked=(d:string,style:string,dx=1.6,dy=1.1,extra='')=>`<path d="${d}" style="${style}"${extra}/><path d="${d}" transform="translate(${dx} ${dy})" style="${style};opacity:.26"/>`;

