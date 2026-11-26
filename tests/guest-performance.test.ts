import {strict as assert} from 'node:assert'
import test from 'node:test'
import {Bench,type Config} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {GuestVoices} from '../src/counter/guest-performance.ts'
import {readData} from '../scripts/read.ts'

test('a service acknowledgment happens once at contact; leaving the counter suppresses stale lines',async()=>{
 const cfg:Config=await readData('counter.json'),t:Tuning=await readData('tuning.json')
 const g=new Bench(cfg,t),speaker=new GuestVoices(),played:string[]=[]
 const node={connect(){return this},disconnect(){}}
 const audio={
  currentTime:0,state:'running',destination:node,
  createBufferSource:()=>({...node,buffer:{id:''},playbackRate:{value:1},stop(){},start(){played.push(this.buffer.id)}}),
  createGain:()=>({...node,gain:{value:1}}),createStereoPanner:()=>({...node,pan:{value:0}})
 }
 const look=cfg.orders[0].look
 const clips=new Map(['greet','receive','leave'].map(id=>['vb_'+look+'_'+id,{id,duration:.7} as unknown as AudioBuffer]))
 const sample=()=>speaker.update(g,audio as unknown as AudioContext,clips,true)
 const o=cfg.orders[0]
 const guest=g.guests[0];g.kitchen=false;g.end=o.end;guest.state='waiting'
 sample();assert.deepEqual(played,['greet'])
 audio.currentTime=2;g.tick=8;guest.received={food:{food:'baked'},drink:null,guest:0,slot:0,start:8,end:16}
 sample();assert.equal(played.length,1)
 g.tick=16;sample();sample();assert.equal(played.at(-1),'receive');assert.equal(played.length,2)
 audio.currentTime=5;g.kitchen=true;guest.state='leaving';sample()
 g.kitchen=false;sample();assert.equal(played.length,2)
})
