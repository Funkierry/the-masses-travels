import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The Sanctum, rebuilt from the PV: a ribbed gothic nave (01:45) ending in an apse with the giant hands and
// halo mobile (00:37), enclosed by the veil-like spire of stacked pointed shells (00:42), with floating
// gradient ruins at the entrance (01:40). Every piece records where it sits and where it flies when exploded.

export type Support='ground'|'piers'|'arcade'|'float';
export type GroupInfo={id:string;name:string;en:string;desc:string;pv:number;pvLabel:string;sym:boolean;support:Support};
export const GROUPS:GroupInfo[]=[
 {id:'base',name:'基座与水面',en:'FOUNDATION & WATER',desc:'台基、入口台阶与反光地面，中轴铺设分段的蓝色地毯。',pv:105,pvLabel:'长廊地面',sym:true,support:'ground'},
 {id:'piers',name:'束柱',en:'CLUSTERED PIERS',desc:'每根柱由主柱与八根细柱束成，带柱础与柱头，共两列。',pv:105,pvLabel:'长廊柱列',sym:true,support:'ground'},
 {id:'vault',name:'连拱与肋拱',en:'ARCADE & RIB VAULT',desc:'柱间尖拱连拱、横向尖拱与每开间的交叉肋，顶部一条脊肋贯通。',pv:105,pvLabel:'肋拱长廊',sym:true,support:'piers'},
 {id:'tracery',name:'花窗与侧墙',en:'TRACERY & ROSE',desc:'高侧窗的竖棂与圆形窗花、淡紫色玻璃，以及尽端的多层玫瑰花窗。',pv:37.8,pvLabel:'玫瑰花窗',sym:true,support:'arcade'},
 {id:'veil',name:'面纱外壳',en:'THE VEIL SPIRE',desc:'层层后退的尖拱壳与绕竖轴展开的拱片构成面纱般的尖塔，顶端是圆形花窗之“眼”。',pv:42.5,pvLabel:'瞻望圣堂',sym:true,support:'ground'},
 {id:'hands',name:'圣手与圣盆',en:'HANDS & BASIN',desc:'后殿中一双托举的巨手与圣盆，上方悬挂光环与吊坠。',pv:37.8,pvLabel:'托举之手',sym:true,support:'ground'},
 {id:'ruins',name:'残柱',en:'FLOATING RUINS',desc:'入口外悬浮的断裂柱廊，由暖粉渐变至钴蓝。',pv:100,pvLabel:'残柱',sym:false,support:'float'},
 {id:'halo',name:'悬浮几何',en:'SUSPENDED GEOMETRY',desc:'中殿上空缓慢旋转的光环、倾斜的轨道环、多面体与碎片。',pv:104,pvLabel:'光环',sym:true,support:'float'},
 {id:'buttress',name:'飞扶壁',en:'FLYING BUTTRESSES',desc:'侧墙外每开间一座扶壁墩，两道飞券把拱顶的推力送到地面，墩顶立小尖塔。',pv:42.5,pvLabel:'瞻望圣堂',sym:true,support:'ground'}
];
// Points the light passes on its way through the sanctum, in order: the light-path puzzle connects them.
export type KeyPoint={id:string;name:string;en:string;pos:[number,number,number]};
export type Part={mesh:THREE.Mesh;group:number;base:THREE.Vector3;baseRot:THREE.Euler;explode:THREE.Vector3;spin:THREE.Vector3;delay:number;float?:number};

const BAYS=12,BAY=4.2,Z0=14,HALF=6,SPRING=12,RISE=8.6;
export const NAVE={start:Z0,end:Z0-(BAYS-1)*BAY,half:HALF};
const NE=Z0-(BAYS-1)*BAY;
export const KEYPOINTS:KeyPoint[]=[
 {id:'gate',name:'入口台阶',en:'THE GATE',pos:[0,1.2,Z0+7]},
 {id:'basin',name:'圣盆',en:'THE BASIN',pos:[0,4.35,NE+3.2]},
 {id:'rose',name:'玫瑰花窗',en:'THE ROSE',pos:[0,SPRING+3.4,NE-2.2]},
 {id:'eye',name:'面纱之眼',en:'THE EYE',pos:[0,44,NE-11.8]}
];

