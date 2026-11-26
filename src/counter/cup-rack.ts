import type {Bench} from './bench.ts'
import {stockKey,takeCup} from './bench.ts'
import {holders,type Holder,type Carry} from './station-layout.ts'

type ImagePainter=(id:string,x:number,y:number,w:number,h:number)=>void
type ObjectPainter=(id:string,x:number,y:number,h:number,angle?:number)=>void

// Plates register to the painted inside edges of the case, clear of the marble and waste plinth.
export const rackArt={
 china:{x:14,y:748,w:357,h:188},
 takeaway:{x:593,y:747,w:561,h:153}
}
export function chinaStack(b:Holder,count:number){
 const h=({demi:49,mug:57,glass:72,bowl:49,tall:72,paper:0,clear:0})[b.cup]
 const step=({demi:12,mug:12,glass:10,bowl:11,tall:10,paper:0,clear:0})[b.cup]
 return Array.from({length:Math.min(5,Math.max(0,count))},(_,i)=>({x:b.x,y:b.y-i*step,h}))
}
export function holderTouch(b:Holder){
 const h=takeCup(b.cup)?b.h+15:chinaStack(b,5)[4].h+b.y-chinaStack(b,5)[4].y+8
 return {x:b.x,y:b.y-h/2,w:b.w,h}
}
export const lidSeats=[{x:830,y:879},{x:1090,y:879}]

export function drawCupRacks(ctx:CanvasRenderingContext2D,image:ImagePainter,prop:ObjectPainter,g:Bench,lifting:Carry|null,layer:(id:string,x:number,y:number,w:number,h:number,draw:()=>void)=>void=(_id,_x,_y,_w,_h,draw)=>draw()){
 const china=rackArt.china,travel=rackArt.takeaway
 layer('china-rack',china.x,china.y,china.w,china.h,()=>image('china-rack-single',china.x,china.y,china.w,china.h))
 layer('takeaway-rack',travel.x,travel.y,travel.w,travel.h,()=>image('takeaway-rack',travel.x,travel.y,travel.w,travel.h))
 function contact(x:number,y:number,w:number){
  ctx.save();ctx.translate(x,y);ctx.scale(w,3)
  const shade=ctx.createRadialGradient(0,0,.05,0,0,1)
  shade.addColorStop(0,'rgba(37,22,13,.6)');shade.addColorStop(1,'rgba(37,22,13,0)')
  ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore()
 }
 holders.forEach((b,i)=>{
  const key=stockKey(b.cup,b.size)
  const n=Math.max(0,g.stock[key]-Number(lifting?.kind==='holder'&&lifting.index===i&&(!g.drawer||!takeCup(b.cup))))
  const hit=holderTouch(b)
  layer('cup-stack/'+i,hit.x-hit.w/2,hit.y-hit.h/2,hit.w,hit.h,()=>{
   if(!n)return
   contact(b.x,b.y-1,b.w*.47)
   if(takeCup(b.cup)){
    const levels=Math.min(5,n)
    prop(b.cup+'-stack-'+levels,b.x,b.y,b.h+(levels-1)*3)
   }else{
    // Vertically nested cups: draw lower vessels first so the next cup sits in its rim.
    for(const p of chinaStack(b,n))prop(b.cup+'-empty',p.x,p.y,p.h)
   }
  })
 })
 for(const [i,s] of lidSeats.entries()){
  contact(s.x,s.y,33)
  image(i?'lids-clear':'lids',s.x-34,s.y-23,68,23)
 }
}
