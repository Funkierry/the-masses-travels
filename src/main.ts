import './style.css';
import './graphic.css';
import { assetUrl, resolveMarkupAssets } from './assets.ts';
import { operators, records, routeNodes, glyphs, WORD, type Glyph } from './data.ts';
import { wrap } from './util.ts';
import { readStored, saveStored } from './storage.ts';
import { World } from './scene.ts';
import { GROUPS } from './sanctum.ts';
import { rng } from './graphics.ts';
import { personnelPlate, homePlate, recordPlate, svgImage, PAGE, type PlateTheme } from './plates.ts';
import { Reticle, NodeField, scramble, burst, ripple, morphGlyph, type Burst } from './fx.ts';
import { RouteMap } from './route.ts';
import { Atlas } from './atlas.ts';

import { icon, seal, ring, opArc, ARC_NODES } from './ui.ts';

type Mode='home'|'operators'|'records'|'atlas'|'sanctum';
type Settings={sound:boolean;volume:number;motion:boolean;quality:'high'|'low';blueprint:boolean;bgm:boolean};
const defaults:Settings={sound:false,volume:.38,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,quality:'high',blueprint:false,bgm:true};
const storedSettings=readStored<Partial<Settings>|null>('settings',defaults);
let settings={...defaults,...(storedSettings&&typeof storedSettings==='object'?storedSettings:{})};
settings.volume=Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.38;
settings.sound=settings.sound===true;settings.motion=settings.motion!==false;settings.quality=settings.quality==='low'?'low':'high';settings.blueprint=settings.blueprint===true;settings.bgm=settings.bgm!==false;
const storedBookmarks=readStored<unknown>('bookmarks',[]);
let bookmarks=new Set<string>((Array.isArray(storedBookmarks)?storedBookmarks:[]).filter((x):x is string=>typeof x==='string'&&[...operators,...records].some(r=>r.id===x)));
const storedVisited=readStored<unknown>('visited',[]);
const visited=new Set<string>((Array.isArray(storedVisited)?storedVisited:[]).filter((x):x is string=>typeof x==='string'&&routeNodes.some(n=>n.id===x)));
const storedLetters=readStored<unknown>('letters',[]);
const letters=new Set<number>((Array.isArray(storedLetters)?storedLetters:[]).filter((x):x is number=>Number.isInteger(x)&&x>=0&&x<WORD.length));
let mode:Mode='home',operatorIndex=0,alt=false,modalOpen=false,arcTag=-1;
let modalReturn:HTMLElement|null=null;
let enterTimer=0,activeScreen:HTMLElement|null=null,transitionTimer=0,scanTimer=0;
const app=document.querySelector<HTMLDivElement>('#app')!;
const navItems:[Mode,string,string][]=[['home','序章','PROLOGUE'],['operators','众生','PEOPLE'],['records','行迹','ROUTE'],['atlas','图谱','ATLAS'],['sanctum','圣堂','SANCTUM']];
app.innerHTML=resolveMarkupAssets(`
<main id="stage" class="mode-home" aria-label="众生行记交互界面">
 <div id="world"></div><div class="world-veil"></div><div id="haze" aria-hidden="true"><i></i><i></i><i></i></div><canvas id="node-field" aria-hidden="true"></canvas><div id="glyphs" aria-label="散落的字母"></div><div class="paper-grain"></div><div id="blueprint-wash" aria-hidden="true"></div>
 <div class="crosshair crosshair-one">+</div><div class="crosshair crosshair-two">+</div><div class="edge-label">LATERANO / 1099 / MEMORY ARCHIVE</div><div class="edge-ruler" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
 <header class="topbar"><button class="brand" data-action="home" aria-label="返回众生行记首页">${seal}<span>ARKNIGHTS<small>THE MASSES' TRAVELS</small></span></button><div class="top-context"><span class="live-dot"></span><span id="mode-caption">众生行记 · 交互映像</span></div><div class="word-progress" id="word-progress" aria-label="已收集的字母" title="在各个页面寻找蓝色字母">${[...WORD].map((c,i)=>`<span data-letter="${i}">${c}</span>`).join('')}</div><div class="top-tools"><button data-action="search" aria-label="检索档案" title="检索 /">${icon('search')}</button><button data-action="saved" aria-label="查看收藏" title="收藏">${icon('star')}<i id="saved-count"></i></button><button id="blueprint-toggle" data-action="blueprint" aria-label="图纸模式" title="图纸模式 B">${icon('grid')}</button><button id="sound-toggle" data-action="sound" aria-label="开启声音" title="声音 M">${icon('mute')}</button><button data-action="fullscreen" aria-label="切换全屏" title="全屏 F">${icon('full')}</button><button data-action="settings" aria-label="设置" title="设置">${icon('settings')}</button></div></header>
 <section id="home" class="screen home-screen" aria-label="首页">
  <div class="home-geometry">${ring}<span>ἡ ὁδὸς</span></div>
  <div class="home-stack back" aria-hidden="true"><img class="hs rays" src="/assets/game/rays-white.webp" alt=""><img class="hs spire" src="/assets/game/sky-spire.webp" alt=""><img class="hs ruler" src="/assets/game/y-ruler.webp" alt=""><img class="hs column" src="/assets/game/text-column.webp" alt=""><img class="hs reflect" src="/assets/game/reflect-blue.webp" alt=""></div>
  <div class="home-plate plate-host" aria-label="主视觉图版">${homePlate()}<i class="plate-scanline"></i></div>
  <div class="home-stack front" aria-hidden="true"><img class="hs blade" src="/assets/game/blade-a.webp" alt=""><img class="hs blade2" src="/assets/game/blade-c.webp" alt=""><img class="hs star s1" src="/assets/game/star-blue.webp" alt=""><img class="hs star s2" src="/assets/game/star-blue.webp" alt=""><img class="hs star s3" src="/assets/game/star-blue.webp" alt=""><img class="hs hand" src="/assets/game/hand-white.webp" alt=""></div><span class="home-stamp" aria-hidden="true">E</span>
  <div class="home-copy"><span class="eyebrow" data-scramble>ARKNIGHTS / 6TH ANNIVERSARY</span><div class="home-wordmark" aria-label="The Masses' Travels"><span>The</span><span>Masses'</span><span>Travels</span></div><div class="title-cn"><span class="hairline"></span><h1>众生行记</h1><span class="tiny-symbol">✦</span></div><p class="home-quote">若祈祷无用，<br>那我们因何祈祷？</p><div class="home-actions"><button class="primary" data-action="records" data-scan><span>启程</span><small>BEGIN THE ROUTE · ${routeNodes.length} NODES</small>${icon('arrow')}</button><button class="text-button" data-action="explore" data-scan>众生档案 <span>↗</span></button></div></div>
  <nav class="home-dial" aria-label="快速入口">${[['operators','众生','PEOPLE','halo'],['records','行迹','ROUTE','route'],['atlas','图谱','ATLAS','bird']].map(([a,cn,en,ic],i)=>`<button data-action="${a}" data-scan style="--i:${i}"><span class="dial-icon">${icon(ic)}<i></i></span><b>${cn}<small>${en}</small></b></button>`).join('')}</nav>
  <div class="home-caption"><span>01 — 06</span><p>以众生之名<br><small>A JOURNEY TOWARDS THE LIGHT</small></p><button data-action="about" aria-label="关于本项目">${icon('info')}</button></div>
  <div class="home-side">FAITH. &nbsp; ORDER. &nbsp; FREEDOM.</div>
 </section>
 <section id="operators" class="screen hidden" aria-label="干员档案">
  <div class="operator-grid"></div><div class="operator-orbit">${ring}<span class="ring-label">A / PERSONNEL</span></div>
  <div class="op-arc">${opArc}${ARC_NODES.map((a,i)=>`<button class="arc-node" data-action="arc-tag" data-tag="${i}" style="left:${50+46*Math.cos(a*Math.PI/180)}%;top:${50+46*Math.sin(a*Math.PI/180)}%" aria-label="档案标记 ${i+1}">＋</button>`).join('')}<div class="arc-tip" id="arc-tip"></div></div>
  <div class="op-stack" aria-hidden="true"><img class="os column" src="/assets/game/text-column.webp" alt=""><img class="os star a" src="/assets/game/star-blue.webp" alt=""><img class="os star b" src="/assets/game/star-blue.webp" alt=""><img class="os blade" src="/assets/game/blade-d.webp" alt=""><img class="os hex" src="/assets/game/hex-set.webp" alt=""></div>
  <div class="operator-art plate-host" id="operator-art" data-action="alt" data-cursor="切换版式"></div><div class="op-glitch" aria-hidden="true"></div>
  <div class="operator-copy"><div class="operator-kicker"><span>NEW OPERATOR</span><i></i><small id="op-id"></small></div><h2 id="op-name"></h2><div class="op-subtitle"><span id="op-chinese"></span><span id="op-stars"></span><span class="op-latin" id="op-latin"></span></div><div class="op-profession"><span id="profession-icon">✧</span><div id="op-role"></div><div class="profession-lines">╱╱╱<br>00 / RHODES ISLAND</div></div><p id="op-quote"></p><div class="op-tools"><button data-action="alt" id="alt-toggle" class="line-button">版式 B</button><button data-action="construct" id="construct-toggle" class="line-button">构造线</button><button data-action="bookmark" id="bookmark-toggle" class="line-button">${icon('star')} 收藏</button><button data-action="details" class="line-button">档案 ${icon('arrow')}</button><button data-action="card" class="line-button">卡片</button></div></div>
  <div class="operator-selector"><button data-action="previous" aria-label="上一位干员">${icon('back')}</button><span id="operator-number">04</span><span class="selector-rule"></span><span class="total">0${operators.length}</span><button data-action="next" aria-label="下一位干员">${icon('arrow')}</button><div id="operator-tabs">${operators.map((o,i)=>`<button data-op="${i}" aria-label="查看${o.name}"><span>0${i+1}</span>${o.name}</button>`).join('')}</div></div>
  <div class="op-footnote">PERSONNEL PLATE <span>↔ 切换干员 · 悬停图版显示构造线 · 点击图版切换版式</span></div>
 </section>
 <section id="records" class="screen hidden" aria-label="行迹地图"></section>
 <section id="atlas" class="screen hidden" aria-label="羽兽图谱"></section>
 <section id="sanctum" class="screen hidden" aria-label="圣堂空间"><div class="sanctum-heading"><span class="eyebrow" data-scramble>THE ARCHITECTURE OF FAITH</span><h2>圣堂</h2><p>每一道弧线，都通往同一束光。</p></div>
  <div class="sanctum-tools"><button class="line-button" id="inspect-toggle" data-action="inspect">${icon('full')} 360° 漫游</button><button class="line-button" id="explode-toggle" data-action="explode">${icon('layers')} 结构展开</button><button class="line-button" data-action="explode-play">逐层展开 ▶</button><button class="line-button" data-action="reset-view">${icon('reset')} 复位</button></div>
  <div class="sanctum-sliders"><label><span>展开</span><input type="range" id="explode-range" min="0" max="100" value="0" aria-label="结构展开程度"><b id="explode-value">0%</b></label><label><span>剖切</span><input type="range" id="section-range" min="0" max="100" value="0" aria-label="剖切位置"><b id="section-value">—</b></label></div>
  <div class="structure-list"><small>ARCHITECTURAL ANATOMY · ${GROUPS.length}</small>${GROUPS.map((g,i)=>`<button data-action="sanctum-part" data-part="${i}" data-cursor="${g.en}"><span>0${i+1}</span><b>${g.name}<em>${g.en}</em></b><i></i></button>`).join('')}<button class="check-all" data-action="sanctum-check" id="sanctum-check">逐项检查 ▶</button></div>
  <aside class="sanctum-report" id="sanctum-report" aria-live="polite"></aside>
  <div class="sanctum-hover" id="sanctum-hover" aria-hidden="true"></div>
  <div class="sanctum-hint" id="sanctum-hint">点击建筑或右侧列表检查结构 · 漫游时拖动旋转 · 滚轮缩放 · 右键平移</div><div class="sanctum-caption">AN ENDLESS<br><i>passage.</i></div></section>
 <footer class="bottom-bar"><span class="edition">SIDESTORY <i>06</i></span><nav aria-label="主导航">${navItems.map(([m,cn,en],i)=>`<button data-action="${m}" data-nav="${m}" data-cursor="${en}"><small>0${i}</small><span data-scramble>${cn}</span></button>`).join('')}</nav><button data-action="about" class="edition about-button">INTERACTIVE EDITION <span>↗</span></button></footer>
 <div id="transition-fx" aria-hidden="true"></div>
 <div id="bloom" aria-hidden="true"></div><div id="ripples" aria-hidden="true"></div><div id="toast" role="status" aria-live="polite"></div>
 <div id="dialog-layer" class="hidden"><div class="dialog-shade" data-action="close-modal"></div><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button class="dialog-close" data-action="close-modal" aria-label="关闭弹窗">${icon('close')}</button><div id="dialog-content"></div></section></div>
</main>`);

