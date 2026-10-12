// Hand-drawn SVG vocabulary taken from the PV and the activity map: numbered bird outlines,
// blueprint angels, dotted silhouettes with halos, hexagon operation nodes and rulers.

export function rng(seed:number){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};}

// A dove in flight, beak to the right, wing raised with jagged primaries (box 0..100 × 0..60).
export const BIRD='M98 30L90 27Q84 25 80 27L70 25L64 14L66 4L60 11L58 0L54 10L50 2L48 13L43 7L42 18L38 22L26 26L14 24L4 22L10 29L2 33L16 33L30 35Q46 40 58 38L64 46L62 56L70 46L76 40L84 35Q92 34 98 30Z';
const BIRD_RIBS='M52 24L58 4M50 25L52 6M47 25L45 10M60 37L64 52';
const BIRD_HATCH='M5 25L17 28M3 29L17 30M6 32L17 31.5';

const DOTS=(id:string,step=48,r=1.6)=>`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step/2}" cy="${step/2}" r="${r}" fill="currentColor"/></pattern>`;
const cross=(x:number,y:number,s=10)=>`<path class="bp-cross" d="M${x-s} ${y}h${s*2}M${x} ${y-s}v${s*2}"/>`;
const spec=(x:number,y:number,rows:string[])=>`<g class="bp-spec">${rows.map((r,i)=>`<text x="${x}" y="${y+i*11}">${r}</text>`).join('')}</g>`;

export type BirdSpec={n:number;x:number;y:number;s:number;r:number;flip:boolean};
export function flock(seed=6,count=46):BirdSpec[]{
 const rand=rng(seed);const out:BirdSpec[]=[];const numbers=[...Array(count)].map((_,i)=>i+1).sort(()=>rand()-.5);
 for(let i=0;i<count;i++){
  const cluster=i<count*.62;const x=cluster?140+rand()*700:1020+rand()*520;
  const y=350+(rand()-.5)*(cluster?260:200)+Math.sin(x/170)*30;
  out.push({n:numbers[i],x,y,s:.9+rand()*1.3,r:(rand()-.55)*42,flip:rand()<.18});
 }
 return out.sort((a,b)=>a.s-b.s);
}
export function birdMarkup(b:BirdSpec,interactive:boolean){
 const t=`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(1)}) scale(${(b.flip?-b.s:b.s).toFixed(2)} ${b.s.toFixed(2)}) translate(-50 -30)`;
 return `<g class="bp-bird"${interactive?` data-bird="${b.n}" tabindex="-1"`:''} style="--d:${(b.x/1600).toFixed(3)}"><g class="bp-bird-body" transform="${t}"><path class="bp-fill" d="${BIRD}"/><path class="bp-rib" d="${BIRD_RIBS}"/><path class="bp-hatch" d="${BIRD_HATCH}"/></g><text class="bp-num" x="${b.x.toFixed(1)}" y="${(b.y+4).toFixed(1)}">${b.n}</text></g>`;
}

// PV 00:12–00:16 — "羽兽何以飞翔": numbered flock over a dot grid with orbit ellipses and fan lines.
export function birdPlate(interactive=false,id='bird',count=46){
 const birds=flock(6,count);
 const fan=[1384,1420,1462,1500,1532,1566,1600].map((x,i)=>`M1492 640L${x} ${60+(i%3)*28}`).join('');
 return `<svg class="bp-plate bird-plate" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="${!interactive}"><defs>${DOTS(`${id}-dots`)}</defs>
 <rect class="bp-paper" width="1600" height="700"/><rect width="1600" height="700" fill="url(#${id}-dots)" class="bp-grid"/>
 <rect class="bp-block" x="0" y="0" width="112" height="700"/><rect class="bp-paper" x="0" y="200" width="112" height="22"/><rect class="bp-paper" x="0" y="486" width="112" height="22"/>
 <g class="bp-lines"><ellipse cx="300" cy="300" rx="160" ry="330" transform="rotate(-8 300 300)"/><ellipse cx="560" cy="320" rx="210" ry="420" transform="rotate(28 560 320)"/><ellipse cx="460" cy="420" rx="250" ry="300"/><circle cx="1180" cy="340" r="190"/><circle cx="1290" cy="470" r="70"/>
 <path d="M660 90V640"/><circle cx="660" cy="654" r="14"/><circle cx="470" cy="172" r="4"/><path d="M470 176V610"/><path class="bp-fan" d="${fan}"/><path d="M900 350H1080M920 344v12M960 344v12M1000 344v12"/></g>
 ${cross(405,122)}${cross(1550,212,8)}${cross(1550,560,8)}
 <g class="bp-flock">${birds.map(b=>birdMarkup(b,interactive)).join('')}</g>
 ${spec(845,600,['ORBITAL DRIFT  0.0417','LEADING EDGE   14°  /  AXIS-Y','FLOCK DENSITY  46 / 1099'])}
 <text class="bp-title" x="300" y="368">羽兽何以飞翔</text></svg>`;
}

