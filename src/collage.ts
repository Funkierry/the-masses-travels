import { BIRD } from './graphics.ts';
import { f, type R, ring, rule, sparkle } from './sketch.ts';

// Collage pieces in the activity's illustration style: white cut-outs with thin blue outlines and a soft
// shadow (UI windows, envelopes, data tickets), doves, small flowers and sprigs, dots tied by lines, sunburst
// hairlines and glitch pixels. Each takes a line weight so a layer can draw it hairline-thin or heavy.
export type CT={ink:string;paper:string;accent:string;cobalt:string;vivid:string};

// A small UI window: title bar with a close mark, text bars, a sparkle; shadowed like a paper sticker.
export function uiFrame(x:number,y:number,w:number,h:number,r:R,T:CT,lw:number,title='',rot=0){
 const bars=[...Array(Math.max(1,Math.floor((h-30)/14)))].map((_,i)=>`<rect x="${12}" y="${f(30+i*14)}" width="${f((w-24)*(.35+r()*.6))}" height="4" style="fill:${i%3?T.cobalt:T.ink};opacity:${i%3?.35:.6}"/>`).join('');
 return `<g class="cl-frame" transform="translate(${f(x)} ${f(y)}) rotate(${rot})">
  <rect x="7" y="9" width="${w}" height="${h}" style="fill:${T.cobalt};opacity:.16"/>
  <rect width="${w}" height="${h}" style="fill:${T.paper};stroke:${T.cobalt};stroke-width:${f(lw)}"/>
  <path d="M0 18H${w}" style="stroke:${T.cobalt};stroke-width:${f(lw*.8)}"/>
  <path d="M${w-14} 5l8 8M${w-6} 5l-8 8" style="stroke:${T.cobalt};stroke-width:${f(lw*.8)}"/>
  <rect x="6" y="6" width="6" height="6" style="fill:${T.vivid}"/>
  ${title?`<text x="18" y="13.5" style="font:700 8px Consolas,monospace;letter-spacing:1px;fill:${T.cobalt}">${title}</text>`:''}
  ${bars}
  <path d="${sparkle(w-20,h-18,8)}" style="fill:${T.cobalt}"/>
  <path d="M-6 ${h*.5}h12M0 ${h*.5-6}v12" style="stroke:${T.cobalt};stroke-width:${f(lw*.7)}"/>
 </g>`;
}
export function envelope(x:number,y:number,s:number,T:CT,lw:number,rot=0){
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})"><rect x="3" y="4" width="34" height="23" style="fill:${T.cobalt};opacity:.15"/><rect width="34" height="23" style="fill:${T.paper};stroke:${T.cobalt};stroke-width:${f(lw/s)}"/><path d="M0 0L17 13L34 0M0 23L12 11M34 23L22 11" style="fill:none;stroke:${T.cobalt};stroke-width:${f(lw/s*.85)}"/></g>`;
}
// A data ticket: bold uppercase title in vivid blue, a rule, small mono lines and a barcode strip.
export function ticket(x:number,y:number,w:number,title:string,lines:string[],r:R,T:CT,lw:number,rot=0){
 const h=40+lines.length*12;let bars='';for(let bx=w-70;bx<w-10;){const bw=1+Math.floor(r()*3);if(r()>.3)bars+=`<rect x="${bx}" y="${h-22}" width="${bw}" height="14"/>`;bx+=bw+1+Math.floor(r()*2);}
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})"><rect x="6" y="8" width="${w}" height="${h}" style="fill:${T.cobalt};opacity:.16"/><rect width="${w}" height="${h}" style="fill:${T.paper};stroke:${T.cobalt};stroke-width:${f(lw)}"/>
  <text x="10" y="22" style="font:900 15px 'Microsoft YaHei UI','Segoe UI',sans-serif;letter-spacing:.5px;fill:${T.vivid}">${title}</text><path d="M10 28H${w-10}" style="stroke:${T.vivid};stroke-width:${f(lw)}"/>
  ${lines.map((l,i)=>`<text x="10" y="${42+i*12}" style="font:8px Consolas,monospace;letter-spacing:.6px;fill:${T.ink};opacity:.7">${l}</text>`).join('')}<g style="fill:${T.ink}">${bars}</g></g>`;
}
// Doves: white, outlined; flip mirrors them, rot tilts them.
export const dove=(x:number,y:number,s:number,T:CT,lw:number,flip=false,rot=0)=>`<path class="cl-dove" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(flip?-s:s)} ${f(s)}) translate(-50 -30)" d="${BIRD}" style="fill:${T.paper};stroke:${T.cobalt};stroke-width:${f(lw/s)};stroke-linejoin:round"/>`;
export function flower(x:number,y:number,s:number,color:string,T:CT,lw:number,rot=0){
 const petals=[...Array(5)].map((_,i)=>`<ellipse cx="0" cy="-7" rx="4.2" ry="7" transform="rotate(${i*72})" style="fill:${color};stroke:${T.paper};stroke-width:${f(lw*.4/s)}"/>`).join('');
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})">${petals}<circle r="3" style="fill:${T.paper}"/></g>`;
}
export function sprig(x:number,y:number,s:number,ang:number,color:string,lw:number){
 const leaves=[.3,.55,.8].map((t,i)=>{const lx=t*40,ly=-Math.sin(t*3)*6,side=i%2?1:-1;return `<path d="M${f(lx)} ${f(ly)}q${4*side} ${-9*side} ${12} ${-6*side}q${-5} ${7*side} ${-12} ${6*side}Z" style="fill:${color}"/>`;}).join('');
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${ang}) scale(${s})"><path d="M0 0Q20-10 44-4" style="fill:none;stroke:${color};stroke-width:${f(lw/s)};stroke-linecap:round"/>${leaves}</g>`;
}
// Dots tied by straight lines, "like a maths lesson".
export function dots(cx:number,cy:number,rad:number,n:number,r:R,T:CT,lw:number){
 const p=[...Array(n)].map(()=>{const a=r()*Math.PI*2,d=rad*(.2+r()*.8);return [cx+Math.cos(a)*d,cy+Math.sin(a)*d*.8,2+r()*4] as [number,number,number];});
 let lines='';p.forEach((q,i)=>{if(i)lines+=`M${f(p[i-1][0])} ${f(p[i-1][1])}L${f(q[0])} ${f(q[1])}`;if(i>2&&r()>.5){const o=p[Math.floor(r()*i)];lines+=`M${f(o[0])} ${f(o[1])}L${f(q[0])} ${f(q[1])}`;}});
 return `<path d="${lines}" style="fill:none;stroke:${T.cobalt};stroke-width:${f(lw)};opacity:.8"/>`+p.map(([x,y,s],i)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" style="fill:${i%3?T.paper:T.vivid};stroke:${T.cobalt};stroke-width:${f(lw)}"/>`).join('');
}
export function sunburst(cx:number,cy:number,r0:number,r1:number,n:number,r:R,T:CT,lw:number){
 let d='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2+r()*.04,l=r0+(r1-r0)*(.55+r()*.45);d+=`M${f(cx+Math.cos(a)*r0)} ${f(cy+Math.sin(a)*r0)}L${f(cx+Math.cos(a)*l)} ${f(cy+Math.sin(a)*l)}`;}
 return `<path d="${d}" style="fill:none;stroke:${T.paper};stroke-width:${f(lw)};opacity:.9"/><path d="${d}" style="fill:none;stroke:${T.cobalt};stroke-width:${f(lw*.6)};opacity:.22"/>`;
}
// Glitch pixels: grey, magenta and cyan squares in a loose cluster.
export function pixels(cx:number,cy:number,rad:number,n:number,r:R){
 const c=['#9aa3a8','#c7cecd','#e0569a','#3fc6d6','#22282b','#5b6bff'];
 return [...Array(n)].map(()=>{const a=r()*Math.PI*2,d=rad*Math.sqrt(r()),s=3+r()*11;return `<rect x="${f(cx+Math.cos(a)*d)}" y="${f(cy+Math.sin(a)*d)}" width="${f(s)}" height="${f(s*(.5+r()*.8))}" style="fill:${c[Math.floor(r()*c.length)]};opacity:${f(.45+r()*.5)}"/>`;}).join('');
}
// A plain geometric backdrop: big hairline circles crossing, a few nodes where they meet.
export function bigCircles(cx:number,cy:number,R0:number,r:R,T:CT,lw:number){
 return [[0,0,1],[.55,-.15,.62],[-.6,.25,.5],[.1,.55,.38]].map(([dx,dy,k])=>`<path d="${ring(cx+dx*R0,cy+dy*R0,R0*k,r,1.2)}" style="fill:none;stroke:${T.paper};stroke-width:${f(lw*1.8)};opacity:.85"/><path d="${ring(cx+dx*R0,cy+dy*R0,R0*k,r,1.2)}" style="fill:none;stroke:${T.cobalt};stroke-width:${f(lw)};opacity:.35"/>`).join('')
  +`<path d="${rule(cx-R0*1.3,cy,cx+R0*1.3,cy,r,0,2)}${rule(cx,cy-R0*1.2,cx,cy+R0*1.2,r,0,2)}" style="fill:none;stroke:${T.cobalt};stroke-width:${f(lw*.8)};opacity:.3"/>`;
}
