import {cupsX,stageCupY,vesselHeight,milkSpouts,finishSources,heads,stage,foodBins,miniRack,citrusPress,type Syrup} from './station-layout.ts'
import {frontFoodSeat,pocketSeat,servicePass} from './service-pass.ts'
import {rackSeat,frontHot,frontPressPoint,type HotRect} from './hot-appliance.ts'
import type {Drink,Texture,HotBay} from './bench.ts'

/** Center-based logical rectangles shared by the DOM and regression tests. */
export type TouchBox={x:number;y:number;w:number;h:number}
export function milkTouch(texture:Texture){
 const x=milkSpouts[texture].x
 return {steam:{x,y:265,w:45,h:38},pitcher:{x,y:milkSpouts[texture].y-22,w:45,h:52},pour:{x,y:397,w:45,h:32}}
}
export function syrupTouch(key:Syrup):TouchBox{
 const p=finishSources[key];return {x:p.x,y:p.y-p.h/2,w:40,h:p.h}
}
export function saucerTouch(i:number,c:Pick<Drink,'cup'|'size'>|null):TouchBox{
 const h=c?vesselHeight(c.cup,c.size):66
 return {x:cupsX[i],y:stageCupY-h/2,w:115,h:Math.max(78,h)}
}
export function towelTouch(i:number,towel:number):TouchBox{
 const p=frontFoodSeat(i,towel);return {x:p.x,y:p.y-18,w:82,h:44}
}
export function shotRackTouch():TouchBox{
 const r=servicePass.shots.well;return {x:r.x+r.w/2,y:r.y+r.h/2,w:r.w,h:r.h}
}
export function shotPocketTouch(i:number):TouchBox{
 const p=pocketSeat('shots',i);return {x:p.x,y:p.y-p.h*.24,w:p.w-4,h:p.h-4}
}
export function foodWellTouch(section:'panini'|'pastries',i:number):TouchBox{
 const p=pocketSeat(section,i);return {x:p.x,y:p.y-p.h*.2,w:p.w-4,h:p.h-4}
}

/** Shared desktop and compact shot geometry. CSS consumes the compact box via custom properties. */
export function shotKeyTouch(head:number,type:'short'|'standard',_compact=false):TouchBox{
 const x=heads[head]
 return {x:x+(type==='short'?-31:31),y:466,w:58,h:44}
}
export function portafilterTouch(head:number):TouchBox{return {x:heads[head]+5,y:531,w:84,h:60}}

const edges=(b:TouchBox)=>({left:b.x-b.w/2,right:b.x+b.w/2,top:b.y-b.h/2,bottom:b.y+b.h/2})
const fromEdges=(left:number,top:number,right:number,bottom:number):TouchBox=>({x:(left+right)/2,y:(top+bottom)/2,w:right-left,h:bottom-top})
/** Keep generic shortcuts on the outer bezel, not in the neutral gaps between individual controls. */
export function bezelTouch(outer:TouchBox,inside:TouchBox[]):TouchBox[]{
 const a=edges(outer),b=inside.map(edges)
 if(!b.length)return [outer]
 const l=Math.min(...b.map(r=>r.left)),r=Math.max(...b.map(r=>r.right)),t=Math.min(...b.map(r=>r.top)),d=Math.max(...b.map(r=>r.bottom))
 return [fromEdges(a.left,a.top,a.right,t),fromEdges(a.left,d,a.right,a.bottom),fromEdges(a.left,t,l,d),fromEdges(r,t,a.right,d)].filter(p=>p.w>0&&p.h>0)
}
export function shotRackBezelTouch():TouchBox[]{
 // Use the un-inset cell extent so the gaps around the individual seats stay neutral.
 const cells=Array.from({length:servicePass.shots.capacity},(_,i)=>{const p=pocketSeat('shots',i);return {x:p.x,y:p.y-p.h*.24,w:p.w,h:p.h}})
 return bezelTouch(shotRackTouch(),cells)
}
export function applianceTouch(station:HotBay,box:HotRect,count:number){
 const oven=station==='oven',outer=fromEdges(box.x,box.y,box.x+box.w,box.y+box.h)
 const slots=Array.from({length:count},(_,i)=>{
  const seat=rackSeat(station,i,count)
  // Six logical units between adjacent plates/racks; single-slot legacy configs also work.
  const pitch=oven&&count>1?box.h*.313/(count-1):box.h*.48
  const width=oven?box.w*.91:box.w/count-6
  const height=oven?Math.min(box.h*.48/count,pitch-6):box.h*.82
  const x=box.x+box.w*seat.x,y=box.y+box.h*(oven?seat.y-.04:.48)
  // Front press is drawn with a slight shear; keep the exclusive rectangular
  // touch areas inside the projected plates (and the original appliance bounds).
  if(!oven&&box===frontHot.press)return {...frontPressPoint(x,y),w:width,h:height*.90-width*.10}
  return {x,y,w:width,h:height}
 })
 // Bezel surrounds the complete un-inset slot band, including plate edge gutters.
 const interior=oven?slots.map(p=>({...p,h:p.h+6})):slots.map(p=>({...p,w:p.w+6}))
 return {slots,bezel:bezelTouch(outer,interior)}
}
export function frontSupplyTouch(kind:keyof typeof foodBins):TouchBox{
 const p=miniRack.find(p=>p.food===kind)!;return {x:p.x,y:p.y-19,w:56,h:40}
}
export function citrusTouch(){
 const p=citrusPress,j=p.carafe
 return {run:{x:p.x,y:p.y-p.h*.65,w:76,h:64},juice:{x:j.x,y:j.y-18,w:74,h:36}}
}