// PV 00:24–00:27 — the robed figure on blueprint paper, wings as rotatable feather fans with blue stepped echoes.
export function angelPlate(interactive=false,id='angel'){
 const feather=(i:number,side:number)=>{const len=150+i*26,w=15+i*1.4;const a=(-4+i*17)*side;return `<g class="bp-feather"${interactive?` data-feather="${side>0?'r':'l'}${i}"`:''} style="--a:${a}deg"><path d="M0 0Q${w} ${-len*.35} 0 ${-len}Q${-w} ${-len*.35} 0 0Z"/><path class="bp-rib" d="M0 -8V${-len+14}"/><text class="bp-num" x="${w+6}" y="${-len*.6}">${side>0?'R':'L'}${i+1}</text></g>`;};
 const echo=(x:number,y:number,w:number,h:number,flip=1)=>{const teeth=[...Array(Math.ceil(h/14))].map((_,i)=>`L${x+w+(i%2?10:0)*flip} ${y+i*14}`).join('');return [0,1,2].map(k=>`<path class="bp-echo e${k}" transform="translate(${-k*7*flip} ${k*9})" d="M${x} ${y}${teeth}L${x+w} ${y+h}L${x} ${y+h}Z"/>`).join('');};
 const wing=(side:number)=>`<g class="bp-wing wing-${side>0?'r':'l'}" transform="translate(${800+side*46} 250)"><g class="bp-wing-fan">${[0,1,2,3,4,5,6].map(i=>feather(i,side)).join('')}</g></g>`;
 return `<svg class="bp-plate angel-plate" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="${!interactive}"><defs>${DOTS(`${id}-dots`)}</defs>
 <rect class="bp-paper" width="1600" height="700"/><rect width="1600" height="700" fill="url(#${id}-dots)" class="bp-grid"/>
 <g class="bp-lines"><circle cx="330" cy="300" r="260"/><circle cx="1250" cy="330" r="210"/><circle cx="300" cy="590" r="44"/><circle cx="1180" cy="580" r="28"/><path d="M325 0V700M1270 0V700M0 560H1600"/></g>
 <g class="bp-echoes">${echo(210,150,90,190)}${echo(260,330,70,260)}${echo(1080,0,100,150,-1)}${echo(1160,350,70,110,-1)}</g>
 ${wing(-1)}${wing(1)}
 <g class="bp-figure"><ellipse class="bp-halo" cx="800" cy="104" rx="46" ry="11"/><path class="bp-fill" d="M800 128a30 30 0 0 1 30 30q0 26-14 40q50 14 66 66l30 320h-224l30-320q16-52 66-66q-14-14-14-40a30 30 0 0 1 30-30z"/><path class="bp-rib" d="M800 210v330M760 300q40 30 80 0M720 400h160"/>${cross(800,160,14)}</g>
 ${spec(735,606,['ICONOGRAPHY  /  SANCTA','HALO RADIUS  46.00','WING SPREAD  [ --open ]'])}
 <text class="bp-title" x="800" y="470">光环之下</text></svg>`;
}

// Map silhouettes: dot-filled figures, a halo, a crosshair box and a measured offset.
const FIGURES=[
 'M-30 0L-27-84Q-24-114-10-118A15 15 0 1 1 10-118Q24-114 27-84L30 0Z',
 'M-28 0L-25-82Q-22-110-10-116A15 15 0 1 1 10-116L24-110L44-162L54-156L32-100L27-84L28 0Z',
 'M-24 0L-30-50Q-26-80-8-86A13 13 0 1 1 10-86Q24-80 26-60L42-82L48-76L30-44L28 0Z',
 'M-34 0L-30-70Q-26-98-10-102A14 14 0 1 1 10-102Q26-98 30-70L34 0Z'
];
export function silhouette(kind:number,label:string,seed:number){
 const r=rng(seed);const top=kind===1?-140:kind===2?-112:kind===3?-128:-146;
 return `<svg class="route-figure" viewBox="-70 -200 140 210" aria-hidden="true"><defs><pattern id="sf${seed}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.05" fill="currentColor"/></pattern></defs>
 <path class="sf-body" d="${FIGURES[kind%FIGURES.length]}" fill="url(#sf${seed})"/><ellipse class="sf-halo" cx="0" cy="${top}" rx="17" ry="5"/>
 <rect class="sf-box" x="-14" y="${-70-r()*20}" width="28" height="22"/>${cross(0,-59-r()*20,6)}<text class="sf-num" x="${-58+r()*20}" y="${-36+r()*20}">${label}</text></svg>`;
}

export const hexagon=`<svg class="hex" viewBox="-20 -20 40 40" aria-hidden="true"><path d="M0-17L14.7-8.5V8.5L0 17L-14.7 8.5V-8.5Z"/></svg>`;
export function ruler(ticks:string[],vertical=true){return `<div class="route-ruler ${vertical?'v':'h'}">${ticks.map(t=>`<span><i></i>${t}</span>`).join('')}</div>`;}

// Radiating construction lines used for the PV's 00:52 salvation shot.
export function radial(count=34,seed=3){const r=rng(seed);return `<svg class="radial-lines" viewBox="-500 -500 1000 1000" aria-hidden="true">${[...Array(count)].map((_,i)=>{const a=(i/count)*Math.PI*2+r()*.12;const l=260+r()*260;return `<path d="M${Math.cos(a)*30} ${Math.sin(a)*30}L${(Math.cos(a)*l).toFixed(1)} ${(Math.sin(a)*l).toFixed(1)}" style="--i:${i}"/>`;}).join('')}<circle r="6"/><circle r="38" class="dash"/></svg>`;}