const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const stage=$('#stage');
let world:World|null=null;
// ?still (for screenshots and checks): no tweening, every state lands at once.
const still=new URLSearchParams(location.search).has('still');if(still){settings.motion=false;}
try{world=new World($('#world'));if(still)world.snap=true;world.reduced=!settings.motion;world.setQuality(settings.quality);}catch(e){$('#world').classList.add('fallback');console.warn('WebGL unavailable; using artwork backdrop.',e);}
// The activity's system theme plays while sound is on.
const bgm=new Audio(assetUrl('game/bgm-sys.mp3'));bgm.loop=true;bgm.preload='none';
function syncBgm(){bgm.volume=settings.volume*.55;if(settings.sound&&settings.bgm&&!document.hidden){if(bgm.paused)void bgm.play().catch(()=>{});}else bgm.pause();}
const reticle=new Reticle(stage),field=new NodeField($<HTMLCanvasElement>('#node-field'));
const route=new RouteMap($('#records'),visited,()=>bookmarks,()=>saveStored('visited',[...visited]));
let sfx:AudioContext|null=null;
function tickSound(pitch=700){if(!settings.sound)return;try{sfx??=new AudioContext();if(sfx.state==='suspended')void sfx.resume();const o=sfx.createOscillator(),g=sfx.createGain();o.type='sine';o.frequency.setValueAtTime(pitch,sfx.currentTime);o.frequency.exponentialRampToValueAtTime(pitch*.47,sfx.currentTime+.07);g.gain.setValueAtTime(.027*settings.volume,sfx.currentTime);g.gain.exponentialRampToValueAtTime(.001,sfx.currentTime+.12);o.connect(g);g.connect(sfx.destination);o.start();o.stop(sfx.currentTime+.13);}catch{}}
const atlas=new Atlas($('#atlas'),()=>tickSound(980));
function persist(){if(!still)saveStored('settings',settings);route.seq.reduced=!settings.motion;document.documentElement.dataset.reduced=settings.motion?'0':'1';stage.classList.toggle('reduced-motion',!settings.motion);stage.classList.toggle('theme-blueprint',settings.blueprint);$('#blueprint-toggle').classList.toggle('active',settings.blueprint);$('#blueprint-toggle').setAttribute('aria-pressed',String(settings.blueprint));world&&(world.reduced=!settings.motion);$('#sound-toggle').innerHTML=icon(settings.sound?'sound':'mute');$('#sound-toggle').setAttribute('aria-label',settings.sound?'关闭声音':'开启声音');$('#sound-toggle').setAttribute('aria-pressed',String(settings.sound));syncBgm();}
const burstFor:Record<Mode,Burst>={home:'wipe',operators:'mosaic',records:'scan',atlas:'scan',sanctum:'wipe'};
function transition(kind:Burst=burstFor[mode]){if(!settings.motion)return;clearTimeout(transitionTimer);stage.classList.remove('transitioning');void stage.offsetWidth;stage.classList.add('transitioning');burst($('#transition-fx'),kind,getComputedStyle(stage).getPropertyValue('--accent').trim()||'#2448d8');transitionTimer=window.setTimeout(()=>stage.classList.remove('transitioning'),850);}
function toast(message:string){$('#toast').textContent=message;$('#toast').classList.add('visible');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('#toast').classList.remove('visible'),2600);}let toastTimer=0;
function hideScreens(){for(const s of document.querySelectorAll('.screen'))s.classList.add('hidden');}
function scrambleVisible(){if(!settings.motion)return;document.querySelectorAll<HTMLElement>('.screen:not(.hidden) [data-scramble]').forEach((el,i)=>setTimeout(()=>scramble(el,640),i*90));}

