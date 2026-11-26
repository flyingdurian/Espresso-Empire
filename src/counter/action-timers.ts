import type {Bench} from './bench.ts'
import {frontGalley} from './galley-layout.ts'
import {frontHot,rackPosition} from './hot-appliance.ts'
import {rear,rearOven,rearPress} from './rear-layout.ts'
import {iceTouch} from './ice-service.ts'
import {heads,milkSpouts,citrusPress,cupsX} from './station-layout.ts'
export type TimedAction={id:string;name:string;x:number;y:number;start:number;end:number}
type Cycle={start:number;end:number}
/** All clocks are derived from the same simulation cycles, never independent wall-clock timers. */
export function actionTimers(g:Bench,kitchen=g.kitchen):TimedAction[]{
 const out:TimedAction[]=[]
 const add=(id:string,name:string,job:Cycle|null|undefined,x:number,y:number)=>{if(job)out.push({id,name,x,y,start:job.start,end:job.end})}
 add('tea','Tea',g.brew,kitchen?rear.tea.x:frontGalley.tea.x,kitchen?rear.tea.y-110:frontGalley.tea.y-65)
 add('blend','Blend',g.blend,kitchen?rear.blend.x:frontGalley.blend.x,kitchen?rear.blend.y-105:frontGalley.blend.y-65)
 add('compact','Compact',g.compacting,kitchen?rear.bin.x:475,kitchen?rear.bin.y-65:765)
 if(kitchen)add('wash','Wash',g.wash,rear.wash.x,rear.wash.y-75)
 if(!kitchen){
  add('grinder','Grind',g.grind,255,244)
  add('micro','Warm',g.microwave,1180,449)
  add('refill','Refill',g.milkRefill,1540,278)
  add('ice-refill','Ice',g.iceRefill,iceTouch.x,iceTouch.y-15)
  add('citrus','Juice',g.citrus,citrusPress.x,638)
  g.groups.forEach((group,i)=>add('pull/'+i,group.extraction?.shot==='short'?'Short':'Shot',group.extraction,heads[i],545))
  for(const kind of ['silky','airy'] as const)add('steam/'+kind,'Steam',g.steamJobs[kind],milkSpouts[kind].x,302)
  for(const p of g.pours){const labels:Partial<Record<typeof p.action,string>>={water:'Water'}
   const name=labels[p.action];if(name)add('pour/'+p.slot,name,p,cupsX[p.slot],561)
  }
 }
 for(const station of ['oven','press'] as const){
  const slots=station==='oven'?g.ovenSlots:g.pressSlots,box=kitchen?(station==='oven'?rearOven:rearPress):frontHot[station]
  slots.forEach((s,i)=>{const p=rackPosition(station,i,slots.length,box)
   add(station+'/'+i,station==='oven'?'Bake':'Grill',s.cook,p.x,p.y-12)
   if(station==='press')add('pesto/'+i,'Pesto',s.pestoJob,p.x,p.y-12)
  })
 }
 return out
}
export function timerProgress(job:Pick<TimedAction,'start'|'end'>,tick:number,tickMs:number){
 const duration=Math.max(1,job.end-job.start),remaining=Math.min(duration,Math.max(0,job.end-tick))
 return {seconds:Math.ceil(remaining*tickMs/1000),fraction:Math.max(0,Math.min(1,1-remaining/duration))}
}
export function drawActionTimers(ctx:CanvasRenderingContext2D,g:Bench,t:number,kitchen:boolean){
 for(const job of actionTimers(g,kitchen)){
  const {seconds,fraction}=timerProgress(job,t,g.data.tickMs);if(t<job.start||!seconds)continue
  // Compact brass-bezel instrument: light text, dark enamel, elapsed progress rail.
  const narrow=job.id.startsWith('steam/')||job.id.startsWith('press/')||job.id.startsWith('pesto/'),w=narrow?49:67,h=35
  ctx.save();ctx.translate(job.x,job.y);ctx.shadowColor='#1b100bd0';ctx.shadowOffsetY=2;ctx.shadowBlur=4
  const enamel=ctx.createLinearGradient(0,-h/2,0,h/2);enamel.addColorStop(0,'#574539');enamel.addColorStop(1,'#241c18')
  ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,6);ctx.fillStyle=enamel;ctx.fill();ctx.shadowColor='transparent'
  ctx.strokeStyle='#dfbf83';ctx.lineWidth=1.6;ctx.stroke()
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f9e9bf';ctx.font='700 20px system-ui';ctx.fillText(`${seconds}s`,0,-2)
  ctx.fillStyle='#7e6a51';ctx.beginPath();ctx.roundRect(-w/2+6,10,w-12,3,1.5);ctx.fill()
  if(fraction>0){ctx.fillStyle='#f0c979';ctx.beginPath();ctx.roundRect(-w/2+6,10,(w-12)*fraction,3,1.5);ctx.fill()}
  ctx.restore()
 }
}
