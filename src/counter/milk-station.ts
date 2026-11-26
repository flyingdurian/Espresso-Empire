import type {Texture} from './bench.ts'
import {phase} from './drink-motion.ts'

/** The station's loader and renderer share this asset list, including the effect used only while steaming. */
export const milkStationFiles={
 pitcher:'/station/milk-pitcher.webp',
 wand:'/station/steam-wand.webp',
 silky:'/surfaces/pure-silky.webp',
 airy:'/surfaces/pure-airy.webp',
 vapor:'/counter/vapor.webp'
} as const
type MilkArt=Record<keyof typeof milkStationFiles,HTMLImageElement>

export async function loadMilkArt(decode:(path:string)=>Promise<HTMLImageElement>):Promise<MilkArt>{
 const [pitcher,wand,silky,airy,vapor]=await Promise.all([
  decode(milkStationFiles.pitcher),decode(milkStationFiles.wand),decode(milkStationFiles.silky),
  decode(milkStationFiles.airy),decode(milkStationFiles.vapor)
 ])
 return {pitcher,wand,silky,airy,vapor}
}

const ease=(v:number)=>v*v*(3-2*v)
const ramp=(p:number,start:number,end:number)=>ease(phase(p,start,end))

export function milkCycle(texture:Texture,p:number){
 const charge=ramp(p,0,.24)
 const seated=ramp(p,.12,.27)*(1-ramp(p,.83,.99))
 const rolling=ramp(p,.22,.35)*(1-ramp(p,.80,.91))
 const aerated=ramp(p,.35,.84)
 return {charge,seated,rolling,aerated,tilt:seated*(texture==='silky'?-.11:.075)}
}

/** Draw the same metallic pitcher and milk surface on its grate, in hand, and at the cup. */
export function drawMilkPitcher(ctx:CanvasRenderingContext2D,art:MilkArt,texture:Texture,
 x:number,y:number,h:number,angle:number,level:number,work:number,time:number){
 const f=Math.max(0,Math.min(1,level)),airy=texture==='airy',cycle=milkCycle(texture,work)
 const w=h*art.pitcher.width/art.pitcher.height
 ctx.save();ctx.translate(x,y);ctx.rotate(angle)
 ctx.drawImage(art.pitcher,-w/2,-h,w,h)
 if(f>0){
  const rx=h*(.20+.12*f),ry=h*(.029+.024*f),cx=-h*.093,cy=-h*(.882+.038*f)
  ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.clip()
  ctx.translate(cx,cy);ctx.scale(rx,ry);ctx.rotate(cycle.rolling*time*(airy?.035:.075))
  ctx.drawImage(art.silky,-1.55,-1.55,3.1,3.1)
  if(airy){
   ctx.globalAlpha=work>0?cycle.aerated:1
   ctx.drawImage(art.airy,-1.5,-1.5,3,3)
  }
  ctx.restore()
  if(airy&&cycle.rolling>0){
   ctx.save();ctx.strokeStyle='#c1aa82';ctx.lineWidth=.6;ctx.globalAlpha=cycle.rolling
   for(let b=0;b<6;b++){
    const life=(time*.07+b*.23)%1
    ctx.beginPath();ctx.arc(cx+Math.sin(b*3.8)*rx*.66,cy+Math.cos(b*2.2)*ry*.36,.45+life,0,Math.PI*2);ctx.stroke()
   }
   ctx.restore()
  }
 }
 ctx.restore()
}

export function drawSteamLane(ctx:CanvasRenderingContext2D,art:MilkArt,texture:Texture,
 pt:{x:number;y:number},port:{x:number;y:number},level:number,work:number,time:number,present:boolean){
 const cycle=milkCycle(texture,work),airy=texture==='airy'
 const x=pt.x+(airy?-1:2)*cycle.seated,y=pt.y-3.4*cycle.seated
 if(present){
  // Pitcher beneath the valve while charging, then lifted and tipped into the nozzle.
  drawMilkPitcher(ctx,art,texture,x,y,40,cycle.tilt,level,work,time)
  const stream=Math.sin(Math.PI*phase(work,0,.21))
  if(stream>.01){
   ctx.save();ctx.strokeStyle='rgba(251,238,209,.94)';ctx.lineWidth=.85+1.7*stream
   ctx.beginPath();ctx.moveTo(x-3,port.y+1);ctx.lineTo(x-3,y-36);ctx.stroke();ctx.restore()
  }
 }
 // An independently seated stainless-steel wand swings in and out at the brass swivel.
 ctx.save();ctx.translate(port.x,port.y)
 // Register the painted swivel and nozzle tip separately; the curved tube's axis is off-center.
 const dx=x-3-port.x,dy=y-35-port.y,mirror=airy?-1:1
 const shaftX=-.57*art.wand.width*mirror,shaftY=.95*art.wand.height
 const scale=(Math.hypot(dx,dy)+cycle.seated*2)/Math.hypot(shaftX,shaftY)
 const rotation=Math.atan2(dy,dx)-Math.atan2(shaftY,shaftX)+(airy?-.28:.28)*(1-cycle.seated)
 ctx.rotate(rotation);ctx.scale(scale*mirror,scale)
 ctx.drawImage(art.wand,-art.wand.width*.74,-art.wand.height*.03)
 ctx.restore()
 if(!present||cycle.rolling<=0)return
 for(let k=0;k<3;k++){
  const life=(time*(airy?.030:.024)+k/3)%1
  const plumeH=(15+life*(airy?40:32))*(.55+.45*cycle.rolling)
  ctx.save();ctx.globalAlpha=cycle.rolling*Math.sin(life*Math.PI)*(airy?.78:.60)
  ctx.translate(x-5+Math.sin(life*3.8+k)*life*7,y-36-life*(airy?35:25))
  ctx.rotate(Math.sin(time*.035+k)*.14)
  ctx.drawImage(art.vapor,-plumeH*.19,-plumeH,plumeH*.38,plumeH);ctx.restore()
 }
}