function merge(geos:THREE.BufferGeometry[]){const list=geos.map(g=>{const n=g.index?g.toNonIndexed():g;n.clearGroups();for(const k of Object.keys(n.attributes))if(!['position','normal','uv'].includes(k))n.deleteAttribute(k);return n;});return mergeGeometries(list)!;}
const at=(g:THREE.BufferGeometry,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);return g;};
// Pointed (lancet) arch ring in the XY plane, springing at y=0, with optional straight legs below.
function archShape(half:number,rise:number,thick:number,legs=0){
 const s=new THREE.Shape();const h=half,i=half-thick,ri=rise-thick*1.1;
 s.moveTo(-h,-legs);s.lineTo(-h,0);s.bezierCurveTo(-h,rise*.55,-h*.32,rise*.93,0,rise);s.bezierCurveTo(h*.32,rise*.93,h,rise*.55,h,0);s.lineTo(h,-legs);
 s.lineTo(i,-legs);s.lineTo(i,0);s.bezierCurveTo(i,ri*.55,i*.3,ri*.93,0,ri);s.bezierCurveTo(-i*.3,ri*.93,-i,ri*.55,-i,0);s.lineTo(-i,-legs);s.closePath();return s;
}
const arch=(half:number,rise:number,thick:number,depth:number,legs=0)=>{const g=new THREE.ExtrudeGeometry(archShape(half,rise,thick,legs),{depth,bevelEnabled:false,curveSegments:18});g.translate(0,0,-depth/2);return g;};
const tube=(pts:[number,number,number][],r:number,seg=24)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),seg,r,6,false);

export function materials(){
 const named=(name:string,o:THREE.MeshStandardMaterialParameters)=>Object.assign(new THREE.MeshStandardMaterial(o),{name});
 return {
  white:named('white',{color:'#e6e9e3',roughness:.46,metalness:.12}),
  porcelain:named('porcelain',{color:'#fbfcf8',roughness:.26,metalness:.16}),
  stone:named('stone',{color:'#d4d9d6',roughness:.62,metalness:.05}),
  blue:named('blue',{color:'#3b55a8',roughness:.42,metalness:.3}),
  silver:named('silver',{color:'#b8c9cb',roughness:.22,metalness:.66}),
  lavender:named('lavender',{color:'#b9b2e8',roughness:.12,metalness:.35,transparent:true,opacity:.42,side:THREE.DoubleSide,emissive:'#6c63b8',emissiveIntensity:.18}),
  glass:named('glass',{color:'#a9d3e2',roughness:.1,metalness:.5,transparent:true,opacity:.28,side:THREE.DoubleSide}),
  ruin:named('ruin',{vertexColors:true,roughness:.5,metalness:.1}),
  peach:named('peach',{color:'#e9c3b6',roughness:.5,metalness:.1})
 };
}
type Mats=ReturnType<typeof materials>;

