import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const name of ['启动.cmd','开发启动.cmd']){
 const data=await readFile(path.join(root,name));
 assert.ok(data.every(b=>b<128),`${name}: launcher must be ASCII`);
 assert.ok(!/(?<!\r)\n/.test(data.toString('ascii')),`${name}: every newline must be CRLF`);
}
console.log('PASS: Windows launcher encoding and line endings.');

const manifest=JSON.parse(await readFile(path.join(root,'ASSETS.json'),'utf8'));
for(const asset of manifest.assets){
 const bytes=await readFile(path.join(root,asset.path));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);
 assert.equal(bytes.length,asset.bytes,asset.path);
 if(!asset.path.endsWith('.json')){
  const built=await readFile(path.join(root,asset.path.replace('public/','dist/')));
  assert.deepEqual(built,bytes,`built asset must match source: ${asset.path}`);
 }
}
const game=JSON.parse(await readFile(path.join(root,'public/assets/game/game-assets.json'),'utf8'));
for(const asset of game.assets){
 const file=`game/${asset.name}${asset.name.startsWith('bgm')?'.mp3':'.webp'}`;const bytes=await readFile(path.join(root,'public/assets',file));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,file);
 assert.deepEqual(await readFile(path.join(root,'dist/assets',file)),bytes,`built asset must match source: ${file}`);
}
console.log(`PASS: ${manifest.assets.length} source and built asset checksums; ${game.assets.length} game-client assets.`);

const html=await readFile(path.join(root,'双击打开.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,2);
scripts.forEach((code,i)=>new Script(code,{filename:`offline-script-${i}.js`}));
assert.ok(!/<(?:script|link|img|video)[^>]+(?:src|href)=["']https?:/i.test(html));
assert.ok(!/url\(["']?\/assets\//.test(html),'CSS must embed every asset');
const payload=/const embedded=(\{.*?\});for\(const \[name,/.exec(scripts[0]);
assert.ok(payload,'offline bootstrap must contain a resource map');
const embedded=JSON.parse(payload[1]);
for(const [name,[mime,b64]] of Object.entries(embedded)){
 assert.match(mime,/^(image|audio|video)\//);
 assert.deepEqual(Buffer.from(b64,'base64'),await readFile(path.join(root,'public/assets',name)),name);
}
const src=await readFile(path.join(root,'src/main.ts'),'utf8');
for(const [,name] of [...src.matchAll(/\/assets\/([\w./-]+\.\w+)/g),...(await Promise.all(['route.ts','atlas.ts','covenant.ts','home.ts'].map(f=>readFile(path.join(root,'src',f),'utf8').catch(()=>'')))).join('').matchAll(/assetUrl\('([\w./-]+)'\)/g)])assert.ok(embedded[name],`missing offline asset ${name}`);
console.log(`PASS: offline JavaScript parses; ${Object.keys(embedded).length} media files match byte-for-byte.`);
console.log('NOTE: these are release integrity checks, not browser visual/interaction tests.');
