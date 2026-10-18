// Original deterministic CueDone final cues; no external recordings.
import { writeFileSync } from "node:fs";
const SAMPLE_RATE = 44100;
let seed = 1234567;
const noise = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)*2-1;
const sin = (f,t) => Math.sin(2*Math.PI*f*t);
function tone(t,start,duration,f,decay=5) {
 const u=t-start; if(u<0||u>duration)return 0;
 return sin(f,u)*Math.min(1,u/.004)*Math.exp(-decay*u/duration)*Math.min(1,(duration-u)/.025);
}
const cues = {
 "party-horn": [1.25,t => (tone(t,0,1.1,392,1)+.5*tone(t,0,1.1,494,1)+.35*tone(t,0,1.1,784,1))*(.8+.2*sin(7,t))],
 "whip-crack": [.5,t => {const e=Math.exp(-Math.pow((t-.14)/.018,2));return noise()*e+ .15*sin(1800-1400*t,t)*Math.exp(-t*18);}],
 "cash-register": [1.1,t => .35*noise()*Math.exp(-t*32)+tone(t,.15,.85,1318)+.5*tone(t,.15,.85,2636)],
 "chiptune-blip": [.55,t => [523,659,784,1047].reduce((v,f,i)=>v+tone(t,i*.09,.18,f),0)],
 "rimshot": [1.1,t => {let v=0;for(const start of [0,.18]){const u=t-start;if(u>=0)v+=(noise()*.65+sin(180,u)*.35)*Math.exp(-u*42);}if(t>.38){const u=t-.38;v+=noise()*Math.exp(-u*7)*(.6+.4*sin(701,u));}return v;}],
 "jackpot-coins": [1.9,t => {let v=0;for(let i=0;i<23;i++){const start=i*.055;v+=tone(t,start,.5,1700+(i*317)%1800,9)*.4+tone(t,start,.35,2600+(i*137)%1300,8)*.2;}return v;}],
 "gong": [2.5,t => [110,163,227,309,467,617].reduce((v,f,i)=>v+tone(t,0,2.5,f,2+i*.6)/(1+i*.5),0)+noise()*.08*Math.exp(-t*12)],
};
function wavBuffer(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 0x7fff), 44 + index * 2);
  });
  return buffer;
}


for (const [name,[duration,sample]] of Object.entries(cues)) {
 const samples=Array.from({length:Math.floor(duration*SAMPLE_RATE)},(_,i)=>sample(i/SAMPLE_RATE));
 const peak=samples.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
 writeFileSync(new URL(`../assets/audio/final-${name}.wav`,import.meta.url),wavBuffer(samples.map(v=>v/peak*.65)));
}
