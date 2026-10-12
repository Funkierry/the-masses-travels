import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { operators, records, routeNodes, glyphs, WORD } from '../src/data.ts';
import { wrap, clamp } from '../src/util.ts';

test('route nodes are ordered along the map and point at real records',()=>{
 for(let i=1;i<routeNodes.length;i++)assert.ok(routeNodes[i].x>routeNodes[i-1].x,routeNodes[i].id);
 assert.equal(new Set(routeNodes.map(n=>n.id)).size,routeNodes.length);
 for(const n of routeNodes){if(n.record!==undefined)assert.ok(records[n.record]);if(n.operator!==undefined)assert.ok(operators[n.operator]);if(n.preview)assert.ok(existsSync(`public/assets/${n.preview}`),n.preview);}
 assert.deepEqual(routeNodes.filter(n=>n.record!==undefined).map(n=>n.record),[0,1,2,3,4,5]);
});
test('every letter of the hidden word is placed exactly once',()=>{
 const keys=Object.values(glyphs).flat().filter(g=>g.key!==undefined);
 assert.deepEqual(keys.map(g=>g.key).sort(),[...WORD].map((_,i)=>i));
 for(const g of keys)assert.equal(g.ch,WORD[g.key!]);
});
test('navigation helpers wrap and clamp in both directions',()=>{assert.equal(wrap(-1,3),2);assert.equal(wrap(3,3),0);assert.equal(wrap(-10,3),2);assert.equal(clamp(2),1);assert.equal(clamp(-1),0);});
// The site carries no character artwork and no film: no source file may point at either.
test('no character artwork, film stills or film code is referenced anywhere',()=>{
 const files=['src','src/site'].flatMap(d=>readdirSync(d).filter(f=>/\.(ts|css)$/.test(f)).map(f=>`${d}/${f}`));
 const banned=/(exusiai|confess-base|sankta-(base|elite)|lemuen-(base|elite)|graceb-(base|elite)|eye-(pink|red)|hair-gray|game\/profile|story-[a-z]+\.webp|reference-120s|pv-audio|assets\/pv\/|#film-|from '\.\/film|from '\.\/shots)/;
 for(const f of files){const s=readFileSync(f,'utf8');const m=s.match(banned);assert.equal(m,null,`${f} references ${m?.[0]}`);}
 for(const o of operators)assert.ok(!('image' in o)&&!('elite' in o),o.id);
});
