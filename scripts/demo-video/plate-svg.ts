// Writes one personnel plate as a standalone SVG (concrete colours), for covers.
// usage: node --experimental-strip-types plate-svg.ts <operator id> <out.svg> [alt] [omit,classes]
import { writeFileSync } from 'node:fs';
import { personnelPlate } from '../../src/plates.ts';
import { operators } from '../../src/data.ts';
const [id,out,alt,omit='']=process.argv.slice(2);const i=operators.findIndex(o=>o.id===id);
const T={ink:'#22282b',paper:'#eff1ef',accent:operators[i].color,cobalt:'#3a5bc2',muted:'#6c7679'};
writeFileSync(out,personnelPlate(operators[i],i,T,alt==='alt','svg',omit.split(',').filter(Boolean)));console.log('wrote',out);
