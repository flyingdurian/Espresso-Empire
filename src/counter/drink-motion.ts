import {isTopping,type Add} from './bench.ts'
import {iceScoopHome} from './ice-service.ts'
import {juiceSeat} from './service-pass.ts'
import {frontGalley} from './galley-layout.ts'
import {brewPoint,citrusPress,finishSources,isSyrup,milkSpouts,toppingSources,toppingAsset} from './station-layout.ts'

export type PourAction='transfer'|Add
type Point={x:number;y:number}
export const phase=(p:number,a:number,b:number)=>Math.max(0,Math.min(1,(p-a)/(b-a)))
const ease=(u:number)=>u*u*(3-2*u)
export const fillProgress=(p:number)=>ease(phase(p,.36,.72))
const mix=(a:number,b:number,u:number)=>a+(b-a)*u

export function tool(action:Exclude<PourAction,'water'>,head:number,lane:number){
 if(action==='transfer')return {home:brewPoint(head,lane),key:'shot-glass',h:39,lip:[-.47,-.90],tilt:-.83,color:'#814222'}
 if(action==='ice')return {home:iceScoopHome,key:'empire_ice_scoop',h:iceScoopHome.h,lip:[-.27,-.12],tilt:-.65,color:''}
 if(action==='orange')return {home:juiceSeat(lane),key:'orange-carafe',h:juiceSeat(lane).h,lip:[-.43,-.88],tilt:-.94,color:'#ec9a32'}
 if(action==='tea'||action==='cold')return {home:frontGalley.carafes[action],key:action==='tea'?'tea-carafe':'blend-carafe',h:frontGalley.carafes[action].h,lip:[-.43,-.88],tilt:-.94,color:action==='tea'?'#ac591c':'#c7a382'}
 if(action==='milk'||action==='foam')return {home:action==='milk'?milkSpouts.silky:milkSpouts.airy,key:'new-milk-pitcher',h:40,lip:[-.46,-.92],tilt:action==='foam'?-1.08:-.78,color:action==='foam'?'#fff4dc':'#f6e6ca'}
 if(isTopping(action))return {home:toppingSources[action],key:toppingAsset[action],h:toppingSources[action].h,lip:[0,-.90],tilt:0,color:action==='strawberryDrizzle'?'#b6334d':action==='caramelDrizzle'?'#ae6e29':action==='cinnamonDust'?'#b06b39':'#4c2c20'}
 const pump=action!=='coldmilk'
 return {home:finishSources[action],key:pump?action:'new-milk-carton',h:finishSources[action].h,lip:pump?[-.49,-.89]:[-.34,-.94],tilt:pump?0:-.91,color:action==='cherry'?'#9d243b':action==='vanilla'?'#dbb16a':action==='caramel'?'#b67a39':action==='cocoa'?'#583021':action==='matcha'?'#879c60':'#f3ead8'}
}

// Register the painted lip to the stream. The entire tool follows one continuous path.
export function pourPose(action:Exclude<PourAction,'water'>,p:number,head:number,lane:number,
 rim:Point,aspect:number,release:Point|undefined){
 const src=tool(action,head,lane),ice=action==='ice',pump=isSyrup(action)
 const reach=ease(phase(p,ice&&!release? .15:0,.32)),ret=ease(phase(p,.77,1))
 const tilt=ease(phase(p,.20,.39))*(1-ease(phase(p,.66,.81)))
 const angle=mix(ice?iceScoopHome.angle:0,src.tilt,tilt),wd=src.h*aspect
 const h=src.h-(pump?3*Math.sin(Math.PI*phase(p,.29,.62)):0)
 const lipX=wd*src.lip[0],lipY=h*src.lip[1]
 const dx=lipX*Math.cos(angle)-lipY*Math.sin(angle),dy=lipX*Math.sin(angle)+lipY*Math.cos(angle)
 const pourX=rim.x+(ice?3:5)-dx,pourY=rim.y-(ice?31:24)-dy
 const startX=release?.x??src.home.x,startY=release?release.y+src.h*.36:src.home.y
 const dip=ice&&!release?Math.sin(phase(p,0,.16)*Math.PI):0
 const x=mix(mix(startX,pourX,reach),src.home.x,ret)-dip*25
 const y=mix(mix(startY,pourY,reach),src.home.y,ret)-Math.sin(Math.PI*reach)*(release?8:38)-Math.sin(Math.PI*ret)*32+dip*10
 return {src,x,y,h,angle,lip:{x:x+dx,y:y+dy},pour:fillProgress(p)}
}

/** Bottle stays vertical; only plunger moves. The receiving cup never leaves its saucer. */
export function travelingPumpPose(action:import('./station-layout.ts').Syrup,p:number,rim:Point,aspect:number){
 const src=tool(action,0,0),w=src.h*aspect,dx=-w*.43,dy=-src.h*.89
 const reach=ease(phase(p,0,.28))*(1-ease(phase(p,.79,1)))
 const pulse=Math.sin(Math.PI*phase(p,.29,.65))*5
 const x=mix(src.home.x,rim.x-dx,reach),y=mix(src.home.y,rim.y-17-dy,reach)-10*Math.sin(Math.PI*reach)
 return {x,y,h:src.h,plunger:pulse,angle:0,nozzle:{x:x+dx,y:y+dy+pulse}}
}
