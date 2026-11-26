import type {Bench} from './bench.ts'
import {ease} from './layout.ts'

// Coordinates are in the original 1600×900 counter artwork, before frontLift.
// The basket, rather than the tip of the wooden handle, is the animation pivot.
export const espressoLayout={
 group:{x:291,y:589}, resting:{x:274,y:793}, hand:{x:369,y:727},
 knock:{x:493,y:739}, grinder:{x:98,y:674}, grinderHand:{x:217,y:713},
 mat:{x:107,y:798}, tamper:{x:228,y:814}
} as const
export type PortafilterPose={x:number;y:number;angle:number;grounds:boolean}
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p
const toward=(a:{x:number;y:number},b:{x:number;y:number},p:number)=>({x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p)})
const part=(p:number,a:number,b:number)=>ease((p-a)/(b-a))

export function portafilterPose(g:Bench,now=g.tick):PortafilterPose{
 const stage=g.basket,L=espressoLayout
 if(stage==='mounted')return {...L.group,angle:0,grounds:false}
 if(stage==='released'){
  const p=ease((now-g.basketMoved)/g.ticks(g.data.stations.load))
  return {...toward(L.group,L.resting,p),y:lerp(L.group.y,L.resting.y,p)-38*Math.sin(Math.PI*p),angle:-.12,grounds:true}
 }
 if(stage==='held')return {...L.hand,angle:-.12,grounds:true}
 if(stage==='knocking'){
  const p=g.basketCycle?Math.min(1,Math.max(0,(now-g.basketCycle.start)/(g.basketCycle.end-g.basketCycle.start))):1
  const approach=part(p,0,.26),flip=part(p,.13,.38),retreat=part(p,.67,1)
  const position=toward(L.hand,L.knock,approach)
  const hit1=Math.max(0,1-Math.abs(p-.405)/.065),hit2=Math.max(0,1-Math.abs(p-.555)/.055)
  return {x:lerp(position.x,L.resting.x,retreat),y:lerp(position.y+6*hit1+4*hit2,L.resting.y,retreat),angle:lerp(lerp(-.12,Math.PI-.12,flip),-.12,retreat),grounds:p<.49}
 }
 if(stage==='clean')return {...L.resting,angle:-.12,grounds:false}
 if(stage==='emptyHeld')return {...L.grinderHand,angle:-.14,grounds:false}
 if(stage==='grinding'||stage==='dosed')return {...L.grinder,angle:-.08,grounds:stage==='dosed'}
 if(stage==='dosedHeld')return {...L.grinderHand,angle:-.13,grounds:true}
 if(stage==='attached')return {...L.group,angle:-.1,grounds:true}
 if(stage==='locking'){
  const p=g.basketCycle?Math.min(1,Math.max(0,(now-g.basketCycle.start)/(g.basketCycle.end-g.basketCycle.start))):1
  const move=part(p,0,.7),turn=part(p,.67,1)
  return {...toward(L.mat,L.group,move),y:lerp(L.mat.y,L.group.y,move)-38*Math.sin(Math.PI*move),angle:lerp(-.72,.12,turn),grounds:true}
 }
 return {...L.resting,angle:-.12,grounds:false}
}

export function knockPuckPosition(g:Bench,now=g.tick){
 if(g.basket!=='knocking'||!g.basketCycle)return null
 const p=(now-g.basketCycle.start)/(g.basketCycle.end-g.basketCycle.start)
 if(p<.49||p>1)return null
 const fall=Math.min(1,(p-.49)/.44)
 return {x:espressoLayout.knock.x+4+2*Math.sin(fall*5),y:744+49*fall*fall,alpha:1-.24*fall,angle:fall*1.5}
}
