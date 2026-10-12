import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildSanctum, materials, GROUPS, NAVE, KEYPOINTS, type Part } from './sanctum.ts';

export type SceneMode='home'|'faith'|'city'|'operator'|'sanctum';
export type GroupReport={valid:boolean;parts:number;triangles:number;size:[number,number,number];materials:string[];symmetric:boolean;offset:number;grounded:boolean;travel:number;floating:number};
const smooth=(x:number)=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const STAGGER=.085;

export class World {
 renderer:THREE.WebGLRenderer; scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(38,1,.1,320);
 controls:OrbitControls; root=new THREE.Group(); birds=new THREE.Group(); groups:THREE.Group[]=[]; parts:Part[]=[];
 reflection:Reflector; mode:SceneMode='home'; inspect=false; reduced=false; enabled=true; overview=false;
 pointer=new THREE.Vector2(); clock=0; split=0; explodeTarget=0; theme=0; targetTheme=0;
 orbitTarget=new THREE.Vector3(); resizeObserver:ResizeObserver; focus=-1; hover=-1; section=0; reports:GroupReport[]=[];
 clip=new THREE.Plane(new THREE.Vector3(-1,0,0),60); raycaster=new THREE.Raycaster(); fly:{pos:THREE.Vector3;target:THREE.Vector3;t:number}|null=null;
 onStats?:(fps:number)=>void; frameCount=0; fpsClock=0; snap=false;
 beam:THREE.Group|null=null; beamOn=false; beamT=0; lightView=false;
 get exploded(){return this.explodeTarget>.5;}
 set exploded(v:boolean){this.explodeTarget=v?1:0;}
 constructor(public container:HTMLElement){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor('#dfe7e4');this.renderer.localClippingEnabled=true;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.renderer.domElement.setAttribute('aria-label','实时渲染的拉特兰圣堂与水面');
  container.append(this.renderer.domElement);
  this.scene.background=new THREE.Color('#dfe7e4');this.scene.fog=new THREE.Fog('#dfe7e4',40,130);
  this.scene.add(new THREE.HemisphereLight('#f5ffff','#6c878d',3.2));
  const sun=new THREE.DirectionalLight('#fffbea',4.2);sun.position.set(-15,28,12);this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#9fc0ff',2.1);rim.position.set(20,12,-30);this.scene.add(rim);
  const apse=new THREE.PointLight('#cfd8ff',60,40,1.6);apse.position.set(0,10,NAVE.end+2);this.scene.add(apse);
  this.scene.add(this.root);
  for(let i=0;i<GROUPS.length;i++){const g=new THREE.Group();g.name=GROUPS[i].id;this.root.add(g);this.groups.push(g);}
  this.parts=buildSanctum(this.groups,materials());
  for(const p of this.parts){const m=p.mesh.material as THREE.MeshStandardMaterial;m.clippingPlanes=[this.clip];m.userData.opacity=m.opacity;m.userData.transparent=m.transparent;m.userData.emissive=m.emissive.getHex();m.userData.emissiveIntensity=m.emissiveIntensity;}
  this.reports=this.groups.map((_,i)=>this.measure(i));
  this.buildBirds();this.scene.add(this.birds);
  this.reflection=new Reflector(new THREE.PlaneGeometry(260,260),{color:0xa3bdc2,textureWidth:Math.min(innerWidth*.6,1100),textureHeight:Math.min(innerHeight*.6,700),clipBias:.003});
  this.reflection.rotation.x=-Math.PI/2;this.reflection.position.y=-.04;this.scene.add(this.reflection);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},dark:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float dark;void main(){vec2 p=vUv*400.;float w=sin(p.x*1.5+sin(p.y*.7+time*.25)*3.+time*.32)*sin(p.y*3.+time*.38);float d=length(vUv-.5);float a=.13+w*.045+smoothstep(.03,.5,d)*.2;gl_FragColor=vec4(mix(vec3(.65,.77,.77),vec3(.08,.18,.22),dark),a);}`}));
  water.rotation.x=-Math.PI/2;water.position.y=.015;water.name='water';this.scene.add(water);
  this.camera.position.set(23,10,29);this.camera.lookAt(0,5,-4);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,5,-4);this.controls.enabled=false;this.controls.enableDamping=true;this.controls.dampingFactor=.08;
  this.controls.minDistance=4;this.controls.maxDistance=110;this.controls.maxPolarAngle=Math.PI*.49;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.enabled=false;container.classList.add('context-lost');});
  this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.enabled=true;container.classList.remove('context-lost');});
 }
 buildBirds(){
  const mat=new THREE.MeshStandardMaterial({color:'#f2f1e9',roughness:.68,side:THREE.DoubleSide});
  for(let i=0;i<32;i++){
   const bird=new THREE.Group();const body=new THREE.Mesh(new THREE.ConeGeometry(.09,.85,4),mat);body.rotation.x=Math.PI/2;bird.add(body);
   for(const side of [-1,1]){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.22,side*.92,.18,-.15,side*.52,-.07,.38,0,0,.22,side*.52,-.07,.38,0,-.1,.5],3));g.computeVertexNormals();
    const wing=new THREE.Mesh(g,mat);wing.name=side===1?'right':'left';bird.add(wing);
   }
   bird.position.set(Math.sin(i*2.17)*14,5+Math.cos(i*1.7)*5,8-Math.floor(i/5)*6);
   bird.userData={seed:i,base:bird.position.clone()};bird.scale.setScalar(.6+(i%5)*.14);this.birds.add(bird);
  }
 }
 // Structural check for one group, measured on the assembled model.
 measure(i:number):GroupReport{
  const ps=this.parts.filter(p=>p.group===i);const box=new THREE.Box3();let tris=0,travel=0,floating=0,valid=true;const mats=new Set<string>();
  for(const p of ps){p.mesh.updateMatrixWorld(true);box.expandByObject(p.mesh);const g=p.mesh.geometry;g.computeBoundingBox();const bb=g.boundingBox!;if(!g.attributes.position.count||![bb.min.x,bb.min.y,bb.min.z,bb.max.x,bb.max.y,bb.max.z].every(Number.isFinite))valid=false;tris+=(g.index?g.index.count:g.attributes.position.count)/3;travel=Math.max(travel,p.explode.length());if(p.float!==undefined)floating++;mats.add((p.mesh.material as THREE.Material).name);}
  const size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  return {valid,parts:ps.length,triangles:Math.round(tris),size:[+size.x.toFixed(1),+size.y.toFixed(1),+size.z.toFixed(1)],materials:[...mats],symmetric:Math.abs(c.x)<Math.max(.15,size.x*.02),offset:+c.x.toFixed(2),grounded:box.min.y<.45,travel:+travel.toFixed(1),floating};
 }
 setMode(mode:SceneMode){this.mode=mode;this.setInspect(false);if(mode!=='sanctum'){this.setFocus(-1);this.explodeTarget=0;this.setSection(0);}}
 setInspect(active:boolean){this.inspect=active;this.controls.enabled=active;this.container.classList.toggle('inspect',active);if(active){this.controls.target.copy(this.orbitTarget);this.controls.update();}else this.fly=null;}
 reset(){this.setInspect(false);this.explodeTarget=0;this.setFocus(-1);this.setSection(0);}
 setQuality(q:'high'|'low'){this.renderer.setPixelRatio(q==='low'?1:Math.min(devicePixelRatio,1.5));this.reflection.visible=q==='high';this.resize();}
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 // Section cut along x: 0 = whole building, 1 = cut deep past the centre line.
 setSection(v:number){this.section=v;this.clip.constant=v<=0?60:THREE.MathUtils.lerp(26,-7,v);}
 // Ghost every other group and tint the focused one.
 setFocus(i:number){
  this.focus=i;
  for(const p of this.parts){const m=p.mesh.material as THREE.MeshStandardMaterial;const ghost=i>=0&&p.group!==i;
   m.transparent=ghost||m.userData.transparent;m.opacity=ghost?Math.min(.1,m.userData.opacity):m.userData.opacity;m.depthWrite=!ghost&&!m.userData.transparent;
   const lit=p.group===i?'#2f4fb8':p.group===this.hover&&i<0?'#5d7fe0':null;if(lit){m.emissive.set(lit);m.emissiveIntensity=p.group===i?.22:.16;}else{m.emissive.setHex(m.userData.emissive);m.emissiveIntensity=m.userData.emissiveIntensity;}m.needsUpdate=true;}
 }
 setHover(i:number){if(i===this.hover)return;this.hover=i;this.setFocus(this.focus);}
 pick(nx:number,ny:number){this.raycaster.setFromCamera(new THREE.Vector2(nx,ny),this.camera);const hit=this.raycaster.intersectObjects(this.groups.filter((_,i)=>this.focus<0||i===this.focus),true).find(h=>{const p=h.point;return p.x<=this.clip.constant+.01;});return hit?(hit.object.userData.group as number):-1;}
 // Fly to a structure and orbit around it.
 inspectGroup(i:number){
  this.setFocus(i);if(i<0){this.setInspect(false);return;}
  const box=new THREE.Box3().setFromObject(this.groups[i]);const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()).length();
  const dir=new THREE.Vector3(.85,.5,1).normalize();const pos=c.clone().addScaledVector(dir,Math.max(9,s*.85));pos.y=Math.max(pos.y,2);
  this.orbitTarget.copy(c);this.inspect=true;this.controls.enabled=true;this.container.classList.add('inspect');this.fly={pos,target:c,t:0};
 }
 // Screen position (px in the container) of a world point; front is false behind the camera.
 project(p:THREE.Vector3){const v=p.clone().project(this.camera);return {x:(v.x+1)/2*this.container.clientWidth,y:(1-v.y)/2*this.container.clientHeight,front:v.z<1};}
 box(i:number){return new THREE.Box3().setFromObject(this.groups[i]);}
 // The light path: a beam that grows from the gate through the basin and the rose up to the veil's eye.
 setBeam(on:boolean){
  this.beamOn=on;this.beamT=0;
  if(on&&!this.beam){
   const curve=new THREE.CatmullRomCurve3(KEYPOINTS.map(k=>new THREE.Vector3(...k.pos)),false,'catmullrom',.2);this.beam=new THREE.Group();
   for(const [r,o,c] of [[.16,.95,'#e8eeff'],[.55,.3,'#7f9cff'],[1.4,.1,'#5b7ff0']] as const){const m=new THREE.Mesh(new THREE.TubeGeometry(curve,160,r,10,false),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));m.userData.peak=o;this.beam.add(m);}
   for(const k of KEYPOINTS){const s=new THREE.Mesh(new THREE.SphereGeometry(.6,16,12),new THREE.MeshBasicMaterial({color:'#dfe7ff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));s.position.set(...k.pos);s.userData.peak=.8;s.userData.glow=true;this.beam.add(s);}
   this.scene.add(this.beam);
  }
  if(this.beam)this.beam.visible=on;
  if(!on)this.setFocus(this.focus);
 }
 groupProgress(g:number){return smooth(this.split*(1+STAGGER*(GROUPS.length-1))-STAGGER*g);}
 render(dt:number,t:number,dark=false){
  if(!this.enabled)return;this.clock+=this.reduced?0:Math.min(dt,.05);this.targetTheme=dark?1:0;this.theme=THREE.MathUtils.damp(this.theme,this.targetTheme,4,dt);
  const color=new THREE.Color('#dfe7e4').lerp(new THREE.Color('#0c1b25'),this.theme);
  (this.scene.background as THREE.Color).copy(color);const fog=this.scene.fog as THREE.Fog;fog.color.copy(color);
  // The overview and inspections need to see the far spire; the film keeps the denser haze.
  const far=this.mode==='sanctum'&&(this.overview||this.inspect)?1:0;fog.near=THREE.MathUtils.lerp(fog.near,40+far*60,this.snap?1:.05);fog.far=THREE.MathUtils.lerp(fog.far,130+far*120,this.snap?1:.05);
  this.split=this.snap?this.explodeTarget:THREE.MathUtils.damp(this.split,this.explodeTarget,this.reduced?20:2.2,dt);
  // Groups open one after another; inside a group each piece leaves on its own delay and direction.
  const gp=this.groups.map((_,i)=>this.groupProgress(i));
  for(const p of this.parts){const k=smooth(gp[p.group]*(1+p.delay*.6)-p.delay*.6);
   p.mesh.position.copy(p.base).addScaledVector(p.explode,k);
   if(p.float!==undefined)p.mesh.position.y+=Math.sin(this.clock*.6+p.float)*.35;
   p.mesh.rotation.set(p.baseRot.x+p.spin.x*this.clock+k*p.explode.x*.01,p.baseRot.y+p.spin.y*this.clock,p.baseRot.z+p.spin.z*this.clock);}
  const isFaith=this.mode==='faith';this.root.visible=!isFaith;this.birds.visible=isFaith||this.mode==='home';
  this.birds.children.forEach((bird,i)=>{const base=bird.userData.base as THREE.Vector3;bird.position.copy(base);bird.position.x+=Math.sin(this.clock*.11+i)*2.5;bird.position.y+=Math.sin(this.clock*.4+i)*.5;bird.rotation.y=.2+Math.sin(this.clock*.16+i)*.2;bird.getObjectByName('right')!.rotation.z=Math.sin(this.clock*3+i)*.5;bird.getObjectByName('left')!.rotation.z=-Math.sin(this.clock*3+i)*.5;});
  this.birds.position.y=isFaith?0:10;
  const water=this.scene.getObjectByName('water') as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;water.material.uniforms.time.value=this.clock;water.material.uniforms.dark.value=this.theme;
  if(this.fly){const k=this.snap?1:1-Math.exp(-dt*3.2);this.camera.position.lerp(this.fly.pos,k);this.controls.target.lerp(this.fly.target,k);this.fly.t+=dt;if(this.fly.t>1.6)this.fly=null;this.controls.update();}
  else if(!this.inspect){
   const city=this.mode==='city',sanctum=this.mode==='sanctum',op=this.mode==='operator';
   // Overview: the whole sanctum from the entrance side, pulling back as it opens.
   const back=1+this.split*.32;
   // The light path is framed side-on so the gate, the basin, the rose and the eye are all in view.
   const lv=sanctum&&this.lightView;
   const desired=lv?new THREE.Vector3(96,21,-14):isFaith?new THREE.Vector3(0,8,30):sanctum&&this.overview?new THREE.Vector3(50*back,30*back,56*back):sanctum?new THREE.Vector3(0,4.5,23-(t-96.5)*.26):city?new THREE.Vector3(20,13,30):op?new THREE.Vector3(16,9,26):new THREE.Vector3(23,10,29);
   const target=lv?new THREE.Vector3(0,18,-24):sanctum&&this.overview?new THREE.Vector3(0,17+this.split*5,-16):sanctum?new THREE.Vector3(0,8,-24):isFaith?new THREE.Vector3(0,7,-6):new THREE.Vector3(-3,6,-9);
   if(!this.reduced&&!lv){desired.x+=this.pointer.x*(this.overview?3:.8);desired.y+=this.pointer.y*.3;}
   const k=this.snap?1:1-Math.exp(-dt*2);this.camera.position.lerp(desired,k);this.orbitTarget.lerp(target,k);this.camera.lookAt(this.orbitTarget);
  }else this.controls.update();
  if(this.beam&&this.beamOn){this.beamT+=dt;const grow=smooth(this.beamT/1.8),pulse=.8+.2*Math.sin(this.clock*3.2);
   for(const m of this.beam.children as THREE.Mesh[]){const mat=m.material as THREE.MeshBasicMaterial;mat.opacity=m.userData.peak*pulse*(m.userData.glow?smooth(this.beamT/1.8-.2):grow);
    if(!m.userData.glow&&m.geometry.index)m.geometry.setDrawRange(0,Math.floor(m.geometry.index.count*grow/6)*6);else if(m.userData.glow)m.scale.setScalar(1+.25*Math.sin(this.clock*4+m.position.y));}
   // The lavender glass catches the light as it passes.
   for(const p of this.parts){const mat=p.mesh.material as THREE.MeshStandardMaterial;if(mat.name==='lavender')mat.emissiveIntensity=mat.userData.emissiveIntensity+grow*.9*pulse;}}
  this.renderer.render(this.scene,this.camera);
  this.frameCount++;this.fpsClock+=dt;if(this.fpsClock>1){this.onStats?.(Math.round(this.frameCount/this.fpsClock));this.fpsClock=0;this.frameCount=0;}
 }
 dispose(){this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.reflection.getRenderTarget().dispose();this.renderer.dispose();}
}