// Letters scattered over each screen; the blue ones can be collected.
function renderGlyphs(key:string){
 const list:Glyph[]=glyphs[key]??[];
 $('#glyphs').innerHTML=list.map((g,i)=>{const got=g.key!==undefined&&letters.has(g.key);return g.key!==undefined&&got?'':`<span class="glyph${g.key!==undefined?' key':''}${g.flip?` flip-${g.flip}`:''}" style="--x:${g.x}%;--y:${g.y}%;--s:${g.size}px;--d:${g.depth};--i:${i};--dof:${g.key!==undefined?0:g.depth<.7?2.4:g.depth>1.15?1:0}px" ${g.key!==undefined?`data-action="glyph" data-key="${g.key}" role="button" tabindex="0" aria-label="收集字母 ${g.ch}" data-cursor="收集 ${g.ch}"`:''}>${g.ch}</span>`;}).join('');
}
function updateWord(){document.querySelectorAll<HTMLElement>('[data-letter]').forEach(s=>s.classList.toggle('got',letters.has(+s.dataset.letter!)));$('#word-progress').classList.toggle('complete',letters.size===WORD.length);}
function collect(el:HTMLElement){
 const k=+el.dataset.key!;if(letters.has(k))return;letters.add(k);saveStored('letters',[...letters]);tickSound(1200);
 const from=el.getBoundingClientRect(),to=$(`[data-letter="${k}"]`).getBoundingClientRect();
 const ghost=el.cloneNode(true) as HTMLElement;ghost.className='glyph-ghost';ghost.removeAttribute('data-action');Object.assign(ghost.style,{left:`${from.left}px`,top:`${from.top}px`,fontSize:getComputedStyle(el).fontSize});stage.append(ghost);
 el.remove();
 const anim=ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${Math.max(.08,to.height/from.height)})`,opacity:.9}],{duration:settings.motion?760:1,easing:'cubic-bezier(.7,0,.2,1)'});
 anim.onfinish=()=>{ghost.remove();updateWord();$(`[data-letter="${k}"]`).classList.add('pop');
  if(letters.size===WORD.length){toast('LATERANO · 字母已集齐，图纸模式开启（B 键切换）');settings.blueprint=true;persist();transition('scan');}
  else toast(`拾得字母「${WORD[k]}」 · ${letters.size} / ${WORD.length}`);};
}

const fieldPresets:Partial<Record<Mode,()=>void>>={
 home:()=>field.set(7,[.46,.14,.96,.86],18,{x:.66,y:.44,r:.21}),
 operators:()=>field.set(19,[.5,.1,.96,.9],16,{x:.72,y:.46,r:.24})
};
function setMode(next:Mode,animate=true){
 const outgoing=animate&&settings.motion?document.querySelector<HTMLElement>('.screen:not(.hidden)'):null;
 if(animate)transition(burstFor[next]);mode=next;
 stage.className=`mode-${mode}${!settings.motion?' reduced-motion':''}${settings.blueprint?' theme-blueprint':''}${animate&&settings.motion?' transitioning':''}${reticle.enabled?' has-reticle':''}`;
 hideScreens();
 document.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(b=>{b.classList.toggle('selected',b.dataset.nav===mode);b.setAttribute('aria-current',b.dataset.nav===mode?'page':'false');});
 $('#mode-caption').textContent=({home:'众生行记 · 平面图录',operators:'众生群像 · 人员图版',records:'行迹 · 关卡地图',atlas:'图谱 · 羽兽与圣像',sanctum:'圣堂 · 空间研究'})[mode];
 field.active=!!fieldPresets[next];field.auto=false;fieldPresets[next]?.();
 renderGlyphs(next);
 if(next==='home'){$('#home').classList.remove('hidden');world?.setMode('home');}
 if(next==='operators'){$('#operators').classList.remove('hidden');world?.setMode('operator');renderOperator(true);}
 if(next==='records'){$('#records').classList.remove('hidden');world?.setMode('city');route.enter();}
 if(next==='atlas'){$('#atlas').classList.remove('hidden');world?.setMode('faith');atlas.enter();}
 if(world)world.overview=next==='sanctum';$('#world').classList.toggle('pickable',next==='sanctum');if(next!=='sanctum'){stopTour();$('#sanctum-report').classList.remove('visible');stage.classList.remove('sanctum-focus');}
 if(next==='sanctum'){$('#sanctum').classList.remove('hidden');world?.setMode('sanctum');updateWorldControls();}
 const incoming=document.querySelector<HTMLElement>('.screen:not(.hidden)');activeScreen=incoming;
 if(incoming&&settings.motion&&animate){incoming.classList.remove('entering');void incoming.offsetWidth;incoming.classList.add('entering');clearTimeout(enterTimer);enterTimer=window.setTimeout(()=>incoming.classList.remove('entering'),1100);}
 if(outgoing&&outgoing!==incoming&&outgoing.classList.contains('hidden')){outgoing.classList.remove('hidden');outgoing.classList.add('leaving');outgoing.inert=true;window.setTimeout(()=>{outgoing.classList.remove('leaving');outgoing.inert=false;if(outgoing!==activeScreen)outgoing.classList.add('hidden');},460);}
 scrambleVisible();syncBgm();
}
// Operator name letters converge from scattered positions while pixel blocks flicker out (PV 01:01).
function nameMarkup(lines:string[],seed:number){const r=rng(seed);let j=0;return lines.map((line,i)=>`<span class="name-line line-${i}">${[...line].map(c=>`<span class="ch" style="--dx:${((r()-.5)*260).toFixed(0)}px;--dy:${((r()-.5)*140).toFixed(0)}px;--r:${((r()-.5)*40).toFixed(0)}deg;--sc:${(.6+r()*1.4).toFixed(2)};--j:${j++}">${c}</span>`).join('')}</span>`).join('');}
function opGlitch(){if(!settings.motion)return;const r=rng(Math.floor(Math.random()*1e5));$(".op-glitch").innerHTML=Array.from({length:16},(_,i)=>{const left=r()<.55?6+r()*42:50+r()*40;const top=r()<.55?14+r()*34:10+r()*80;return `<b style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;width:${(.6+r()*5).toFixed(1)}%;height:${(.5+r()*2.6).toFixed(1)}%;--j:${i};background:${['var(--accent)','#1e2326','#c7cecd','#eef1ef','var(--cobalt)'][Math.floor(r()*5)]}"></b>`;}).join('');}
function renderOperator(animate=false){
 const o=operators[operatorIndex];stage.style.setProperty('--accent',o.color);$('#op-id').textContent=`0${operatorIndex+1} / RHODES ISLAND`;
 const nameEl=$('#op-name');nameEl.innerHTML=nameMarkup(o.lines,operatorIndex*31+(alt?7:0));nameEl.setAttribute('aria-label',o.english);
 nameEl.className=o.id;if(animate&&settings.motion){void nameEl.offsetWidth;nameEl.classList.add('assemble');opGlitch();}
 $('#op-chinese').textContent=o.name;$('#op-stars').textContent='★'.repeat(o.stars);$('#op-latin').textContent=o.english.toUpperCase();
 $('#op-role').innerHTML=`<strong>${o.role} · ${o.branch}</strong><small>${o.roleEn}</small>`;
 $('#op-quote').textContent=`“${o.quote}”`;
 // The personnel plate stands where artwork used to: layers assemble in depth order on every change.
 const host=$('#operator-art');host.innerHTML=personnelPlate(o,operatorIndex,PAGE,alt);host.classList.toggle('alt',alt);if(animate&&settings.motion){host.classList.remove('assemble');void host.offsetWidth;host.classList.add('assemble');}
 $('#operator-number').textContent=`0${operatorIndex+1}`;$('#alt-toggle').textContent=alt?'版式 A':'版式 B';$('#alt-toggle').classList.toggle('active',alt);
 $('#bookmark-toggle').classList.toggle('active',bookmarks.has(o.id));$('#bookmark-toggle').innerHTML=`${icon('star')} ${bookmarks.has(o.id)?'已收藏':'收藏'}`;
 document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.op)===operatorIndex);b.setAttribute('aria-pressed',String(Number(b.dataset.op)===operatorIndex));});
 arcTag=-1;$('#arc-tip').classList.remove('visible');document.querySelectorAll('.arc-node').forEach(b=>b.classList.remove('active'));
}
function selectOperator(i:number,animate=true){operatorIndex=wrap(i,operators.length);if(mode!=='operators')setMode('operators',animate);else{if(animate)transition('mosaic');renderOperator(animate);}tickSound();}
function toggleBookmark(id:string){bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id);saveStored('bookmarks',[...bookmarks]);updateBookmarks();toast(bookmarks.has(id)?'已收藏到本机档案':'已取消收藏');}
function updateBookmarks(){$('#saved-count').textContent=bookmarks.size?String(bookmarks.size):'';if(mode==='operators')renderOperator();if(mode==='records')route.render();}
function routeTo(predicate:(n:typeof routeNodes[number])=>boolean){const i=routeNodes.findIndex(predicate);if(i>=0)route.selected=i;setMode('records');}

