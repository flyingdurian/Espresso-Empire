import type {Bench} from './bench.ts'
import {stockKey,takeCup} from './bench.ts'
import {holders,type Holder,type Carry} from './station-layout.ts'
import {cupColumns,lidColumns,curatedStackParts,exactStockState,stackTouch,type StackSpec} from './cup-stack-spec.ts'
import type {LayerMap} from './layer-overrides.ts'

type ImagePainter=(id:string,x:number,y:number,w:number,h:number)=>void
type ObjectPainter=(id:string,x:number,y:number,h:number,angle?:number)=>void
type LayerPainter=(id:string,x:number,y:number,w:number,h:number,draw:()=>void)=>void
export const rackArt={china:{x:14,y:748,w:357,h:188},takeaway:{x:593,y:747,w:561,h:153}}
const column=(b:Holder)=>cupColumns.find(c=>c.cup===b.cup&&c.size===b.size)!
export function holderTouch(b:Holder,capacity=5){return stackTouch(column(b),capacity,b.w)}
export const lidSeats=lidColumns
export function lidTouch(s:typeof lidSeats[number],capacity=5){return stackTouch(s,capacity,66)}
/** Draw a stack from committed stock. A gesture merely offers a cup; cancellation must
 * not remove a unit. Active cup sprites have their own upright registration. */
export function drawCupRacks(ctx:CanvasRenderingContext2D,image:ImagePainter,_prop:ObjectPainter,g:Bench,_lifting:Carry|null,layer:LayerPainter=(_id,_x,_y,_w,_h,draw)=>draw(),overrides:LayerMap={}){
 const china=rackArt.china,travel=rackArt.takeaway
 layer('china-rack',china.x,china.y,china.w,china.h,()=>image('china-rack-single',china.x,china.y,china.w,china.h))
 layer('takeaway-rack',travel.x,travel.y,travel.w,travel.h,()=>image('takeaway-rack',travel.x,travel.y,travel.w,travel.h))
 function paint(s:StackSpec,count:number,capacity:number,width:number){
  const offset=overrides[s.id]?.stackOffset??s.offset
  const hit=stackTouch({...s,offset},capacity,width)
  layer(s.id,hit.x-hit.w/2,hit.y-hit.h/2,hit.w,hit.h,()=>{
   if(!count)return
   ctx.save();ctx.translate(s.x,s.y-1);ctx.scale(s.w*.48,3)
   const shade=ctx.createRadialGradient(0,0,.05,0,0,1)
   shade.addColorStop(0,'rgba(37,22,13,.55)');shade.addColorStop(1,'rgba(37,22,13,0)')
   ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore()
   const exact=exactStockState(s,count,offset)
   if(exact){const height=s.h*(1+(count-1)*offset);image(exact,s.x-s.w/2,s.y-height,s.w,height)}
   else for(const f of curatedStackParts(s,count,capacity,offset))image(f.id,f.x,f.y,f.w,f.h)
  })
 }
 for(const [i,b] of holders.entries())paint(cupColumns[i],g.stock[stockKey(b.cup,b.size)],takeCup(b.cup)?g.data.capacity.takeaway:g.data.capacity.ceramic,b.w)
 for(const s of lidColumns)paint(s,g.lidStock[s.cup],g.lidCapacity,66)
}
