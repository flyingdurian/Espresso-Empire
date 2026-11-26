import {GuestVoices} from './guest-performance.ts'
import cast from '../../public/data/guest-performance.json' with {type:'json'}
import {CafeScore} from './score.ts'
import type {Bench} from './bench.ts'

const files=[
 'ceramic','drawer','wash','bin','finish','beans','shot-end','milk-ready','hot-water','ice-scrape',
 'ice-clink','handle-release','puck-knock','puck-drop','dose-fill','tamp','group-lock','press-latch',
 'oven-ready','oven-door','tea-ready','pour-liquid','compactor','doorbell',
 'rack-load','board-set','spread','press-ready','heat-warning'
] as const
type Cue=typeof files[number]
const motors={'grind-loop':'grind','pump-loop':'extraction','froth-loop':'steam','press-loop':'press','oven-loop':'bake','blend-loop':'blend','tea-loop':'brew'} as const
type Motor=keyof typeof motors

export class CafeAudio{
 private ctx?:AudioContext
 private buffers=new Map<string,AudioBuffer>()
 private pending=new Map<string,{volume:number;at:number}[]>()
 private loops=new Map<Motor,{source:AudioBufferSourceNode;gain:GainNode}>()
 private lastState=new Map<Motor,boolean>()
 readonly score=new CafeScore()
 private enabled=true
 private observed?:Bench
 private guestVoices=new GuestVoices()
 private voiceClips=new Map<string,AudioBuffer>()
 private steaming={silky:false,airy:false}
 private spentGroups=new Set<number>()
 private hotStates=new Map<string,string>()
 private strike={start:-1,first:false,second:false,drop:false,tamp:false,lock:false}
 private heardPours=new WeakSet<object>()
 private heardSnaps=new WeakSet<object>()

