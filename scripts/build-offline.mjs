import { build } from 'vite';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Two portable pages: the festival edition (all media) and the personal-site sample (images only).
const entries=[
 {entry:'src/main.ts',out:'双击打开.html',title:'众生行记 · 离线交互映像',media:()=>true},
 {entry:'src/site/main.ts',out:'个人网站样例.html',title:'林叶 · 个人网站样例',media:name=>name.endsWith('.webp')}
];
const dir=path.join(root,'public/assets');
const mime={'.webp':'image/webp','.m4a':'audio/mp4','.mp4':'video/mp4','.mp3':'audio/mpeg'};
const files=(await readdir(dir,{recursive:true})).map(n=>n.split(path.sep).join('/'));
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
const favicon=(await readFile(path.join(root,'public/favicon.svg'))).toString('base64');
for(const {entry,out,title,media} of entries){
 const result=await build({root,configFile:false,logLevel:'warn',resolve:{preserveSymlinks:true},build:{write:false,target:'es2022',minify:true,cssCodeSplit:false,lib:{entry:path.join(root,entry),formats:['iife'],name:'MassesTravels'},rollupOptions:{output:{inlineDynamicImports:true}}}});
 const output=(Array.isArray(result)?result.flatMap(r=>r.output):result.output);
 const js=output.filter(o=>o.type==='chunk').map(o=>o.code).join('\n');
 let css=output.filter(o=>o.type==='asset'&&o.fileName.endsWith('.css')).map(o=>String(o.source)).join('\n');
 const assets={};
 for(const name of files){const type=mime[path.extname(name)];if(!type||!media(name))continue;assets[name]=[type,(await readFile(path.join(dir,name))).toString('base64')];}
 css=css.replace(/url\((['"]?)\/assets\/([^)'"\s]+)\1\)/g,(_m,_q,name)=>`url("data:${assets[name][0]};base64,${assets[name][1]}")`);
 const bootstrap=`window.__MASSES_ASSETS__={};const embedded=${JSON.stringify(assets)};for(const [name,[type,data]] of Object.entries(embedded)){const raw=atob(data);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);window.__MASSES_ASSETS__[name]=URL.createObjectURL(new Blob([bytes],{type}));} `;
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title><link rel="icon" href="data:image/svg+xml;base64,${favicon}"><style>${css}</style></head><body><div id="app"></div><noscript>请启用浏览器 JavaScript。</noscript><script>${safe(bootstrap)}</script><script>${safe(js)}</script></body></html>`;
 await writeFile(path.join(root,out),html,'utf8');
 console.log(`Portable HTML built: ${out} ${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MiB; ${Object.keys(assets).length} embedded media files.`);
}
