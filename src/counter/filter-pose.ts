import type {Bench} from './bench.ts'
export const filterSockets=[134,264,394]
const clamp=(p:number)=>Math.max(0,Math.min(1,p))
const smooth=(p:number)=>{const s=clamp(p);return s*s*(3-2*s)}
const mix=(a:number,b:number,p:number)=>a+(b-a)*p
export function filterTexture(g:Bench){
 if(g.basket==='grinding'||g.basket==='clean'||g.basket==='emptyHeld'||(g.basket==='knocking'&&g.basketCycle&&g.tick-g.basketCycle.start>(g.basketCycle.end-g.basketCycle.start)*.49))return 'filter-empty'
 if(['dosed','dosedHeld','atTamp'].includes(g.basket)||g.basket==='tamping'&&g.basketCycle&&g.tick-g.basketCycle.start<(g.basketCycle.end-g.basketCycle.start)*.45)return 'filter-loose'
 return 'filter-tamped'
}
export function filterPose(g:Bench,t:number){
 const state=g.basket,socket=filterSockets[g.serviceHead]
 const p=g.basketCycle?clamp((t-g.basketCycle.start)/(g.basketCycle.end-g.basketCycle.start)):0
 const move=smooth((t-g.basketMoved)/g.ticks(g.data.stations.load))
 let x=189,y=660,angle=-.08,lock:number|null=null
 if(state==='released'){
  const u=g.assistedService?smooth((p-.30)/.70):move
  if(g.assistedService&&p<.30)lock=Math.round(8*(1-smooth(p/.30)))
  x=mix(socket,x,u);y=mix(514,y,u)-24*Math.sin(Math.PI*u)
 }
 if(state==='knocking'){
  const reach=smooth(p/.32)*smooth((1-p)/.32)
  x=mix(x,80,reach);y=mix(y,680,reach)+9*Math.max(0,1-Math.abs(p-.43)/.08)
  angle+=Math.PI*reach
 }
 if(g.assistedService&&state==='clean'){const u=smooth(p);x=mix(x,255,u);y=mix(y,395,u)-28*Math.sin(Math.PI*u);angle=mix(angle,0,u)}
 if(state==='grinding'||state==='dosed'||g.assistedService&&state==='emptyHeld'){x=255;y=395;angle=0}
 if(state==='dosedHeld'){
  const u=g.assistedService?smooth(p):move
  x=mix(255,g.assistedService?304:x,u);y=mix(395,g.assistedService?711:y,u)-20*Math.sin(Math.PI*u);angle=0
 }
 if(['atTamp','tamping','tamped'].includes(state)){x=304;y=711;angle=0}
 if(state==='locking'){
  const reach=smooth(p/.59);x=mix(304,socket,reach);y=mix(711,514,reach)-24*Math.sin(Math.PI*reach)
  if(p>=.59)lock=Math.round(8*smooth((p-.59)/.41))
 }
 return {x,y,angle,lock}
}
