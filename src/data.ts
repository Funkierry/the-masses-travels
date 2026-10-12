export type Operator = { id: string; name: string; english: string; lines: string[]; role: string; branch: string; stars: number; color: string; note: string; quote: string; tags: string[]; roleEn: string };
export const operators: Operator[] = [
 { id:'confess', name:'CONFESS-47', english:'Confess-47', lines:['Confess','47'], role:'先锋', branch:'尖兵', stars:1, color:'#93816b', roleEn:'VANGUARD / PIONEER', note:'拉特兰自律告解车。信仰、机械与日常生活，在这座移动的告解室中相遇。', quote:'拉特兰自律告解车047号，为您服务。', tags:['拉特兰','机械','告解'] },
 { id:'graceb', name:'聆音', english:'Gracebearer', lines:['Grace','bearer'], role:'近卫', branch:'本源近卫', stars:5, color:'#cf5a6a', roleEn:'GUARD / PRIMAL GUARD', note:'红与黑的修女服、长杖与帽檐下的目光。她追问：信仰是否必须完美无缺。', quote:'难道只有完美无缺的事物才配成为信仰吗？', tags:['拉特兰','近卫','追问'] },
 { id:'sankta', name:'信仰搅拌机', english:'Sankta Miksaparato', lines:['Sankta','Miksaparato'], role:'重装', branch:'哨戒铁卫', stars:6, color:'#6862b0', roleEn:'DEFENDER / SENTRY PROTECTOR', note:'装甲、铳械、盾与光环构成的几何秩序。让视线穿过分层的画面，重新观察信仰的形状。', quote:'我不会倒下。', tags:['拉特兰','重装','守护'] },
 { id:'lemuen', name:'蕾缪安', english:'Lemuen', lines:['Le','muen'], role:'狙击', branch:'神射手', stars:6, color:'#c86274', roleEn:'SNIPER / DEADEYE', note:'粉色、白色与铳械的黑，落在圆环的同一侧。一段关于信任、承诺与重新启程的记录。', quote:'交付信任和收获信任一样，都是会令人安心的事情，对吧？', tags:['拉特兰','狙击','信任'] }
];
export const records = [
 {id:'wings',title:'羽翼与秩序',en:'WINGS & ORDER',description:'黑色背景中，白色羽翼被放入矩形视窗。圆弧、标线与空间切片构成开篇的视觉节奏。'},
 {id:'altar',title:'暗处的祈祷',en:'THE PRAYER',description:'深色建筑、红色微光与向上的阶梯。在垂直的空间中，寻找通往光的方向。'},
 {id:'street',title:'圣城之下',en:'BENEATH THE CITY',description:'仰望狭长的街道。城市被强烈的纵向透视展开，人的尺度在建筑之间显现。'},
 {id:'city',title:'众生的圣堂',en:'THE SANCTUM',description:'浅色尖塔、层叠拱线与明亮的天空。圆环从平面图形成为可以穿行的空间。'},
 {id:'passage',title:'无尽长廊',en:'AN ENDLESS PASSAGE',description:'蓝色横带沿着白色柱廊延伸。重复的结构与倒影，把画面延展至视线的尽头。'},
 {id:'water',title:'水中的记忆',en:'MEMORY IN WATER',description:'冷蓝的水面收藏着建筑和器物的倒影。碎片散开，再回到共同的中心。'}
];
/* Route map, laid out in map units (1u = 1% of the screen height). Codes follow the activity map's OPERATION labels. */
export type RouteNode = { id:string; code:string; kind:'operation'|'story'|'tutorial'|'special'; x:number; y:number; record?:number; operator?:number; motif?:string; title:string; en:string; description:string; preview?:string; label?:string; link?:string; tags?:string[]; meta?:string };
const story=(i:number,x:number,y:number,en:string):RouteNode=>({id:`st-${i+1}`,code:`MT-ST-${i+1}`,kind:'story',x,y,operator:i,title:operators[i].name,en,description:operators[i].note});
const op=(i:number,r:number,x:number,preview:string):RouteNode=>({id:`mt-${i}`,code:`MT-${i}`,kind:'operation',x,y:60,record:r,motif:records[r].id,title:records[r].title,en:records[r].en,description:records[r].description,preview:`game/stage-${preview}.webp`});
export const routeNodes:RouteNode[] = [
 op(1,0,66,'01'),
 {id:'tr-1',code:'MT-TR-1',kind:'tutorial',x:91,y:82,motif:'prologue',title:'万物之始',en:'PROLOGUE',description:'几何标志被一笔一笔画出，字母逐个落下。旅程从寂静开始。',preview:'game/stage-tr01.webp'},
 op(2,1,116,'03'),op(3,2,166,'05'),op(4,3,216,'06'),
 story(0,246,38,'PERSONNEL / VANGUARD'),story(1,284,24,'PERSONNEL / GUARD'),story(2,324,24,'PERSONNEL / DEFENDER'),story(3,362,38,'PERSONNEL / SNIPER'),
 op(5,4,394,'08'),op(6,5,444,'10'),
 {id:'ex-1',code:'MT-EX-1',kind:'special',x:500,y:60,motif:'sanctum',title:'向光而行',en:'INTO THE SANCTUM',description:'白色柱廊、蓝色水面与六组可拆解的结构。走进圣堂，亲手把它拆开再重组。',preview:'game/stage-ex01.webp'}
];
export const ROUTE_WIDTH=560;
/* Eight blue letters hidden across the screens; collecting all of them spells the city's name. */
export const WORD='LATERANO';
export type Glyph={ch:string;x:number;y:number;size:number;depth:number;flip?:'x'|'y'|'xy';key?:number};
export const glyphs:Record<string,Glyph[]>={
 home:[{ch:'N',x:38.5,y:30,size:118,depth:.6,flip:'x'},{ch:'A',x:31,y:70,size:62,depth:1.2,flip:'y'},{ch:'T',x:1.6,y:72,size:70,depth:.8},{ch:'C',x:89,y:60,size:118,depth:.5},{ch:'L',x:47,y:15,size:46,depth:1.4,key:0},{ch:'A',x:46,y:77,size:38,depth:1.1,key:1}],
 operators:[{ch:'Ι',x:2,y:66,size:120,depth:.6},{ch:'A',x:40,y:8,size:64,depth:1.1,flip:'y'},{ch:'T',x:56,y:78,size:48,depth:1.3,key:2},{ch:'E',x:38,y:58,size:42,depth:1.4,key:3},{ch:'S',x:44,y:28,size:70,depth:.7,flip:'x'}],
 records:[{ch:'R',x:58,y:79,size:44,depth:1.2,key:4},{ch:'K',x:12,y:70,size:150,depth:.5}],
 atlas:[{ch:'A',x:94,y:70,size:40,depth:1.3,key:5},{ch:'N',x:55,y:15,size:44,depth:1.1,key:6}],
 sanctum:[{ch:'O',x:50,y:8,size:44,depth:1.2,key:7},{ch:'V',x:86,y:52,size:120,depth:.6,flip:'y'}]
};