function openModal(content:string,wide=false){$('.dialog').classList.remove('card');modalReturn=document.activeElement as HTMLElement;modalOpen=true;$('#dialog-content').innerHTML=content;$('#dialog-layer').classList.remove('hidden');$('.dialog').classList.toggle('wide',wide);$('.dialog').scrollTop=0;for(const el of [...document.querySelectorAll<HTMLElement>('#stage > :not(#dialog-layer):not(#toast):not(#reticle)')])el.inert=true;setTimeout(()=>($('#dialog-content input')||$('.dialog-close')).focus(),30);}
function closeModal(){modalOpen=false;$('#dialog-layer').classList.add('hidden');for(const el of document.querySelectorAll<HTMLElement>('#stage > *'))el.inert=false;modalReturn?.focus();}
function searchModal(savedOnly=false){openModal(`<span class="eyebrow">${savedOnly?'SAVED RECORDS':'ARCHIVE INDEX'}</span><h2 id="dialog-title">${savedOnly?'我的收藏':'检索档案'}</h2><div class="search-field">${icon('search')}<input id="search-input" placeholder="搜索姓名、场景、MT-3、拉特兰…" autocomplete="off" aria-label="搜索档案"></div><div id="search-results"></div><div class="dialog-foot">${savedOnly?'收藏仅存储在当前浏览器':`${operators.length} 份干员档案 / ${routeNodes.length} 个行迹节点 / 3 张图谱`}<span>ESC 关闭</span></div>`,true);const input=$<HTMLInputElement>('#search-input');const update=()=>{const q=input.value.toLowerCase().trim();const candidates=[...operators.map((o,i)=>({id:o.id,title:o.name,en:o.english,type:'干员',kind:'op',index:i,search:[o.name,o.english,...o.tags].join(' ')})),...routeNodes.map((n,i)=>({id:n.record!==undefined?records[n.record].id:n.id,title:n.title,en:`${n.code} · ${n.en}`,type:'行迹',kind:'route',index:i,search:n.code+n.title+n.en+n.description})),...['羽兽 · 羽兽何以飞翔 ON FLIGHT','圣像 · 光环之下 BENEATH THE HALO'].map((s,i)=>({id:`plate-${i}`,title:s.split(' · ')[0],en:`PLATE 0${i+1}`,type:'图谱',kind:'atlas',index:i,search:s+' 图谱 atlas blueprint'}))].filter(r=>(!savedOnly||bookmarks.has(r.id))&&r.search.toLowerCase().includes(q));$('#search-results').innerHTML=candidates.length?candidates.map(r=>`<button class="search-result" data-search-type="${r.kind}" data-index="${r.index}"><small>${r.type}</small><span>${r.title}<em>${r.en}</em></span><i>↗</i></button>`).join(''):`<div class="empty-state">${savedOnly&&!bookmarks.size?'还没有收藏。<br><small>在干员或行迹中点击 ☆，将片段留在这里。</small>':'没有找到匹配的记录。'}</div>`;};input.addEventListener('input',update);update();}
function settingsModal(){openModal(`<span class="eyebrow">PREFERENCES</span><h2 id="dialog-title">感官与呈现</h2><label class="setting-row"><span>声音<small>界面点击音效</small></span><input type="checkbox" id="setting-sound" ${settings.sound?'checked':''}></label><label class="setting-row"><span>活动 BGM<small>非演出页面播放「众生行记」活动主题音乐</small></span><input type="checkbox" id="setting-bgm" ${settings.bgm?'checked':''}></label><label class="setting-row"><span>音量</span><input type="range" id="setting-volume" min="0" max="100" value="${settings.volume*100}" aria-label="音量"></label><label class="setting-row"><span>完整动态效果<small>关闭后减少视差、故障转场与字母动画</small></span><input type="checkbox" id="setting-motion" ${settings.motion?'checked':''}></label><label class="setting-row"><span>图纸模式<small>灰蓝图纸与钴蓝线稿；集齐 LATERANO 后自动开启</small></span><input type="checkbox" id="setting-blueprint" ${settings.blueprint?'checked':''}></label><label class="setting-row"><span>渲染质量<small>低画质关闭水面反射，降低像素密度</small></span><select id="setting-quality" aria-label="渲染质量"><option value="high" ${settings.quality==='high'?'selected':''}>精细</option><option value="low" ${settings.quality==='low'?'selected':''}>流畅</option></select></label><div class="shortcuts"><span>快捷键</span><p>← → 切换　/ 检索<br>M 声音　B 图纸模式　F 全屏　Esc 返回</p></div><button class="primary" data-action="close-modal">完成 ${icon('arrow')}</button>`);for(const id of ['sound','bgm','volume','motion','blueprint','quality'])$(`#setting-${id}`).addEventListener('input',()=>{settings.sound=$<HTMLInputElement>('#setting-sound').checked;settings.bgm=$<HTMLInputElement>('#setting-bgm').checked;settings.volume=+$<HTMLInputElement>('#setting-volume').value/100;settings.motion=$<HTMLInputElement>('#setting-motion').checked;settings.blueprint=$<HTMLInputElement>('#setting-blueprint').checked;settings.quality=$<HTMLSelectElement>('#setting-quality').value as 'high'|'low';world?.setQuality(settings.quality);persist();});}
function detailsModal(){const o=operators[operatorIndex];openModal(`<span class="eyebrow">PERSONNEL RECORD / 0${operatorIndex+1}</span><h2 id="dialog-title">${o.name}</h2><p class="dialog-latin">${o.english}</p><div class="detail-metadata"><span>职业<b>${o.role} · ${o.branch}</b></span><span>编号<b>PERSONNEL 0${operatorIndex+1} · ${"★".repeat(o.stars)}</b></span></div><blockquote>${o.quote}</blockquote><p class="detail-body">${o.note}</p><p class="credit-note">页面短评与引语为本交互改编的编目文案；角色名称来自《明日方舟》。档案不使用角色立绘，图版为本作绘制的平面构成。</p><div class="detail-actions"><button class="line-button" data-action="card">生成卡片</button><button class="line-button" data-action="export-record">导出记录 ↗</button></div>`);}
function aboutModal(){openModal(`<span class="eyebrow">ABOUT THIS INTERACTIVE EDITION</span><h2 id="dialog-title">众生行记</h2><p class="dialog-latin">The Masses' Travels</p><p class="detail-body">以《明日方舟》六周年 PV 与「众生行记」活动界面为视觉参考的平面设计交互图录：圆环、光环、编号鸟群、镜像衬线字母、半调网点、像素色块与构造线，组成可以操作的版面。</p><p class="detail-body">页面不使用角色立绘与影片画面；干员档案、主视觉与行迹图版均为实时绘制的平面构成，三维圣堂为程序重建。</p><div class="source-links"><a href="https://www.bilibili.com/video/BV15HLdz6E99/" target="_blank" rel="noreferrer">原 PV · 明日方舟六周年 ↗</a><a href="https://www.bilibili.com/video/BV1WFkwBJEhR/" target="_blank" rel="noreferrer">参考 · 众生行记 UI / 交互 / 动效 ↗</a><a href="https://github.com/LBEILC/RhineLabUI" target="_blank" rel="noreferrer">技术结构参考 · RhineLabUI ↗</a></div><p class="credit-note">非官方本地学习作品。明日方舟名称、角色、图像、音乐与原 PV 版权归鹰角网络及相应权利人。活动界面图形取自本机游戏客户端，来源与校验值记录在项目的 game-assets.json 中。</p>`,true);}
function updateWorldControls(){if(!world)return;$('#inspect-toggle').classList.toggle('active',world.inspect);$('#inspect-toggle').innerHTML=`${icon('full')} ${world.inspect?'结束漫游':'360° 漫游'}`;$('#explode-toggle').classList.toggle('active',world.exploded);$('#explode-toggle').innerHTML=`${icon('layers')} ${world.exploded?'结构重组':'结构展开'}`;stage.classList.toggle('inspecting',world.inspect);
 const ev=Math.round(world.explodeTarget*100);$<HTMLInputElement>('#explode-range').value=String(ev);$('#explode-value').textContent=`${ev}%`;$('#section-value').textContent=world.section>0?`x ≤ ${world.clip.constant.toFixed(1)}`:'—';
 document.querySelectorAll<HTMLElement>('[data-part]').forEach(b=>{const i=+b.dataset.part!;b.classList.toggle('active',i===world!.focus);b.classList.toggle('checked',checkedParts.has(i));});}
