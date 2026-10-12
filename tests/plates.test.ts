import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personnelPlate, homePlate, recordPlate, roleGlyph } from '../src/plates.ts';
import { operators, routeNodes } from '../src/data.ts';

// A tiny well-formedness check: every element closes, in order, and attributes are quoted.
function wellFormed(svg:string){
 const stack:string[]=[];const re=/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;let m;let last=0;
 while((m=re.exec(svg))){const between=svg.slice(last,m.index);assert.ok(!/[<>]/.test(between),`stray bracket near ${between.slice(0,40)}`);last=re.lastIndex;
  const [,close,name,,self]=m;if(self)continue;if(close){assert.equal(stack.pop(),name,`</${name}> closes the wrong element`);}else stack.push(name);}
 assert.ok(!/[<>]/.test(svg.slice(last)),'trailing markup');assert.equal(stack.length,0,`unclosed: ${stack.join(',')}`);
}
test('every personnel plate is well-formed in both layouts and has unique ids',()=>{
 operators.forEach((o,i)=>{for(const alt of [false,true])for(const format of ['html','svg'] as const){const svg=personnelPlate(o,i,undefined,alt,format);wellFormed(svg);
  const ids=[...svg.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const ref of svg.matchAll(/(?:url\(#|href="#)([^)"]+)/g))assert.ok(ids.includes(ref[1]),`${o.id} dangling #${ref[1]}`);
  assert.ok(!/<image|\.webp|\.png/.test(svg),'plates draw, they do not embed pictures');}});
 const a=personnelPlate(operators[0],0),b=personnelPlate(operators[0],0);assert.notEqual(a.match(/ id="([^"]+)"/)![1],b.match(/ id="([^"]+)"/)![1],'two copies on one page need distinct ids');
});
test('home and record plates are well-formed; every class has a glyph',()=>{
 wellFormed(homePlate());wellFormed(homePlate(undefined,'26','X · ','svg'));
 routeNodes.forEach((n,i)=>{if(n.motif)wellFormed(recordPlate(n.motif,n.code,i));});
 for(const o of operators)assert.ok(roleGlyph(o.role).length>40,o.role);
 assert.equal(new Set(operators.map(o=>roleGlyph(o.role))).size,new Set(operators.map(o=>o.role)).size,'distinct classes draw distinct glyphs');
});
test('plates stack sheets on the page and flatten to one image for the card',()=>{
 const html=personnelPlate(operators[1],1);assert.ok((html.match(/class="pl-sheet/g)??[]).length>=8,'layered sheets');assert.match(html,/--blur:/);
 const svg=personnelPlate(operators[1],1,undefined,false,'svg');assert.ok(svg.startsWith('<svg'));assert.match(svg,/feGaussianBlur/);assert.ok(!svg.includes('pl-construct'),'hover overlay stays out of the card');
 // Drawn by hand: no perfect circles on the main rings, and brush strokes are closed filled outlines.
 assert.ok(/C[\d.-]+ [\d.-]+ [\d.-]+/.test(svg));
});
test('plates use the concrete theme when rendered as images',()=>{
 const T={ink:'#111111',paper:'#eeeeee',accent:'#ff0000',cobalt:'#0000ff',muted:'#777777'};
 const svg=personnelPlate(operators[2],2,T,false,'svg');assert.ok(!svg.includes('var(--'),'no CSS variables in image plates');assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
});
