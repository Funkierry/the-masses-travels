// Static server for the production build, used only while recording.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root='D:/CodexProjects/the-masses-travels/dist';
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.json':'application/json','.woff2':'font/woff2'};
createServer(async(req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p==='/__enc.html'){res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end('<!doctype html><meta charset=utf-8><title>enc</title>');return;}if(p.endsWith('/'))p+='index.html';
 const f=path.join(root,path.normalize(p).replace(/^([/\\])+/,''));if(!f.startsWith(path.normalize(root))){res.writeHead(403).end();return;}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':types[path.extname(f)]??'application/octet-stream'});res.end(b);}catch{res.writeHead(404).end();}
}).listen(8642,'127.0.0.1',()=>console.log('serving on http://127.0.0.1:8642'));
