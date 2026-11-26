import type {Bench} from './bench.ts'
import {stockKey,takeCup} from './bench.ts'
import {holders,type Carry} from './station-layout.ts'

type ImagePainter=(id:string,x:number,y:number,w:number,h:number)=>void
type ObjectPainter=(id:string,x:number,y:number,h:number,angle?:number)=>void

// Plates register to the painted inside edges of the case, clear of the marble and waste plinth.
export const rackArt={
 china:{x:14,y:748,w:357,h:188},
 takeaway:{x:593,y:747,w:561,h:153}
}
export const lidSeats=[{x:830,y:879},{x:1090,y:879}]

export function drawCupRacks(ctx:CanvasRenderingContext2D,image:ImagePainter,prop:ObjectPainter,g:Bench,lifting:Carry|null){
 const china=rackArt.china,travel=rackArt.takeaway
 image('china-rack',china.x,china.y,china.w,china.h)
 image('takeaway-rack',travel.x,travel.y,travel.w,travel.h)
 function contact(x:number,y:number,w:number){
  ctx.save();ctx.translate(x,y);ctx.scale(w,3)
  const shade=ctx.createRadialGradient(0,0,.05,0,0,1)
  shade.addColorStop(0,'rgba(37,22,13,.6)');shade.addColorStop(1,'rgba(37,22,13,0)')
  ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore()
 }
 holders.forEach((b,i)=>{
  const key=stockKey(b.cup,b.size)
  const n=Math.max(0,g.stock[key]-Number(lifting?.kind==='holder'&&lifting.index===i&&(!g.drawer||!takeCup(b.cup))))
  if(!n)return
  if(takeCup(b.cup)){
   const levels=Math.min(5,n)
   contact(b.x,b.y-1,b.w*.47)
   prop(b.cup+'-stack-'+levels,b.x,b.y,b.h+(levels-1)*3)
  }else{
   const glass=b.cup==='glass'||b.cup==='tall'
   const count=Math.min(3,n)
   // Glasses sit side by side. China queues behind its front cup, like a push-through rack.
   for(let j=count-1;j>=0;j--){
    const x=b.x+(glass?(j-1)*43:(1-j)*8)
    const y=b.y-(glass?0:j*6)
    contact(x,y-1,b.h*(glass?.28:.46))
    prop(b.cup+'-empty',x,y,b.h*(glass?1:1-j*.065))
   }
  }
 })
 for(const [i,s] of lidSeats.entries()){
  contact(s.x,s.y,33)
  image(i?'lids-clear':'lids',s.x-34,s.y-23,68,23)
 }
}
