import type { Group, Shot } from './bench.ts'
import { brewPoint, heads } from './station-layout.ts'
import { phase } from './drink-motion.ts'

type ImagePainter=(key:string,x:number,y:number,w:number,h:number)=>void
export const espressoParts=['brass-group','manometer','hot-spigot','shot-glass']
export const glassHeight=39
const glassAspect=162/127
export function doseVolume(shot:Shot|null){return shot ? .97 : 0}

/** The transparent beaker, coffee body and crema share a transform everywhere it is handled. */
export function shotGlass(ctx:CanvasRenderingContext2D,image:ImagePainter,x:number,y:number,h:number,angle:number,amount:number,shot:Shot|null){
 const w=h*glassAspect
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.translate(-w/2,-h);ctx.scale(w,h)
 image('shot-glass',0,0,1,1)
 const short=shot==='short'
 const left=.108,right=.711,bottom=.925,cx=(left+right)/2,rx=(right-left)/2
 if(amount>.004){
  const top=bottom-.75*Math.min(1,amount)
  ctx.save()
  ctx.beginPath();ctx.moveTo(left-.03,.13);ctx.lineTo(left,bottom)
  ctx.bezierCurveTo(left+.06,bottom+.062,right-.06,bottom+.062,right,bottom)
  ctx.lineTo(right+.008,.13);ctx.closePath();ctx.clip()
  const roast=ctx.createLinearGradient(0,top,0,bottom+.075)
  roast.addColorStop(0,short?'#b46c35':'#4a2216');roast.addColorStop(.20,short?'#985126':'#29140e');roast.addColorStop(.8,short?'#753819':'#180d09');roast.addColorStop(1,short?'#a35929':'#462317')
  ctx.fillStyle=roast;ctx.fillRect(left-.035,top,right-left+.05,1-top)
  ctx.beginPath();ctx.ellipse(cx,top,rx+.015,.038,0,0,Math.PI*2);ctx.fillStyle=short?'#dfaa69':'#a1653e';ctx.fill()
  ctx.beginPath();ctx.ellipse(cx+.021,top-.005,rx*.71,.021,0,0,Math.PI*2);ctx.fillStyle=short?'#c5864e':'#794328';ctx.fill()
  ctx.restore()
 }
 if(amount>.004){ctx.globalAlpha*=.22;image('shot-glass',0,0,1,1)}
 ctx.restore()
}

export function brewGroup(ctx:CanvasRenderingContext2D,image:ImagePainter,group:Group,h:number,t:number,selected:boolean){
 const x=heads[h],running=group.extraction??group.flush
 const p=running?phase(t,running.start,running.end):0
 const pressure=running?Math.min(phase(p,0,.20),1-phase(p,.81,1)):0
 image('brass-group',x-33,481,66,48)
 image('manometer',x-13.5,430,27,27)
 ctx.save();ctx.translate(x,443.5)
 const needle=-Math.PI*.83+(pressure+(pressure>0?.015*Math.sin(t*1.6):0))*Math.PI*1.37
 ctx.rotate(needle);ctx.strokeStyle='#742810';ctx.lineWidth=1.7;ctx.lineCap='round'
 ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(9,0);ctx.stroke()
 ctx.fillStyle='#302017';ctx.beginPath();ctx.arc(0,0,1.8,0,Math.PI*2);ctx.fill();ctx.restore()
 ctx.save();ctx.fillStyle=group.dirty?'#dd7544':running?'#ffdf8c':selected?'#abcf9d':'#6d786a'
 ctx.strokeStyle='#5d4530';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,467,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()
}

export function extraction(ctx:CanvasRenderingContext2D,group:Group,h:number,t:number){
 const run=group.extraction;if(!run)return
 const p=phase(t,run.start,run.end),pt=brewPoint(h,run.lane)
 const x=pt.x+(run.lane?-12:7)
 const mouth=527,fall=pt.y-glassHeight+5-mouth
 ctx.save();ctx.fillStyle=p>.64?'#b97939':'#633117'
 if(p>.075&&p<.23||p>=.83&&p<.98){
  const drip=phase(p,p<.23?.075:.83,p<.23?.23:.98)
  ctx.beginPath();ctx.ellipse(x,mouth+3+fall*drip*drip,1.8,1.9+.9*drip,0,0,Math.PI*2);ctx.fill()
 }else if(p>=.23&&p<.83){
  ctx.strokeStyle=p>.62?'#b57438':'#6f3518';ctx.lineWidth=2.6+.45*Math.sin(t*2.3)
  ctx.beginPath();ctx.moveTo(x,mouth);ctx.lineTo(x+.25*Math.sin(t),mouth+fall);ctx.stroke()
  ctx.fillStyle='#d29853';ctx.fillRect(x-.6,mouth+3,.7,fall-4)
 }
 ctx.restore()
}
