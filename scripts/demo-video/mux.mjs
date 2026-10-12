// A small MP4 writer for one H.264 video track and an optional AAC audio track.
// Samples stream into a payload file as they arrive; finish() writes ftyp + moov (fast-start, 64-bit chunk
// offsets) followed by the payload as mdat. One sample per chunk keeps the tables simple.
import { openSync, writeSync, closeSync, createReadStream, createWriteStream, statSync, unlinkSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const u8=(...b)=>Buffer.from(b);
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n>>>0);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;};
const str=s=>Buffer.from(s,'ascii');
const box=(type,...parts)=>{const body=Buffer.concat(parts.flat());return Buffer.concat([u32(body.length+8),str(type),body]);};
const full=(type,version,flags,...parts)=>box(type,u8(version),u8((flags>>16)&255,(flags>>8)&255,flags&255),...parts);
const matrix=Buffer.concat([u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000)]);

export class Mp4Writer{
 constructor(path){this.path=path;this.tmp=path+'.payload';this.fd=openSync(this.tmp,'w');this.pos=0;
  this.v={sizes:[],offsets:[],keys:[],dur:0,timescale:60000,frameDur:1000,desc:null,w:0,h:0};
  this.a={sizes:[],offsets:[],timescale:48000,frameDur:1024,asc:null,channels:2,bitrate:192000};}
 write(buf){const off=this.pos;writeSync(this.fd,buf);this.pos+=buf.length;return off;}
 video(buf,key){this.v.offsets.push(this.write(buf));this.v.sizes.push(buf.length);if(key)this.v.keys.push(this.v.sizes.length);}
 audio(buf){this.a.offsets.push(this.write(buf));this.a.sizes.push(buf.length);}
 stbl(entry,t,stss){
  const n=t.sizes.length;
  return box('stbl',entry,
   full('stts',0,0,u32(1),u32(n),u32(t.frameDur)),
   ...(stss?[full('stss',0,0,u32(stss.length),...stss.map(u32))]:[]),
   full('stsc',0,0,u32(1),u32(1),u32(1),u32(1)),
   full('stsz',0,0,u32(0),u32(n),...t.sizes.map(u32)),
   full('co64',0,0,u32(n),...t.offsets.map(o=>u64(o+this.base))));
 }
 moov(){
  const v=this.v,a=this.a,hasA=a.sizes.length>0&&a.asc;
  const vDur=v.sizes.length*v.frameDur,ms=Math.round(vDur/v.timescale*1000),aDur=a.sizes.length*a.frameDur;
  const avc1=box('avc1',Buffer.alloc(6),u16(1),Buffer.alloc(16),u16(v.w),u16(v.h),u32(0x480000),u32(0x480000),u32(0),u16(1),Buffer.alloc(32),u16(0x18),u16(0xffff),box('avcC',v.desc),
   box('colr',str('nclx'),u16(1),u16(1),u16(1),u8(0)));
  const vtrak=box('trak',full('tkhd',0,3,u32(0),u32(0),u32(1),u32(0),u32(ms),Buffer.alloc(8),u16(0),u16(0),u16(0),u16(0),matrix,u32(v.w<<16),u32(v.h<<16)),
   box('mdia',full('mdhd',0,0,u32(0),u32(0),u32(v.timescale),u32(vDur),u16(0x55c4),u16(0)),full('hdlr',0,0,u32(0),str('vide'),Buffer.alloc(12),str('Video\0')),
    box('minf',full('vmhd',0,1,Buffer.alloc(8)),box('dinf',full('dref',0,0,u32(1),full('url ',0,1))),this.stbl(full('stsd',0,0,u32(1),avc1),v,v.keys))));
  let atrak=Buffer.alloc(0);
  if(hasA){
   const desc=(tag,body)=>Buffer.concat([u8(tag,0x80,0x80,0x80,body.length),body]);
   const dsi=desc(5,a.asc),dcd=desc(4,Buffer.concat([u8(0x40,0x15),u8(0,0,0),u32(a.bitrate),u32(a.bitrate),dsi])),es=desc(3,Buffer.concat([u16(2),u8(0),dcd,desc(6,u8(2))]));
   const mp4a=box('mp4a',Buffer.alloc(6),u16(1),Buffer.alloc(8),u16(a.channels),u16(16),u16(0),u16(0),u32(a.timescale<<16),full('esds',0,0,es));
   atrak=box('trak',full('tkhd',0,3,u32(0),u32(0),u32(2),u32(0),u32(Math.round(aDur/a.timescale*1000)),Buffer.alloc(8),u16(0),u16(1),u16(0x0100),u16(0),matrix,u32(0),u32(0)),
    box('mdia',full('mdhd',0,0,u32(0),u32(0),u32(a.timescale),u32(aDur),u16(0x55c4),u16(0)),full('hdlr',0,0,u32(0),str('soun'),Buffer.alloc(12),str('Sound\0')),
     box('minf',full('smhd',0,0,u16(0),u16(0)),box('dinf',full('dref',0,0,u32(1),full('url ',0,1))),this.stbl(full('stsd',0,0,u32(1),mp4a),a))));
  }
  return box('moov',full('mvhd',0,0,u32(0),u32(0),u32(1000),u32(ms),u32(0x10000),u16(0x100),Buffer.alloc(10),matrix,Buffer.alloc(24),u32(hasA?3:2)),vtrak,atrak);
 }
 async finish(){
  closeSync(this.fd);
  const ftyp=box('ftyp',str('isom'),u32(512),str('isom'),str('iso2'),str('avc1'),str('mp41'));
  // moov's size does not depend on the offsets' values, so measure it once, then build it for real.
  this.base=0;const size=this.moov().length;const mdatHdr=Buffer.concat([u32(1),str('mdat'),u64(this.pos+16)]);
  this.base=ftyp.length+size+mdatHdr.length;const moov=this.moov();
  const out=createWriteStream(this.path);out.write(Buffer.concat([ftyp,moov,mdatHdr]));
  await pipeline(createReadStream(this.tmp),out);unlinkSync(this.tmp);return statSync(this.path).size;
 }
}