export function buildSanctum(groups:THREE.Group[],M:Mats):Part[]{
 const parts:Part[]=[];
 // Each group gets its own material copies so it can be ghosted or highlighted on its own.
 const own=groups.map(()=>new Map<THREE.Material,THREE.Material>());
 const add=(g:number,geo:THREE.BufferGeometry,mat:THREE.Material,explode:[number,number,number],opts:{pos?:[number,number,number];rot?:[number,number,number];spin?:[number,number,number];delay?:number;float?:number}={})=>{
  let m=own[g].get(mat);if(!m){m=mat.clone();own[g].set(mat,m);}
  const mesh=new THREE.Mesh(geo,m);if(opts.pos)mesh.position.set(...opts.pos);if(opts.rot)mesh.rotation.set(...opts.rot);mesh.userData.group=g;groups[g].add(mesh);
  parts.push({mesh,group:g,base:mesh.position.clone(),baseRot:mesh.rotation.clone(),explode:new THREE.Vector3(...explode),spin:new THREE.Vector3(...(opts.spin??[0,0,0])),delay:opts.delay??0,float:opts.float});return mesh;
 };
 const zs=[...Array(BAYS)].map((_,i)=>Z0-i*BAY);

 // 0 · Foundation: plinth, entrance steps, floor bands, blue carpet strips.
 add(0,new THREE.BoxGeometry(HALF*2+5,.3,Z0-NAVE.end+12),M.stone,[0,-1.5,0],{pos:[0,.15,(Z0+NAVE.end)/2-1]});
 for(let s=0;s<4;s++)add(0,new THREE.BoxGeometry(HALF*2+5-s*.9,.3-s*.06,1.1),M.white,[0,-.6,4+s*1.6],{pos:[0,.15-s*.03,Z0+5.6+s*1.05],delay:s*.05});
 // Floor: inlaid lines along the nave and three chancel steps up to the apse.
 add(0,merge([-4.4,-2.2,2.2,4.4].map(x=>at(new THREE.BoxGeometry(.05,.02,Z0-NAVE.end),x,.31,(Z0+NAVE.end)/2))),M.silver,[0,.9,0],{delay:.3});
 for(let s=0;s<3;s++)add(0,new THREE.BoxGeometry(HALF*2-1-s*1.4,.14,1.1-s*.15),M.white,[0,.8+s*.3,-2-s],{pos:[0,.37+s*.14,NAVE.end+7.6-s*.9],delay:.35+s*.05});
 zs.slice(0,-1).forEach((z,i)=>{add(0,new THREE.BoxGeometry(2.6,.06,BAY*.62),M.blue,[0,1.2+i*.12,0],{pos:[0,.34,z-BAY/2],delay:.2+i*.04});add(0,new THREE.BoxGeometry(HALF*2+3,.04,.12),M.silver,[0,.6,0],{pos:[0,.31,z],delay:.25+i*.03});});

 // 1 · Clustered piers: a core shaft, eight colonnettes, base and capital, merged per pier.
 zs.forEach((z,i)=>{for(const side of [-1,1]){
  const g=[at(new THREE.BoxGeometry(1.7,.45,1.7),0,.22),at(new THREE.CylinderGeometry(.82,.92,.55,16),0,.72),at(new THREE.CylinderGeometry(.44,.48,SPRING-1.2,14),0,SPRING/2+.2)];
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2;g.push(at(new THREE.CylinderGeometry(.1,.12,SPRING-1.4,8),Math.cos(a)*.52,SPRING/2+.2,Math.sin(a)*.52));}
  g.push(at(new THREE.CylinderGeometry(.8,.5,.7,16),0,SPRING-.1),at(new THREE.BoxGeometry(1.5,.28,1.5),0,SPRING+.35));
  // Annulet half-way up and a ring of leaves under the capital.
  g.push(at(new THREE.TorusGeometry(.58,.07,6,24),0,SPRING*.5,0,Math.PI/2),at(new THREE.TorusGeometry(.62,.05,6,24),0,1.25,0,Math.PI/2));
  for(let k=0;k<8;k++){const a=(k+.5)/8*Math.PI*2;g.push(at(new THREE.SphereGeometry(.17,6,4).scale(1,1.7,.55),Math.cos(a)*.66,SPRING-.45,Math.sin(a)*.66,0,-a,.35));}
  add(1,merge(g),M.white,[side*3.2,1.6,0],{pos:[side*HALF,.3,z],delay:i*.035});
 }});

 // 2 · Arcade (side pointed arches), transverse arches, diagonal ribs and the ridge rib.
 zs.slice(0,-1).forEach((z,i)=>{const zm=z-BAY/2;
  for(const side of [-1,1])add(2,arch(BAY/2,RISE*.55,.38,.55),M.porcelain,[side*5.4,4.5,0],{pos:[side*HALF,SPRING+.8,zm],rot:[0,Math.PI/2,0],delay:i*.03});
  const diag=(sx:number)=>tube([[-HALF*sx,SPRING+.8,z],[-HALF*.55*sx,SPRING+RISE*.7,z-BAY*.22],[0,SPRING+RISE*.98,zm],[HALF*.55*sx,SPRING+RISE*.7,zm-BAY*.28],[HALF*sx,SPRING+.8,z-BAY]],.13,28);
  add(2,merge([diag(1),diag(-1)]),M.porcelain,[0,9+i*.25,0],{delay:.3+i*.03});
 });
 zs.forEach((z,i)=>add(2,arch(HALF+.2,RISE,.45,.5),M.white,[0,6.5,0],{pos:[0,SPRING+.8,z],delay:.15+i*.03}));
 add(2,tube([[0,SPRING+RISE*.99,Z0],[0,SPRING+RISE*.99,NAVE.end]],.16,4),M.silver,[0,13,0],{delay:.7});
 // Bosses where the ribs cross, a ring round each.
 zs.slice(0,-1).forEach((z,i)=>add(2,merge([at(new THREE.SphereGeometry(.34,12,8)),at(new THREE.TorusGeometry(.5,.06,6,24),0,0,0,Math.PI/2)]),M.silver,[0,11+i*.2,0],{pos:[0,SPRING+RISE*.98,z-BAY/2],delay:.55+i*.02}));

 // 3 · Tracery: clerestory panels (frame, mullions, oculus, lavender glass) and the layered rose window.
 zs.slice(0,-1).forEach((z,i)=>{const zm=z-BAY/2;for(const side of [-1,1]){
  const w=BAY*.78,h=6.2,y=SPRING+1.4;const frame=[at(arch(w/2,2.2,.18,.18,h-1.2),0,h-1.2,0)];
  for(let k=-1;k<=1;k++)frame.push(at(new THREE.BoxGeometry(.09,h-.8,.12),k*w*.24,(h-.8)/2));
  frame.push(at(new THREE.TorusGeometry(.62,.07,6,28),0,h+.15),at(new THREE.TorusGeometry(.32,.05,6,20),-w*.24,h-.6),at(new THREE.TorusGeometry(.32,.05,6,20),w*.24,h-.6));
  const g=merge(frame);g.rotateY(Math.PI/2);add(3,g,M.porcelain,[side*8.5,2,0],{pos:[side*(HALF+.55),y,zm],delay:i*.03});
  const pane=new THREE.PlaneGeometry(w*.92,h+1.2);pane.rotateY(Math.PI/2);add(3,pane,M.lavender,[side*10.5,2.5,0],{pos:[side*(HALF+.75),y+(h+1.2)/2-.6,zm],delay:.1+i*.03});
 }});
 const rz=NAVE.end-2.2,ry=SPRING+3.4;
 for(let k=0;k<6;k++)add(3,new THREE.TorusGeometry(4.2-k*.55,.06+k*.012,8,120),k%2?M.silver:M.porcelain,[0,3.5,-3-k*1.6],{pos:[0,ry,rz+k*.14],delay:.4+k*.05});
 const spokes:THREE.BufferGeometry[]=[];for(let k=0;k<24;k++){const a=k/24*Math.PI*2;spokes.push(at(new THREE.BoxGeometry(.06,3.4,.08),Math.sin(a)*2.3,Math.cos(a)*2.3,0,0,0,-a));}
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;spokes.push(at(new THREE.TorusGeometry(.5,.05,6,20),Math.sin(a)*3.1,Math.cos(a)*3.1));}
 add(3,merge(spokes),M.porcelain,[0,3.5,-13],{pos:[0,ry,rz+.2],delay:.75});
 add(3,new THREE.CircleGeometry(4.2,80),M.lavender,[0,3.5,-15],{pos:[0,ry,rz-.3],delay:.8});
 // Twelve pointed petals round the hub and a lancet either side of the rose.
 const petals:THREE.BufferGeometry[]=[];for(let k=0;k<12;k++){const a=k/12*Math.PI*2;const g=arch(.42,1.15,.07,.08);g.translate(0,1.05,0);g.rotateZ(-a);petals.push(g);}petals.push(at(new THREE.TorusGeometry(1,.06,6,40)));
 add(3,merge(petals),M.silver,[0,3.5,-11],{pos:[0,ry,rz+.32],delay:.78});
 [-5,5].forEach((x,k)=>{add(3,arch(.72,1.5,.12,.14,2.4),M.porcelain,[x*1.4,1.5,-9],{pos:[x,ry-.6,rz+.2],delay:.82+k*.04});const pane=new THREE.PlaneGeometry(1.22,3.7);add(3,pane,M.lavender,[x*1.4,1.5,-10],{pos:[x,ry-.75,rz+.1],delay:.85+k*.04});});

 // 4 · The veil spire: shells stepping back and rising, and ribbons fanned about the vertical axis.
 const vz=NAVE.end-6;
 for(let k=0;k<7;k++){const half=8+k*2.9,rise=24+k*3.4;add(4,arch(half,rise*.62,1.05,1.2,rise*.38),k%2?M.white:M.porcelain,[0,k*1.6,-5-k*4.2],{pos:[0,rise*.38,vz-k*1.5],delay:k*.07});}
 [-64,-48,-32,-16,16,32,48,64].forEach((deg,k)=>{const a=deg*Math.PI/180,f=1-Math.abs(deg)/110;const g=arch(15*f+5,30*f,.85,.9,10*f);g.rotateY(a);
  add(4,g,k%2?M.porcelain:M.white,[Math.sin(a)*14,7,-Math.cos(a)*6-4],{pos:[0,10*f,vz-11],delay:.25+Math.abs(deg)/64*.3});});
 for(const side of [-1,1])for(let k=0;k<3;k++)add(4,new THREE.BoxGeometry(.5,16+k*4,.4),M.lavender,[side*(4+k*2),5,-8],{pos:[side*(3.2+k*2.4),12+k*2,vz-1-k*1.5],delay:.4+k*.06});
 const eye=[at(new THREE.TorusGeometry(2.6,.32,10,64)),at(new THREE.TorusGeometry(1.8,.16,8,48)),at(new THREE.TorusGeometry(.9,.14,8,36))];for(let k=0;k<16;k++){const a=k/16*Math.PI*2;eye.push(at(new THREE.BoxGeometry(.08,1.6,.1),Math.sin(a)*1.75,Math.cos(a)*1.75,0,0,0,-a));}
 add(4,merge(eye),M.silver,[0,14,4],{pos:[0,44,vz-5.8],delay:.75});
 // A finial on the crown of every shell.
 add(4,merge([...Array(6)].flatMap((_,k)=>{const rise=24+k*3.4;return [at(new THREE.ConeGeometry(.3,1.5,6),0,rise+.75,vz-k*1.5),at(new THREE.SphereGeometry(.26,8,6),0,rise+1.6,vz-k*1.5)];})),M.silver,[0,12,-6],{delay:.6});
 add(4,arch(2.4,5.2,.4,.6,5),M.blue,[0,0,10],{pos:[0,5,vz+.7],delay:.15});

 // 5 · Hands and basin in the apse, the halo mobile above.
 const hz=NAVE.end+3.2;
 // Palm up, four two-jointed fingers curling toward the centre, thumb in front, wrist outward.
 const hand=(d:number)=>{
  const g:THREE.BufferGeometry[]=[at(new THREE.SphereGeometry(1,24,16).scale(1.9,.55,1.5))];
  const seg=(x:number,y:number,z:number,len:number,r:number,tilt:number)=>{const c=new THREE.CapsuleGeometry(r,len,4,10);c.rotateZ(-d*(Math.PI/2-tilt));c.translate(x+d*Math.cos(tilt)*len/2,y+Math.sin(tilt)*len/2,z);return c;};
  [-1.05,-.35,.35,1.05].forEach((z,k)=>{const l1=1.5-Math.abs(k-1.5)*.2,t1=.32,t2=1.05;g.push(seg(d*1.6,.12,z,l1,.31,t1));
   const ex=d*(1.6+Math.cos(t1)*(l1+.3)),ey=.12+Math.sin(t1)*(l1+.3);g.push(seg(ex,ey,z,.85-k*.04,.27,t2));});
  const thumb=new THREE.CapsuleGeometry(.34,1.25,4,10);thumb.rotateX(-.75);thumb.rotateZ(-d*.5);thumb.translate(d*.55,.62,1.55);g.push(thumb);
  const wrist=new THREE.CapsuleGeometry(.72,1.3,4,12);wrist.rotateZ(Math.PI/2);wrist.translate(-d*2.25,-.05,0);g.push(wrist);
  const m=merge(g);m.rotateZ(d*.22);m.scale(1.15,1.15,1.15);return m;};
 for(const side of [-1,1]){const d=-side;
  add(5,hand(d),M.porcelain,[side*5.5,1.2,0],{pos:[side*2.75,2.15,hz],delay:.05});
  add(5,tube([[side*5.3,1.9,hz],[side*6.6,1.1,hz+.5],[side*8.2,.4,hz+1.2]],.82,12),M.white,[side*7.5,0,1.5],{delay:.1});
 }
 const bowl=new THREE.LatheGeometry([...Array(12)].map((_,k)=>{const t=k/11;return new THREE.Vector2(.2+Math.sin(t*Math.PI*.5)*2.6,t*1.5);}),48);
 add(5,bowl,M.silver,[0,4.5,0],{pos:[0,2.9,hz],delay:.2});
 add(5,new THREE.CylinderGeometry(2.6,2.6,.06,48),M.glass,[0,4.6,0],{pos:[0,4.25,hz],delay:.22});
 add(5,new THREE.TorusGeometry(3.2,.07,8,96),M.silver,[0,7,0],{pos:[0,13.5,hz],rot:[Math.PI/2,0,0],spin:[0,0,.25],delay:.35});
 // Ripples on the water held in the basin.
 add(5,merge([.7,1.35,2].map(r=>at(new THREE.TorusGeometry(r,.025,4,48),0,0,0,Math.PI/2))),M.silver,[0,5.2,0],{pos:[0,4.31,hz],delay:.24});
 const charms=[new THREE.OctahedronGeometry(.42),new THREE.ConeGeometry(.35,.9,5),new THREE.TetrahedronGeometry(.45),new THREE.IcosahedronGeometry(.36),new THREE.ConeGeometry(.3,.8,4),new THREE.OctahedronGeometry(.32)];
 charms.forEach((c,k)=>{const a=k/6*Math.PI*2,x=Math.cos(a)*3.2,z=hz+Math.sin(a)*3.2,len=1.6+(k%3)*.9;
  add(5,merge([at(new THREE.CylinderGeometry(.015,.015,len,4),0,-len/2),at(c.clone(),0,-len-.4)]),k%2?M.blue:M.silver,[Math.cos(a)*2.5,7+k*.4,Math.sin(a)*2.5],{pos:[x,13.5,z],spin:[0,.6,0],delay:.45+k*.04});});

 // 6 · Floating ruins outside the entrance, shaded peach to cobalt.
 const ruin=(cols:number,h:number,seed:number)=>{const g:THREE.BufferGeometry[]=[];for(let c=0;c<cols;c++)g.push(at(new THREE.CylinderGeometry(.42,.48,h*(c%2?.86:1),10),c*1.9-(cols-1)*.95,h/2));
  const lintel=new THREE.BoxGeometry(cols*1.9+.8,1.1,1.5,8,1,1);const p=lintel.attributes.position;for(let k=0;k<p.count;k++)if(p.getY(k)>0)p.setY(k,p.getY(k)+Math.sin(k*1.7+seed)*.35);g.push(at(lintel,0,h+.5));
  const m=merge(g);const pos=m.attributes.position;const col=new Float32Array(pos.count*3);const lo=new THREE.Color('#f0c6b8'),hi=new THREE.Color('#3a55b0');for(let k=0;k<pos.count;k++){const c=lo.clone().lerp(hi,THREE.MathUtils.clamp(pos.getY(k)/(h+1.2),0,1)**.8);col.set([c.r,c.g,c.b],k*3);}m.setAttribute('color',new THREE.BufferAttribute(col,3));return m;};
 [[-9,1.5,Z0+10,3,7,.2],[8,4,Z0+13,2,6,-.35],[-4,7.5,Z0+18,2,4.5,.5],[11,9,Z0+19,3,5,-.15],[-13,10,Z0+15,1,4,.3]].forEach(([x,y,z,c,h,r],k)=>add(6,ruin(c,h,k),M.ruin,[x*.6,6+k*1.2,8+k],{pos:[x,y,z],rot:[r*.25,r,r*.3],float:k,delay:k*.08}));
 for(let k=0;k<26;k++){const a=k*2.4,r=6+(k%7)*2.2;add(6,new THREE.BoxGeometry(.25+(k%3)*.18,.25+(k%4)*.15,.25),k%3?M.peach:M.blue,[Math.cos(a)*4,5+(k%5),Math.sin(a)*4],{pos:[Math.cos(a)*r,3+(k%9)*1.3,Z0+14+Math.sin(a)*5],rot:[k,k*.4,k*.7],float:k*.37,delay:.3+(k%10)*.03});}

 // 7 · Suspended geometry over the nave.
 add(7,new THREE.TorusGeometry(3.7,.05,8,120),M.silver,[0,9,0],{pos:[0,9,Z0-8],rot:[Math.PI/2,0,0],spin:[0,0,.06]});
 add(7,new THREE.IcosahedronGeometry(.8,0),M.silver,[0,11,0],{pos:[0,7.4,Z0-8],spin:[.2,.3,0],delay:.1});
 add(7,new THREE.TorusGeometry(4.6,.03,6,120),M.silver,[0,10,0],{pos:[0,9,Z0-8],rot:[Math.PI/2+.42,.2,0],spin:[0,.05,0],delay:.05});
 add(7,new THREE.TorusGeometry(5.3,.025,6,120),M.blue,[0,11,0],{pos:[0,9,Z0-8],rot:[Math.PI/2-.36,-.25,0],spin:[0,-.04,0],delay:.08});
 add(7,merge([...Array(12)].map((_,k)=>{const a=k/12*Math.PI*2;return at(new THREE.TetrahedronGeometry(.14),Math.cos(a)*3.7,0,Math.sin(a)*3.7,k,k*.5,0);})),M.blue,[0,8,0],{pos:[0,9,Z0-8],spin:[0,.08,0],delay:.12});
 for(let k=0;k<9;k++)add(7,new THREE.BoxGeometry(.16,.16,.16),M.silver,[Math.sin(k*2.4)*5,8+k*.6,Math.cos(k*2.4)*5],{pos:[Math.sin(k*2.4)*4.2,4+k*.9,Z0-8+Math.cos(k*2.4)*3],rot:[k,k*.3,k*.8],spin:[.5,.4,0],delay:.15+k*.04});
 // 8 · Flying buttresses: a pier outside each bay line, two flyers to the clerestory and a pinnacle.
 zs.forEach((z,i)=>{for(const side of [-1,1]){const bx=side*(HALF+4.6),wx=side*(HALF+.95);
  const g=[at(new THREE.BoxGeometry(1.6,.5,1.4),bx,.25,z),at(new THREE.BoxGeometry(1.2,SPRING+3.2,1),bx,(SPRING+3.2)/2+.5,z),at(new THREE.BoxGeometry(1.4,.3,1.2),bx,SPRING+3.85,z),
   at(new THREE.ConeGeometry(.5,3.2,4),bx,SPRING+5.6,z,0,Math.PI/4),at(new THREE.SphereGeometry(.22,8,6),bx,SPRING+7.35,z),
   tube([[bx-side*.5,SPRING+.6,z],[(bx+wx)/2,SPRING+2.2,z],[wx,SPRING+3.2,z]],.2,10),tube([[bx-side*.5,SPRING+3.3,z],[(bx+wx)/2,SPRING+5.2,z],[wx,SPRING+6.4,z]],.17,10)];
  for(let k=0;k<3;k++)g.push(at(new THREE.ConeGeometry(.14,.5,4),bx,SPRING+4.3+k*.9,z+.42*(k%2?1:-1)));
  add(8,merge(g),M.white,[side*6,1.2,0],{delay:i*.04});
 }});
 return parts;
}
