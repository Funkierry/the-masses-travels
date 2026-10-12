import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ring, rule, brush, arcPts, sweepPts } from '../src/sketch.ts';
import { rng } from '../src/graphics.ts';

const nums=(d:string)=>(d.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
test('a hand-drawn ring overshoots its start and never sits on a perfect circle',()=>{
 const pts=arcPts(0,0,100,0,Math.PI*2.1,rng(1),2);const radii=pts.map(([x,y])=>Math.hypot(x,y));
 assert.ok(Math.max(...radii)-Math.min(...radii)>.5,'radius breathes');assert.ok(Math.max(...radii)<103&&Math.min(...radii)>97,'but stays close to the circle');
 const d=ring(0,0,100,rng(2));const v=nums(d);const [x0,y0]=v,[x1,y1]=v.slice(-2);assert.ok(Math.hypot(x1-x0,y1-y0)>2,'the stroke runs past where it started');
});
test('a rule bows and runs past both marks',()=>{
 const v=nums(rule(0,0,100,0,rng(3),10,3));assert.ok(v[0]<0&&v[v.length-2]>100,'ends overshoot');assert.ok(Math.abs(v[3])>0,'the middle bows');
});
test('a brush stroke is a closed outline that tapers to its ends',()=>{
 const d=brush(sweepPts(0,0,200,0,10),20);assert.ok(d.startsWith('M')&&d.endsWith('Z'));
 const v=nums(d);const [x0,y0]=v;const mid=Math.floor(v.length/4)*2;assert.ok(Math.abs(y0)<1.5,'pointed start');assert.ok(Math.abs(v[mid+1])>3,'wide middle');
});
test('the same seed draws the same line, so marks hold still between frames and renders',()=>{assert.equal(ring(5,5,40,rng(9)),ring(5,5,40,rng(9)));assert.notEqual(ring(5,5,40,rng(9)),ring(5,5,40,rng(10)));});
