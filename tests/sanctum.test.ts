import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSanctum, materials, GROUPS, NAVE } from '../src/sanctum.ts';

// Build the whole sanctum without a renderer and check every structure group.
const groups=GROUPS.map(()=>new THREE.Group());const root=new THREE.Group();groups.forEach(g=>root.add(g));
const parts=buildSanctum(groups,materials());root.updateMatrixWorld(true);
const boxOf=(i:number)=>new THREE.Box3().setFromObject(groups[i]);

test('every structure group is populated with valid geometry',()=>{
 GROUPS.forEach((g,i)=>{
  const ps=parts.filter(p=>p.group===i);assert.ok(ps.length>0,`${g.id} has parts`);
  for(const p of ps){const geo=p.mesh.geometry;assert.ok(geo.attributes.position.count>0,`${g.id} empty mesh`);geo.computeBoundingBox();const b=geo.boundingBox!;
   for(const v of [b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z])assert.ok(Number.isFinite(v),`${g.id} non-finite bounds`);}
 });
});
test('structures that should be symmetric are symmetric about the nave axis',()=>{
 GROUPS.forEach((g,i)=>{if(!g.sym)return;const b=boxOf(i);const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());
  assert.ok(Math.abs(c.x)<Math.max(.15,s.x*.02),`${g.id} centre x=${c.x.toFixed(2)} for width ${s.x.toFixed(1)}`);});
});
test('support matches the design: grounded, carried, or floating',()=>{
 GROUPS.forEach((g,i)=>{const b=boxOf(i);
  if(g.support==='ground')assert.ok(b.min.y<.45,`${g.id} should reach the floor (min y ${b.min.y.toFixed(2)})`);
  if(g.support==='float')assert.ok(b.min.y>.45,`${g.id} should float (min y ${b.min.y.toFixed(2)})`);
  if(g.support==='piers'){const piers=boxOf(GROUPS.findIndex(x=>x.id==='piers'));assert.ok(Math.abs(b.min.y-piers.max.y)<1,`${g.id} springs from the pier tops (${b.min.y.toFixed(2)} vs ${piers.max.y.toFixed(2)})`);}
  if(g.support==='arcade')assert.ok(b.min.y>10,`${g.id} sits above the arcade springing`);
 });
});
test('every piece has somewhere to go when the sanctum is exploded',()=>{
 for(const p of parts)assert.ok(p.explode.length()>0,`${GROUPS[p.group].id} piece without explode vector`);
 for(const p of parts)assert.ok(p.delay>=0&&p.delay<=1,`${GROUPS[p.group].id} delay out of range`);
});
test('the nave stays inside the plinth and the spire rises above everything',()=>{
 const base=boxOf(0),veil=boxOf(GROUPS.findIndex(g=>g.id==='veil'));
 assert.ok(base.max.z>=NAVE.start&&base.min.z<=NAVE.end,'plinth covers the nave');
 for(let i=1;i<GROUPS.length;i++)if(GROUPS[i].id!=='veil'&&GROUPS[i].id!=='ruins')assert.ok(boxOf(i).max.y<veil.max.y,`${GROUPS[i].id} lower than the spire`);
});
