import cast from '../../public/data/guest-performance.json' with {type:'json'}
import type {Bench,Order,Delivery} from './bench.ts'

export type Line='greet'|'receive'|'thank'|'impatient'|'leave'
type Voice=keyof typeof cast.byLook
type Cue={guest:number;line:Line;created:number}
type Memory={state:string;low:boolean;delivery:Delivery|null}
const priority:Record<Line,number>={greet:1,impatient:2,receive:3,thank:4,leave:4}
const voice=(look:string):Voice=>Object.hasOwn(cast.byLook,look)?look as Voice:'a'
export function actingProfile(order:Order){
 const role=order.archetype??cast.byLook[voice(order.look)] as keyof typeof cast.profiles
 return cast.profiles[role]
}

// Voices are world events. A missed cue in another room is never replayed on return.
export class GuestVoices{
 private guests:Memory[]=[]
 private queued:Cue|null=null
 private nextVoice=0
 private nextAmbient=0
 private speaking:AudioBufferSourceNode|null=null
 private game?:Bench

 silence(){
  this.queued=null
  if(this.speaking){this.speaking.stop();this.speaking=null}
 }

 update(g:Bench,ctx:AudioContext,clips:ReadonlyMap<string,AudioBuffer>,enabled:boolean){
  if(this.game!==g){
   this.silence();this.game=g;this.guests=[];this.nextVoice=0;this.nextAmbient=0
  }
  const now=ctx.currentTime
  if(this.queued&&now-this.queued.created>cast.maxLate)this.queued=null
  for(const [i,guest] of g.guests.entries()){
   const o=g.data.orders[i],prev=this.guests[i],delivery=guest.received
   const arrived=delivery&&g.tick>=delivery.end?delivery:prev?.delivery??null
   const low=guest.state==='waiting'&&guest.left<=g.ticks(o.patience)*g.tuning.zoneBoundaries[0]
   const line:Line|null=delivery&&arrived!==prev?.delivery&&g.tick>=delivery.end
    ?guest.state==='paid'?'thank':guest.state==='waiting'?'receive':null
    :guest.state==='leaving'&&prev?.state!=='leaving'?'leave'
    :low&&!prev?.low?'impatient'
    :guest.state==='waiting'&&prev?.state!=='waiting'?'greet':null
   if(enabled&&line&&!g.turn&&g.view===o.end){
    const ambient=line==='greet'||line==='impatient'
    if((!ambient||now>=this.nextAmbient)&&(!this.queued||priority[line]>priority[this.queued.line])){
     this.queued={guest:i,line,created:now}
    }
   }
   this.guests[i]={state:guest.state,low:low||prev?.low===true,delivery:arrived}
  }
  const q=this.queued
  if(!q)return
  const order=g.data.orders[q.guest]
  if(!enabled||g.turn||g.view!==order.end||now-q.created>cast.maxLate){this.queued=null;return}
  const buffer=clips.get('vb_'+voice(order.look)+'_'+q.line)
  if(!buffer||ctx.state!=='running'||now<this.nextVoice)return

  const length=buffer.duration
  const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner()
  source.buffer=buffer;source.playbackRate.value=1
  pan.pan.value=order.spot ? .20 : -.20
  gain.gain.value=q.line==='greet'?.49:q.line==='impatient'?.56:.67
  source.connect(gain).connect(pan).connect(ctx.destination)
  this.speaking=source
  source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();if(this.speaking===source)this.speaking=null}
  source.start(now)
  this.nextVoice=now+length/source.playbackRate.value+cast.speechGap
  this.nextAmbient=this.nextVoice+cast.ambientGap
  this.queued=null
 }
}
