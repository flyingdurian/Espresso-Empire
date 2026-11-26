import type {Content,Command} from '../content/model.ts'
import {nextRandom} from './random.ts'

export interface Order {id:string;seat:string;section:string;item:string;remaining:number;max:number}
export interface Machine {id:string;phase:'idle'|'cycle'|'hold';remaining:number}
export interface LogEvent {tick:number;kind:string;detail:string}
export interface Snapshot {seed:number;rng:number;tick:number;section:string;orders:Order[];stations:Machine[];cart:(string|null)[];events:LogEvent[]}
export function digest(value:unknown) {
  let h=2166136261
  for(const c of JSON.stringify(value)) h=Math.imul(h^c.charCodeAt(0),16777619)
  return (h>>>0).toString(16).padStart(8,'0')
}
export function zone(o:Order,bounds:number[]) {
  const r=o.remaining/o.max
  return r>=bounds[1]?'Relaxed':r>=bounds[0]?'Waiting':'Urgent'
}
export class Simulation {
  private data:Content
  private state:Snapshot
  constructor(content:Content,seed:number) {
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff) throw Error('Seed must be an unsigned 32-bit integer')
    this.data=content
    const {building,menu,diagnostic:f}=content
    let rng=seed
    const orders=f.orders.map(o=>{
      let item=o.item
      if(item==='from-pool') {
        rng=nextRandom(rng)
        item=f.orderPool[Math.floor(rng/0x100000000*f.orderPool.length)]
      }
      return {id:o.id,seat:o.seat,section:building.sections.find(s=>s.seats.includes(o.seat))!.id,item,
        max:this.ticks(menu.archetypes.find(a=>a.id===o.archetype)!.patienceSeconds),remaining:this.ticks(o.remainingSeconds)}
    })
    this.state={seed,rng,tick:0,section:f.startSection,orders,stations:menu.stations.map(s=>({id:s.id,phase:'idle',remaining:0})),
      cart:Array.from({length:f.cupSlots+f.plateSlots},(_,i)=>f.loadedCups[i]??null),events:[]}
    this.log('Fixture loaded',f.id)
  }
  private ticks(seconds:number) {return Math.ceil(seconds*1000/this.data.tuning.tickMs)}
  private log(kind:string,detail:string) {this.state.events.push({tick:this.state.tick,kind,detail})}
  private apply(c:Command) {
    if(c.kind==='position') {this.state.section=c.target;this.log('Position set',c.target);return}
    const m=this.state.stations.find(m=>m.id===c.target)!
    if(m.phase!=='idle') return
    m.phase='cycle'
    m.remaining=this.ticks(this.data.menu.stations.find(s=>s.id===m.id)!.cycleSeconds)
    this.log('Cycle started',m.id)
  }
  step() {
    const s=this.state
    if(s.tick>=this.data.diagnostic.durationTicks) return
    s.tick++
    // Advance existing timers, then apply commands stamped for this boundary.
    for(const o of s.orders) {
      if(o.remaining===0) continue
      const before=zone(o,this.data.tuning.zoneBoundaries)
      o.remaining--
      if(!o.remaining) this.log('Timer elapsed',o.seat)
      else if(before!==zone(o,this.data.tuning.zoneBoundaries)) this.log('Patience changed',o.seat+' · '+zone(o,this.data.tuning.zoneBoundaries))
    }
    for(const m of s.stations) {
      if(m.phase==='idle'||--m.remaining>0) continue
      if(m.phase==='cycle') {
        m.phase='hold';m.remaining=this.ticks(this.data.menu.stations.find(v=>v.id===m.id)!.graceSeconds)
        this.log('Batch ready',m.id)
        if(m.remaining>0) continue
      }
      m.phase='idle';this.log('Hold elapsed',m.id)
    }
    for(const c of this.data.diagnostic.commands) if(c.tick===s.tick) this.apply(c)
    if(s.tick===this.data.diagnostic.durationTicks) this.log('Trace complete',this.data.diagnostic.id)
  }
  snapshot():Snapshot {return structuredClone(this.state)}
  get tick(){return this.state.tick}
}
export function runTrace(data:Content,seed:number,ticks:number) {
  if(!Number.isInteger(ticks)||ticks<0||ticks>data.diagnostic.durationTicks) throw Error('Tick outside fixture')
  const sim=new Simulation(data,seed)
  while(sim.tick<ticks) sim.step()
  return sim.snapshot()
}