 unlock(){
  this.score.unlock()
  if(!this.ctx){
   try{this.ctx=new AudioContext()}catch{return}
   const ctx=this.ctx
   const load=async(id:string)=>{
    const response=await fetch('/audio/'+id+'.m4a')
    if(!response.ok)throw new Error('Missing café sound: '+id)
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer)
    const waiting=this.pending.get(id)??[];this.pending.delete(id)
    for(const cue of waiting)if(ctx.currentTime-cue.at<1.25)this.cue(id as Cue,cue.volume)
    return buffer
   }
   for(const id of cast.recordings as string[]){
    void fetch('/audio/guests/'+id+'.wav').then(r=>{
     if(!r.ok)throw Error('Guest recording unavailable')
     return r.arrayBuffer()
    }).then(bytes=>ctx.decodeAudioData(bytes)).then(clip=>this.voiceClips.set(id,clip)).catch(()=>{})
   }
   for(const id of [...files,...Object.keys(motors)])void load(id).catch(()=>{})
  }
  if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{})
 }

 state(enabled:boolean){
  if(enabled===this.enabled)return
  this.enabled=enabled
  if(!enabled){
   this.guestVoices.silence()
   for(const name of this.loops.keys())this.stop(name)
  }
 }

 machines(g:Bench){
  const ctx=this.ctx;if(!ctx)return
  if(this.observed!==g){
   this.spentGroups.clear();this.observed=g;this.hotStates.clear();this.lastState.clear();this.strike={start:-1,first:false,second:false,drop:false,tamp:false,lock:false}
   this.heardPours=new WeakSet();this.heardSnaps=new WeakSet();this.steaming={silky:false,airy:false}
  }
  for(const [key,station] of Object.entries(motors)){
   const name=key as Motor,active=station==='extraction'?g.groups.some(h=>h.extraction||h.flush):station==='blend'?!!(g.blend||g.citrus):!!g[station],loop=this.loops.get(name)
   if(this.lastState.get(name)&&!active){
    if(name==='pump-loop')this.cue('shot-end')
    if(name==='tea-loop')this.cue('tea-ready')
   }
   this.lastState.set(name,active)
   if(loop&&(!active||!this.enabled)){this.stop(name);continue}
   const buffer=this.buffers.get(name)
   if(active&&this.enabled&&!loop&&buffer){
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true
    source.connect(gain);gain.connect(ctx.destination)
    gain.gain.value=0;gain.gain.setTargetAtTime(name==='froth-loop'?.26:.30,ctx.currentTime,.055);source.start()
    this.loops.set(name,{source,gain})
   }
  }
  let milkReady=false
  for(const texture of ['silky','airy'] as const){
   if(this.steaming[texture]&&!g.steamJobs[texture])milkReady=true
   this.steaming[texture]=!!g.steamJobs[texture]
  }
  if(milkReady)this.cue('milk-ready')
  for(const [index,group] of g.groups.entries()){
   const spent=!group.pulls&&!group.extraction
   if(spent&&!this.spentGroups.has(index)){this.spentGroups.add(index);this.cue('handle-release',.46)}
   if(!spent)this.spentGroups.delete(index)
  }
  const alerts=new Set<Cue>()
  for(const station of ['oven','press'] as const){
   const slots=station==='oven'?g.ovenSlots:g.pressSlots
   slots.forEach((slot,i)=>{
    const key=station+i,state=g.hotUrgent(slot)?'urgent':slot.state
    if(this.hotStates.get(key)!==state){
     if(state==='ready')alerts.add(station==='oven'?'oven-ready':'press-ready')
     if(state==='urgent')alerts.add('heat-warning')
     this.hotStates.set(key,state)
    }
   })
  }
  for(const cue of alerts)this.cue(cue,.57)
  if(g.snap&&!this.heardSnaps.has(g.snap)){this.heardSnaps.add(g.snap);this.lidSnap()}
  this.observeWorkflow(g)
  if(this.voiceClips.size)this.guestVoices.update(g,ctx,this.voiceClips,this.enabled)

 }

 private observeWorkflow(g:Bench){
  const cycle=g.basketCycle
  if(cycle&&this.strike.start!==cycle.start){
   this.strike={start:cycle.start,first:false,second:false,drop:false,tamp:false,lock:false}
  }
  if(cycle){
   const p=(g.tick-cycle.start)/(cycle.end-cycle.start)
   if(g.basket==='knocking'){
    if(p>=.395&&!this.strike.first){this.cue('puck-knock');this.strike.first=true}
    if(p>=.55&&!this.strike.second){this.cue('puck-knock',.65);this.strike.second=true}
    if(p>=.60&&!this.strike.drop){this.cue('puck-drop');this.strike.drop=true}
   }
   if(g.basket==='tamping'&&p>=.43&&!this.strike.tamp){this.cue('tamp');this.strike.tamp=true}
   if(g.basket==='locking'&&p>=.88&&!this.strike.lock){this.cue('group-lock');this.strike.lock=true}
  }
  for(const job of g.pours){
   const fraction=(g.tick-job.start)/(job.end-job.start)
   if(fraction>=(job.action==='ice'?.52:job.action==='water'?0:.33)&&!this.heardPours.has(job)){
    this.heardPours.add(job)
    this.cue(job.action==='ice'?'ice-clink':job.action==='water'?'hot-water':'pour-liquid')
   }
  }
 }

 /** Short, dry plastic seating click; only emitted for a committed lid cycle. */
 /** Three light cup-rim clicks and a short paper rustle on a successful bulk restock. */
 restockSound(){
  const ctx=this.ctx;if(!ctx||!this.enabled)return
  const n=Math.round(ctx.sampleRate*.24),buffer=ctx.createBuffer(1,n,ctx.sampleRate),a=buffer.getChannelData(0)
  let seed=271,previous=0
  for(let i=0;i<n;i++){const t=i/ctx.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;let sample=0
   for(const [offset,freq] of [[0,1180],[.057,1420],[.114,1670]]){const dt=t-offset;if(dt>=0)sample+=(.21*Math.sin(dt*Math.PI*2*freq)+.13*(noise-previous))*Math.exp(-dt*76)}
   a[i]=sample+.032*(noise-previous)*Math.sin(Math.PI*t/.24);previous=noise
  }
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.58;source.connect(gain);gain.connect(ctx.destination);source.start()
 }
 private lidSnap(){
  const ctx=this.ctx;if(!ctx||!this.enabled)return
  const n=Math.round(ctx.sampleRate*.075),buffer=ctx.createBuffer(1,n,ctx.sampleRate),a=buffer.getChannelData(0)
  let seed=731,prev=0
  for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/ctx.sampleRate
   a[i]=(.48*(noise-prev)*Math.exp(-t*95)+.21*Math.sin(t*2*Math.PI*1450)*Math.exp(-t*170))*(1-Math.min(1,t/.075));prev=noise}
  const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;gain.gain.value=.53;src.connect(gain);gain.connect(ctx.destination);src.start()
 }
 private stop(name:Motor){
  const loop=this.loops.get(name),ctx=this.ctx;if(!loop||!ctx)return
  loop.gain.gain.setTargetAtTime(0,ctx.currentTime,.025)
  loop.source.stop(ctx.currentTime+.14);this.loops.delete(name)
 }
 cue(id:Cue,volume=.62){
  const ctx=this.ctx,buffer=this.buffers.get(id)
  if(!ctx||!this.enabled)return
  if(!buffer){const pending=this.pending.get(id)??[];pending.push({volume,at:ctx.currentTime});this.pending.set(id,pending.slice(-3));return}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer
  gain.gain.value=volume;source.connect(gain);gain.connect(ctx.destination);source.start()
 }
}
