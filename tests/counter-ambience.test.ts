import test from 'node:test'
import assert from 'node:assert/strict'
import {CafeAudio} from '../src/counter/audio.ts'
import {Bench} from '../src/counter/bench.ts'
import {readData} from '../scripts/read.ts'

test('two waiting guests create no repeating crowd or legacy guest audio',async()=>{
 const g=new Bench(await readData('counter.json'),await readData('tuning.json'))
 for(const guest of g.guests.slice(0,2))guest.state='waiting'
 const requests:string[]=[],started:string[]=[]
 const globals=globalThis as unknown as Record<string,unknown>
 const original=[globals.Audio,globals.AudioContext,globals.fetch]
 class Context{
  state='running';currentTime=0
  async decodeAudioData(bytes:ArrayBuffer){return new TextDecoder().decode(bytes)}
  createBufferSource(){
   return {buffer:'',connect(){},start(){started.push(this.buffer)}}
  }
  createGain(){return {connect(){},gain:{value:0,setTargetAtTime(){}}}}
 }
 try{
  globals.Audio=class{pause(){}};globals.AudioContext=Context
  globals.fetch=async(path:string)=>{requests.push(path);return new Response(path)}
  const mix=new CafeAudio();mix.unlock()
  await new Promise(resolve=>setImmediate(resolve));mix.machines(g)
  for(const guest of g.guests.slice(0,2))guest.left=1
  mix.machines(g);assert.equal(requests.some(p=>/chatter|customer-|voice-/u.test(p)),false)
  assert.deepEqual(started,[])
 }finally{
  for(const [i,key] of ['Audio','AudioContext','fetch'].entries()){
   if(original[i]===undefined)delete globals[key];else globals[key]=original[i]
  }
 }
})
