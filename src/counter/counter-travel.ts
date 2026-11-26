import type {End} from './bench.ts'
import {neutralTravelOrigin,ownsPointer} from './gesture-ownership.ts'
export type Area=End|'Kitchen'
export type Slide={to:Area;fraction:number}
const areas:Area[]=['Door','Window','Kitchen']

/** A drag belongs to either the item or the counter for the lifetime of its pointer. */
export function counterTravel(surface:HTMLElement, current:()=>Area, blocked:()=>boolean, go:(to:Area)=>void){
 let hand:{id:number;x:number;y:number;start:number;active:boolean}|null=null
 let slide:Slide|null=null,settling:{start:number;from:number;to:Area}|null=null
 let committed:Slide|null=null,suppressUntil=0
 function clear(){hand=null;slide=null;settling=null;committed=null;surface.classList.remove('travelling')}
 surface.addEventListener('pointerdown',e=>{
  if(hand||!e.isPrimary||e.button!==0||blocked()||!neutralTravelOrigin(e.target as Element|null))return
  clear();hand={id:e.pointerId,x:e.clientX,y:e.clientY,start:e.timeStamp,active:false}
 })
 surface.addEventListener('pointermove',e=>{
  if(hand?.id!==e.pointerId)return
  const dx=e.clientX-hand.x,dy=e.clientY-hand.y
  if(!hand.active&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){clear();return}
  if(!hand.active&&(Math.abs(dx)<9||Math.abs(dx)<Math.abs(dy)*1.25))return
  const to=areas[areas.indexOf(current())+(dx<0?1:-1)]
  if(!to){slide=null;return}
  if(!hand.active){hand.active=true;surface.setPointerCapture(e.pointerId);surface.classList.add('travelling')}
  slide={to,fraction:Math.min(.92,Math.abs(dx)/Math.max(1,surface.clientWidth))}
 })
 function up(e:PointerEvent){
  if(hand?.id!==e.pointerId)return
  const h=hand;hand=null
  if(!h.active)return
  suppressUntil=performance.now()+350
  surface.classList.remove('travelling')
  if(!slide)return
  const dx=Math.abs(e.clientX-h.x),velocity=dx/Math.max(1,e.timeStamp-h.start)
  if(e.type==='pointerup'&&(slide.fraction>.15||dx>=28&&velocity>.22)){
   committed=slide;slide=null;go(committed.to)
  }else{settling={start:performance.now(),from:slide.fraction,to:slide.to};slide=null}
 }
 surface.addEventListener('pointerup',up)
 surface.addEventListener('pointercancel',up)
 surface.addEventListener('pointerleave',e=>{if(ownsPointer(hand,e.pointerId)&&!hand?.active)hand=null})
 surface.addEventListener('lostpointercapture',up)
 surface.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true)
 window.addEventListener('blur',clear)
 return {clear,frame(turn:Area|undefined):Slide|null{
  if(turn){return committed?.to===turn?committed:null}
  committed=null
  if(settling){const ease=Math.max(0,1-(performance.now()-settling.start)/155);if(ease>0)return {to:settling.to,fraction:settling.from*ease*ease};settling=null}
  return slide
 }}
}