// Structural inspection: fly to one structure, ghost the rest and list what was checked.
const checkedParts=new Set<number>();let tourTimer=0,explodeTimer=0;
function inspectPart(i:number){
 if(!world)return toast('此浏览器未能启用 WebGL');i=wrap(i,GROUPS.length);world.inspectGroup(i);checkedParts.add(i);const g=GROUPS[i],r=world.reports[i];
 const row=(ok:boolean|null,label:string,value:string)=>`<li class="${ok===null?'info':ok?'ok':'warn'}"><i>${ok===null?'·':ok?'✓':'△'}</i>${label}<b>${value}</b></li>`;
 $('#sanctum-report').innerHTML=`<div class="sr-head"><span class="sr-code">S-0${i+1}</span><b>${g.name}</b><button data-action="sanctum-exit" aria-label="结束检查">✕</button></div><p class="sr-en">${g.en}</p><p class="sr-desc">${g.desc}</p>
  <ul class="sr-checks">${row(r.parts>0,'构件',`${r.parts} 件`)}${row(r.triangles<60000,'三角面',r.triangles.toLocaleString())}${row(null,'外形尺寸',`${r.size[0]} × ${r.size[1]} × ${r.size[2]} m`)}${row(r.valid,'几何有效',r.valid?'无空网格 · 坐标正常':'存在异常')}${g.sym?row(r.symmetric,'左右对称',r.symmetric?'对称':`偏移 ${r.offset} m`):row(null,'左右对称','不要求 · 自由布置')}${g.support==='ground'?row(r.grounded,'支撑',r.grounded?'落地':'未落地'):g.support==='float'?row(!r.grounded,'支撑',r.grounded?'接触地面':'悬浮'):row(null,'支撑',g.support==='piers'?'承于束柱':'承于连拱')}${row(r.travel>0,'展开位移',`最大 ${r.travel} m`)}${row(null,'材质',r.materials.join(' · '))}${r.floating?row(null,'浮动构件',`${r.floating} 件`):''}</ul>
  <div class="sr-actions"><span class="sr-ref">参照 · ${g.pvLabel}</span><button class="line-button" data-action="sanctum-prev" aria-label="上一个结构">←</button><button class="line-button" data-action="sanctum-next" aria-label="下一个结构">→</button></div>`;
 $('#sanctum-report').classList.remove('swap');void $('#sanctum-report').offsetWidth;$('#sanctum-report').classList.add('visible','swap');stage.classList.add('sanctum-focus');
 $('#sanctum-hint').textContent=`正在检查 ${g.name} · 已检查 ${checkedParts.size} / ${GROUPS.length} · Esc 结束`;updateWorldControls();
}
function exitInspect(){stopTour();world?.inspectGroup(-1);$('#sanctum-report').classList.remove('visible');stage.classList.remove('sanctum-focus');$('#sanctum-hint').textContent='点击建筑或右侧列表检查结构 · 漫游时拖动旋转 · 滚轮缩放 · 右键平移';updateWorldControls();}
function stopTour(){clearInterval(tourTimer);tourTimer=0;$('#sanctum-check').classList.remove('active');$('#sanctum-check').textContent='逐项检查 ▶';}
function startTour(){if(tourTimer)return stopTour();let i=0;inspectPart(0);$('#sanctum-check').classList.add('active');$('#sanctum-check').textContent='停止检查 ■';tourTimer=window.setInterval(()=>{i++;if(i>=GROUPS.length){stopTour();toast(`${GROUPS.length} 组结构检查完成`);return;}inspectPart(i);},3400);}
function playExplode(){if(!world)return;clearInterval(explodeTimer);world.split=0;world.explodeTarget=0;let v=0;explodeTimer=window.setInterval(()=>{v=Math.min(1,v+.012);world!.explodeTarget=v;updateWorldControls();if(v>=1)clearInterval(explodeTimer);},40);}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{toast('可使用浏览器 F11 进入全屏');}}
function showArcTag(i:number){
 const o=operators[operatorIndex];arcTag=arcTag===i?-1:i;document.querySelectorAll<HTMLElement>('.arc-node').forEach(b=>b.classList.toggle('active',(+b.dataset.tag!)===arcTag));
 const tip=$('#arc-tip');if(arcTag<0){tip.classList.remove('visible');return;}
 const rows=[[o.tags[0],'ORIGIN','出身与归属'],[o.tags[1],'CLASS',`${o.role} · ${o.branch}`],[o.tags[2],'KEYWORD',o.roleEn]][i];
 const node=document.querySelector<HTMLElement>(`.arc-node[data-tag="${i}"]`)!;tip.style.left=node.style.left;tip.style.top=node.style.top;
 tip.innerHTML=`<small>${String(i+1).padStart(2,'0')} / ${rows[1]}</small><b>${rows[0]}</b><span>${rows[2]}</span>`;tip.classList.remove('visible');void tip.offsetWidth;tip.classList.add('visible');
}
// Home: hovering an entry turns the key plate into its blueprint, with construction lines.
function homeScan(on:boolean){
 clearTimeout(scanTimer);if(mode!=='home')return;
 if(on)stage.classList.add('home-scan');
 else scanTimer=window.setTimeout(()=>stage.classList.remove('home-scan'),260);
}

