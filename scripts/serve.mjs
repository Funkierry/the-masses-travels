import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.m4a':'audio/mp4','.svg':'image/svg+xml','.json':'application/json'};
const appId='the-masses-travels-local-v1';
const host='127.0.0.1';
let port=Number(process.env.PORT)||5173;
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/__health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:appId}));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404);res.end('Not found');return;}
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!m){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   start=m[1]?Number(m[1]):Math.max(0,info.size-Number(m[2]));end=m[1]&&m[2]?Math.min(Number(m[2]),end):end;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);
  if(req.method==='HEAD'){res.end();return;}createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('File not found. Run npm run build first.');}
});
server.on('error',err=>{if(err.code==='EADDRINUSE'&&port<5200){port++;server.listen(port,host);}else{console.error(err.message);process.exitCode=1;}});
server.on('listening',()=>{
 const url=`http://${host}:${port}/`;console.log(`\n  THE MASSES' TRAVELS / 众生行记\n\n  ${url}\n\n  Keep this window open. Press Ctrl+C to stop.\n`);
 if(process.argv.includes('--open')){
  if(process.platform==='win32')spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true}).unref();
  else spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'}).unref();
 }
});
server.listen(port,host);
process.on('SIGINT',()=>server.close(()=>process.exit()));
