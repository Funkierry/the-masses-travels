// Runs in a plain page next to the site: hardware H.264 through WebCodecs, AAC for the soundtrack.
// Encoded chunks are handed back to Node as base64 and written into the MP4 there.
(()=>{
 const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
 const E=window.E={out:[],desc:null,err:null,n:0};
 E.init=async(w,h,bitrate)=>{
  const cfg={codec:w>1920?'avc1.640034':'avc1.64002a',width:w,height:h,bitrate,framerate:60,hardwareAcceleration:'no-preference',bitrateMode:'variable',latencyMode:'quality',avc:{format:'avc'}};
  const sup=await VideoEncoder.isConfigSupported(cfg);if(!sup.supported)return 'unsupported';
  E.enc=new VideoEncoder({output:(c,meta)=>{if(meta?.decoderConfig?.description&&!E.desc)E.desc=b64(new Uint8Array(meta.decoderConfig.description));const u=new Uint8Array(c.byteLength);c.copyTo(u);E.out.push([c.type==='key'?1:0,b64(u)]);},error:e=>{E.err=String(e);}});
  E.enc.configure(cfg);return 'ok '+cfg.codec;
 };
 E.push=async(jpeg)=>{
  if(E.err)throw new Error(E.err);
  const bin=Uint8Array.from(atob(jpeg),c=>c.charCodeAt(0));const bmp=await createImageBitmap(new Blob([bin],{type:'image/jpeg'}));
  const f=new VideoFrame(bmp,{timestamp:Math.round(E.n*1e6/60),duration:Math.round(1e6/60)});E.enc.encode(f,{keyFrame:E.n%120===0});f.close();bmp.close();E.n++;
  // Back-pressure on the encoder's own dequeue event: timers are throttled in a background tab.
  while(E.enc.encodeQueueSize>3)await new Promise(r=>E.enc.addEventListener('dequeue',r,{once:true}));
  return E.out.splice(0);
 };
 E.flush=async()=>{await E.enc.flush();return {chunks:E.out.splice(0),desc:E.desc};};
 // The activity theme, looped with a crossfade to the video's length, faded in and out, as AAC.
 E.audio=async(url,seconds)=>{
  const sup=await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000});if(!sup.supported)return {unsupported:true};
  const ctx=new OfflineAudioContext(2,48000,48000);const src=await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  const N=Math.round(seconds*48000),L=src.length,X=48000*3,ch=[new Float32Array(N),new Float32Array(N)];
  for(let c=0;c<2;c++){const s=src.getChannelData(Math.min(c,src.numberOfChannels-1));const d=ch[c];
   for(let i=0;i<N;i++){let v;const loop=L-X;const k=i%loop,first=i<loop;
    v=s[k];if(!first&&k<X){const t=k/X;v=s[k]*t+s[loop+k]*(1-t);}d[i]=v;}
   for(let i=0;i<N;i++){const fin=Math.min(1,i/24000),fout=Math.min(1,(N-i)/(48000*3.5));d[i]*=.82*fin*fout;}}
  const chunks=[];let asc=null;
  const enc=new AudioEncoder({output:(c,meta)=>{if(meta?.decoderConfig?.description&&!asc)asc=b64(new Uint8Array(meta.decoderConfig.description));const u=new Uint8Array(c.byteLength);c.copyTo(u);chunks.push(b64(u));},error:e=>{throw e;}});
  enc.configure({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000});
  const F=1024*8;for(let i=0;i<N;i+=F){const n=Math.min(F,N-i),buf=new Float32Array(n*2);buf.set(ch[0].subarray(i,i+n),0);buf.set(ch[1].subarray(i,i+n),n);
   const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(i/48*1000),data:buf});enc.encode(ad);ad.close();}
  await enc.flush();return {asc,chunks};
 };
})();