const actions:Record<string,(el:HTMLElement)=>void>={
 home:()=>setMode('home'),explore:()=>selectOperator(0),operators:()=>setMode('operators'),records:()=>setMode('records'),atlas:()=>setMode('atlas'),sanctum:()=>setMode('sanctum'),
 previous:()=>selectOperator(operatorIndex-1),next:()=>selectOperator(operatorIndex+1),alt:()=>{alt=!alt;transition('mosaic');renderOperator(true);},construct:()=>{const on=$('#operator-art').classList.toggle('construct');$('#construct-toggle').classList.toggle('active',on);},bookmark:()=>toggleBookmark(operators[operatorIndex].id),details:detailsModal,
 search:()=>searchModal(),saved:()=>searchModal(true),settings:settingsModal,about:aboutModal,sound:()=>{settings.sound=!settings.sound;persist();},fullscreen,
 blueprint:()=>{settings.blueprint=!settings.blueprint;transition('scan');persist();toast(settings.blueprint?'图纸模式 · BLUEPRINT':'标准模式 · STANDARD');},
 'close-modal':closeModal,
 'export-record':()=>{const o=operators[operatorIndex];const b=new Blob([JSON.stringify({name:o.name,english:o.english,role:o.role,branch:o.branch,stars:o.stars,tags:o.tags,quote:o.quote,editorialNote:o.note},null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`${o.id}-record.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('记录已导出');},
 inspect:()=>{if(!world)return toast('此浏览器未能启用 WebGL');world.setInspect(!world.inspect);updateWorldControls();},explode:()=>{if(!world)return;clearInterval(explodeTimer);world.exploded=!world.exploded;updateWorldControls();},'reset-view':()=>{clearInterval(explodeTimer);exitInspect();world?.reset();$<HTMLInputElement>('#section-range').value='0';updateWorldControls();},
 'explode-play':()=>playExplode(),'sanctum-part':el=>{stopTour();inspectPart(+el.dataset.part!);},'sanctum-exit':()=>exitInspect(),'sanctum-check':()=>startTour(),'sanctum-prev':()=>{stopTour();inspectPart((world?.focus??0)-1);},'sanctum-next':()=>{stopTour();inspectPart((world?.focus??0)+1);},
 'route-seq':el=>route.seekStage(+el.dataset.seq!),'route-prev':()=>route.step(-1),'route-next':()=>route.step(1),
 'route-open':()=>{const n=routeNodes[route.selected];if(n.operator!==undefined)selectOperator(n.operator);},
 'route-save':()=>{const n=routeNodes[route.selected];const id=n.record!==undefined?records[n.record].id:n.operator!==undefined?operators[n.operator].id:'';if(id)toggleBookmark(id);},
 'atlas-plate':el=>{atlas.setPlate(+el.dataset.plate!);transition('scan');},'atlas-recall':()=>atlas.recall(),'atlas-invert':()=>{const on=$('.atlas-stage').classList.toggle('inverted');$('#atlas-invert').classList.toggle('active',on);},
 'atlas-measure':()=>{const on=$('.atlas-stage').classList.toggle('measure');$('#atlas-measure').classList.toggle('active',on);},'atlas-clear':()=>{document.querySelectorAll('.atlas-stage .lit').forEach(f=>f.classList.remove('lit'));atlas.lit.clear();},
 'arc-tag':el=>showArcTag(+el.dataset.tag!),glyph:el=>collect(el),
 'covenant-reset':()=>atlas.covenant.reset(),'covenant-lines':el=>{atlas.covenant.lines=!atlas.covenant.lines;el.classList.toggle('active',atlas.covenant.lines);},
 card:()=>cardModal(),'card-theme':()=>{cardTheme=(cardTheme+1)%CARD_THEMES.length;void drawCard();},'card-download':()=>downloadCard()
};
document.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('button,[data-action]');if(!button){if(settings.motion&&!modalOpen&&!(e.target as Element).closest('.route-view,.atlas-stage,#world'))ripple($('#ripples'),e.clientX,e.clientY);return;}if(button.hasAttribute('disabled'))return;const a=button.dataset.action;if(a&&actions[a]){tickSound();actions[a](button);return;}if(button.dataset.op!==undefined)selectOperator(+button.dataset.op);if(button.dataset.route!==undefined){route.select(+button.dataset.route);tickSound(860);}if(button.dataset.searchType){const i=+button.dataset.index!;const type=button.dataset.searchType;closeModal();if(type==='op')selectOperator(i);else if(type==='atlas'){setMode('atlas');atlas.setPlate(i);}else{route.selected=i;setMode('records');}}});
stage.addEventListener('pointerover',e=>{const t=(e.target as Element).closest('[data-scan]');if(t)homeScan(true);});
stage.addEventListener('pointerout',e=>{const t=(e.target as Element).closest('[data-scan]');if(t&&!t.contains(e.relatedTarget as Node))homeScan(false);});
stage.addEventListener('pointerover',e=>{const b=(e.target as Element).closest('[data-nav]');const s=b?.querySelector<HTMLElement>('[data-scramble]');if(s&&settings.motion&&!b!.contains(e.relatedTarget as Node))scramble(s,360);});
stage.addEventListener('pointermove',e=>{
 field.point(e.clientX,e.clientY);
 if(!settings.motion)return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;pendingParallax={x,y};world?.pointer.set(x,-y);
});
document.addEventListener('keydown',e=>{
 const input=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
 if(e.key==='Escape'){e.preventDefault();if(modalOpen)closeModal();else if(mode==='sanctum'&&world&&world.focus>=0)exitInspect();else if(mode!=='home')setMode('home');return;}
 if(modalOpen&&e.key==='Tab'){const root=$('.dialog');const focus=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,a')].filter(el=>el.offsetParent!==null);if(!focus.length)return;const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(!input&&(e.key==='Enter'||e.key===' ')&&(e.target as HTMLElement).matches?.('.glyph.key')){e.preventDefault();collect(e.target as HTMLElement);return;}
 if(input||modalOpen||e.ctrlKey||e.metaKey)return;
 if(e.key==='/'){e.preventDefault();searchModal();}if(e.key.toLowerCase()==='m')actions.sound($('#sound-toggle'));if(e.key.toLowerCase()==='f')void fullscreen();if(e.key.toLowerCase()==='b')actions.blueprint($('#blueprint-toggle'));
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const direction=e.key==='ArrowRight'?1:-1;if(mode==='operators'){e.preventDefault();selectOperator(operatorIndex+direction);}else if(mode==='records'){e.preventDefault();route.step(direction);tickSound(860);}else if(mode==='atlas'){e.preventDefault();atlas.setPlate(wrap(atlas.plate+direction,3));transition('scan');}else if(mode==='sanctum'){e.preventDefault();stopTour();inspectPart((world?.focus??-1)+direction);}}
});
addEventListener('resize',()=>{if(stage.classList.contains('home-scan'))stage.classList.remove('home-scan');});
setInterval(()=>{if(settings.motion&&!document.hidden&&!modalOpen)morphGlyph($('#glyphs'));},2300);
document.addEventListener('visibilitychange',syncBgm);

// Memory card: a printable composition of the current node or operator, drawn locally on a canvas.
const CARD_THEMES=[{bg:'#eef0ee',ink:'#22282b',accent:'#3a5bc2',name:'PAPER'},{bg:'#bcc6c8',ink:'#1d2c6a',accent:'#3a5bc2',name:'BLUEPRINT'},{bg:'#1d2226',ink:'#eef0ee',accent:'#8aa2ff',name:'NOCTURNE'}];
let cardTheme=0;
type CardSubject={code:string;kind:string;title:string;en:string;meta:string;desc:string;image:string;inset?:string};
// Plates rendered for the card use the card theme's colours directly.
const cardPlate=(th:typeof CARD_THEMES[number],accent:string):PlateTheme=>({ink:th.ink,paper:th.bg,accent,cobalt:th.accent,muted:th.ink});
function cardSubject():CardSubject{
 const th=CARD_THEMES[cardTheme];
 if(mode==='operators'){const o=operators[operatorIndex];return {code:`PERSONNEL 0${operatorIndex+1}`,kind:`${o.role} · ${o.branch}`,title:o.name,en:o.english,meta:'★'.repeat(o.stars),desc:o.note,image:svgImage(personnelPlate(o,operatorIndex,cardPlate(th,o.color),alt,'svg'))};}
 const i=route.selected,n=routeNodes[i];const op=n.operator!==undefined?operators[n.operator]:null;
 return {code:n.code,kind:n.kind.toUpperCase(),title:n.title,en:n.en,meta:`X ${n.x} · Y ${n.y}`,desc:n.description,image:op?svgImage(personnelPlate(op,n.operator!,cardPlate(th,op.color),false,'svg')):assetUrl(n.preview??'game/stage-01.webp'),inset:op?undefined:svgImage(recordPlate(n.motif??'prologue',n.code,i,cardPlate(th,th.accent)))};
}
const loadImage=(src:string)=>new Promise<HTMLImageElement>((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=fail;i.src=src;});
async function drawCard(){
 const cv=document.querySelector<HTMLCanvasElement>('#card-canvas');if(!cv)return;const c=cv.getContext('2d')!;const th=CARD_THEMES[cardTheme];const s=cardSubject();const W=1600,H=900;
 const [art,pano,inset]=await Promise.all([loadImage(s.image),loadImage(assetUrl('game/map-pano.webp')),s.inset?loadImage(s.inset):Promise.resolve(null)]);
 c.save();c.fillStyle=th.bg;c.fillRect(0,0,W,H);
 c.globalAlpha=cardTheme===2?.08:.2;c.drawImage(pano,-200,40,pano.width*.95,pano.height*.95);c.globalAlpha=1;
 c.fillStyle=th.accent;c.globalAlpha=.22;for(let y=30;y<H;y+=40)for(let x=30;x<W;x+=40)c.fillRect(x,y,2,2);c.globalAlpha=1;
 // Artwork frame with square handles.
 const fx=70,fy=90,fw=800,fh=720;c.save();c.beginPath();c.rect(fx,fy,fw,fh);c.clip();c.fillStyle=cardTheme===2?'#2a3035':'#e3e7e7';c.fillRect(fx,fy,fw,fh);c.filter='saturate(.82) contrast(1.02)';
 if(!s.inset){const k=Math.min(fw,fh);c.filter='none';c.drawImage(art,fx+(fw-k)/2,fy+(fh-k)/2,k,k);}
 else{const k=Math.max(fw/art.width,fh/art.height);c.drawImage(art,fx+(fw-art.width*k)/2,fy+(fh-art.height*k)/2,art.width*k,art.height*k);c.filter='none';if(inset){const iw=fw*.56,ih=iw*260/400;c.drawImage(inset,fx+fw-iw-24,fy+24,iw,ih);c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(fx+fw-iw-24,fy+24,iw,ih);}}
 c.restore();c.strokeStyle=th.accent;c.lineWidth=1.5;c.strokeRect(fx,fy,fw,fh);c.fillStyle=th.accent;for(const [x,y] of [[fx,fy],[fx+fw,fy],[fx,fy+fh],[fx+fw,fy+fh]])c.fillRect(x-6,y-6,12,12);
 // Big mirrored serif letters, softly blurred.
 c.save();c.font='400 460px "Bodoni MT",Georgia,serif';c.fillStyle=th.ink;c.globalAlpha=.07;c.translate(1560,760);c.scale(-1,1);c.fillText('N',0,0);c.restore();
 c.save();c.filter='blur(5px)';c.font='400 260px "Bodoni MT",Georgia,serif';c.fillStyle=th.accent;c.globalAlpha=.18;c.translate(905,330);c.scale(1,-1);c.fillText('A',0,0);c.restore();
 c.fillStyle=th.ink;c.fillRect(940,110,300,56);c.fillStyle=th.bg;c.font='600 32px Bahnschrift,"Segoe UI",sans-serif';c.fillText(s.code,958,150);
 c.fillStyle=th.accent;c.fillRect(1240,110,14,56);c.font='14px Consolas,monospace';c.fillStyle=th.ink;c.globalAlpha=.7;c.fillText(`${s.kind}  ·  ${s.meta}`,940,200);c.globalAlpha=1;
 c.font='400 66px "Noto Serif SC","Source Han Serif SC",STSong,serif';c.fillText(s.title,940,290);
 c.font='italic 34px "Bodoni MT",Georgia,serif';c.globalAlpha=.75;c.fillText(s.en,942,340);c.globalAlpha=1;
 c.font='24px "Noto Serif SC",STSong,serif';let line='',y=410;for(const ch of s.desc){if(c.measureText(line+ch).width>580){c.fillText(line,940,y);line='';y+=42;}line+=ch;}c.fillText(line,940,y);
 c.strokeStyle=th.ink;c.globalAlpha=.3;c.beginPath();c.moveTo(940,740);c.lineTo(1530,740);c.stroke();c.beginPath();c.arc(1460,250,120,-1.2,1.9);c.stroke();c.globalAlpha=1;
 c.font='15px Consolas,monospace';c.fillStyle=th.ink;c.fillText("ARKNIGHTS · THE MASSES' TRAVELS · 众生行记",940,780);
 [...WORD].forEach((ch,i)=>{c.font='400 30px "Bodoni MT",Georgia,serif';c.fillStyle=letters.has(i)?th.accent:th.ink;c.globalAlpha=letters.has(i)?1:.22;c.fillText(ch,940+i*30,830);});c.globalAlpha=1;
 c.font='13px Consolas,monospace';c.fillText(`${th.name} · ${new Date().toISOString().slice(0,10)}`,1330,830);
 c.restore();
}
function cardModal(){openModal(`<span class="eyebrow">MEMORY CARD</span><h2 id="dialog-title">行迹卡片</h2><canvas id="card-canvas" width="1600" height="900" aria-label="卡片预览"></canvas><div class="detail-actions"><button class="line-button" data-action="card-theme">换一种版式</button><button class="line-button solid" data-action="card-download">下载 PNG ↓</button></div><p class="credit-note">卡片在本机生成，不会上传。活动图形版权归鹰角网络。</p>`,true);$('.dialog').classList.add('card');void drawCard();}
function downloadCard(){const cv=document.querySelector<HTMLCanvasElement>('#card-canvas');if(!cv)return;cv.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`${cardSubject().code.replace(/\s+/g,'-')}-card.png`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('卡片已生成');});}

// Deep links: #/records/mt-5, #/operators/graceb, #/atlas/3, #/sanctum/5 — shareable and restored on load.
function openHash(){
 const [m='',arg='']=location.hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent);
 if(m==='records'){const i=routeNodes.findIndex(n=>n.id===arg||n.code.toLowerCase()===arg.toLowerCase());if(i>=0)route.selected=i;setMode('records',false);}
 else if(m==='operators'){const i=operators.findIndex(o=>o.id===arg);if(i>=0)operatorIndex=i;setMode('operators',false);}
 else if(m==='atlas'){setMode('atlas',false);const i=Number(arg)-1;if(i>=0&&i<3)atlas.setPlate(i,false);}
 else if(m==='sanctum'){setMode('sanctum',false);if(world&&arg.includes('x')){world.explodeTarget=1;updateWorldControls();}const i=parseInt(arg,10)-1;if(i>=0&&i<GROUPS.length)setTimeout(()=>inspectPart(i),still?0:400);}
 else return false;
 return true;
}
function writeHash(){const h=mode==='records'?`#/records/${routeNodes[route.selected].id}`:mode==='operators'?`#/operators/${operators[operatorIndex].id}`:mode==='atlas'?`#/atlas/${atlas.plate+1}`:mode==='sanctum'?`#/sanctum${world&&world.focus>=0?`/${world.focus+1}`:''}`:'';if(location.hash!==h)history.replaceState(null,'',h||location.pathname+location.search);}
setInterval(writeHash,800);addEventListener('hashchange',()=>{openHash();});
$<HTMLInputElement>('#explode-range').addEventListener('input',e=>{if(!world)return;clearInterval(explodeTimer);world.explodeTarget=+(e.target as HTMLInputElement).value/100;updateWorldControls();});
$<HTMLInputElement>('#section-range').addEventListener('input',e=>{world?.setSection(+(e.target as HTMLInputElement).value/100);updateWorldControls();});
if(world){const cv=world.renderer.domElement;let down:{x:number;y:number}|null=null;let pickQueued:PointerEvent|null=null;
 const ndc=(e:PointerEvent)=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1)] as const;};
 cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 cv.addEventListener('pointerup',e=>{if(mode!=='sanctum'||!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>5)return;const i=world!.pick(...ndc(e));if(i>=0){stopTour();tickSound(900);inspectPart(i);}});
 cv.addEventListener('pointermove',e=>{if(mode!=='sanctum')return;if(!pickQueued)requestAnimationFrame(()=>{const ev=pickQueued!;pickQueued=null;const i=world!.pick(...ndc(ev));world!.setHover(i);const tip=$('#sanctum-hover');if(i>=0&&i!==world!.focus){tip.textContent=`0${i+1} · ${GROUPS[i].name}`;tip.style.transform=`translate(${ev.clientX+14}px,${ev.clientY+12}px)`;tip.classList.add('visible');}else tip.classList.remove('visible');document.querySelectorAll<HTMLElement>('[data-part]').forEach(b=>b.classList.toggle('hot',(+b.dataset.part!)===i));});pickQueued=e;});
 cv.addEventListener('pointerleave',()=>{world!.setHover(-1);$('#sanctum-hover').classList.remove('visible');});}
persist();updateBookmarks();updateWord();if(!openHash())setMode('home',false);
let worldSkip=false,last=performance.now(),pendingParallax:{x:number;y:number}|null=null;
function frame(now:number){const dt=Math.min((now-last)/1000,.1);last=now;if(!document.hidden){worldSkip=!worldSkip;if(!modalOpen&&mode!=='atlas'&&mode!=='records'&&(mode==='sanctum'||!worldSkip))world?.render(mode==='sanctum'?dt:dt*2,104,false);reticle.frame(dt);field.frame(settings.motion?dt:0);if(pendingParallax){stage.style.setProperty('--mx',pendingParallax.x.toFixed(3));stage.style.setProperty('--my',pendingParallax.y.toFixed(3));pendingParallax=null;}if(mode==='records')route.frame(dt);if(mode==='atlas')atlas.frame(dt);}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
