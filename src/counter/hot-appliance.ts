import {frontGalley} from './galley-layout.ts'
import {rear} from './rear-layout.ts'
import type {Bench, HotBay, HotSlot} from './bench.ts'
import type {Carry} from './station-layout.ts'

export type HotRect={x:number;y:number;w:number;h:number}
export const frontHot:Record<HotBay,HotRect>={
 oven:{x:1264,y:171,w:145,h:220},
 press:{x:1260,y:428,w:149,h:173}
}
// Front cabinetry slopes down toward the right. Keep the transformed press inside
// its original bounds and share the projected food-motion endpoints with the scene.
export function frontPressPoint(x:number,y:number){
 const b=frontHot.press,cx=b.x+b.w/2,cy=b.y+b.h/2
 return {x,y:cy+(y-cy)*.90+(x-cx)*.10}
}
export function frontPressPerspective(ctx:CanvasRenderingContext2D,draw:()=>void){
 const b=frontHot.press,cx=b.x+b.w/2,cy=b.y+b.h/2
 ctx.save();try{ctx.translate(cx,cy);ctx.transform(1,.10,0,.90,0,0);ctx.translate(-cx,-cy);draw()}finally{ctx.restore()}
}
export const hotArt=['bakery-ivory-shell','bakery-glass-motion','griglia-base','griglia-raised','griglia-half','griglia-copper','charred-cornetto','charred-panino']

/** Baseline of the edible item in its own bay. Hit zones and all motion share this anchor. */
export function rackSeat(station:HotBay,slot:number,count:number){
 if(station==='oven')return {x:.50,y:count<=1?.696:.383+.313*slot/(count-1)}
 const x=(slot+.5)/count
 return {x,y:.693}
}
export function rackFoodHeight(station:HotBay,width:number,count:number){
 return station==='oven'?width*Math.min(.247,.64/count):width*.48/count
}
export function rackPosition(station:HotBay,slot:number,count:number,box:HotRect){
 const p=rackSeat(station,slot,count)
 return {x:box.x+box.w*p.x,y:box.y+box.h*p.y,h:Math.min(rackFoodHeight(station,box.w,count),box.h*(station==='oven'?.143:.195))}
}
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const smooth=(n:number)=>{const f=clamp(n);return f*f*(3-2*f)}
type Prop=(id:string,x:number,y:number,h:number,angle?:number,alpha?:number)=>void
type Painter={context:()=>CanvasRenderingContext2D;textures:Map<string,HTMLImageElement>;prop:Prop}
export function makeHotAppliance(paint:Painter){
 // Hinge movement continues across input spam, pauses with the simulation, and survives a turn.
 const hinges=new WeakMap<Bench,Map<string,{time:number;amount:number}>>()
 function openness(g:Bench,t:number,key:string,target:number){
  let states=hinges.get(g);if(!states){states=new Map();hinges.set(g,states)}
  const old=states.get(key)
  const dt=old?Math.max(0,t-old.time)*g.data.tickMs/1000:1
  const delta=Math.min(1,dt/Math.max(.10,g.data.stations.load*(target>.5?.67:.76)))
  const amount=old?old.amount+Math.sign(target-old.amount)*Math.min(delta,Math.abs(target-old.amount)):target
  states.set(key,{time:t,amount});return smooth(amount)
 }
 function draw(g:Bench,t:number,station:HotBay,x:number,y:number,w:number,h:number,held:Carry|null=null){
  const ctx=paint.context(),box={x,y,w,h},slots=station==='oven'?g.ovenSlots:g.pressSlots
  const oven=station==='oven',incoming=oven?'raw':'panino'
  function tile(key:string,frame:number,xx:number,yy:number,ww:number,hh:number){
   const im=paint.textures.get(key)!
   const fw=im.width/6,fh=im.height/3,i=Math.round(clamp(frame)*17)
   ctx.drawImage(im,(i%6)*fw,Math.floor(i/6)*fh,fw,fh,xx,yy,ww,hh)
  }
  function heat(px:number,py:number,rx:number,ry:number,opacity:number,burnt=false){
   if(opacity<=0)return
   ctx.save();ctx.translate(px,py);ctx.scale(rx,ry)
   const glow=ctx.createRadialGradient(0,0,0,0,0,1)
   glow.addColorStop(0,burnt?'rgba(83,77,69,'+opacity+')':'rgba(255,162,53,'+opacity+')')
   glow.addColorStop(1,'rgba(179,65,15,0)');ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore()
  }
  function food(slot:HotSlot,i:number){
   if(slot.state==='empty'||g.foodFlights.some(j=>j.food===incoming&&j.slot===i)
    ||held?.kind==='bakedSlot'&&held.station===station&&held.slot===i)return
   const p=rackPosition(station,i,slots.length,box)
   const baking=slot.cook?smooth((t-slot.cook.start)/(slot.cook.end-slot.cook.start)):0
   const done=slot.state==='ready'?1:baking
   ctx.save()
   ctx.shadowColor='#26180bbd';ctx.shadowBlur=1;ctx.shadowOffsetY=1
   if(slot.state==='burnt')paint.prop(oven?'charred-cornetto':'charred-panino',p.x,p.y,p.h)
   else{
    if(done<1)paint.prop(!oven&&slot.pesto?'panino-pesto':incoming,p.x,p.y,p.h,0,1-done)
    if(done>0)paint.prop(oven?'baked':slot.pesto?'grilled-pesto':'grilled',p.x,p.y,p.h,0,done)
   }
   ctx.restore()
   if(slot.state!=='cooking'&&slot.state!=='ready'&&slot.state!=='burnt')return
   const burnt=slot.state==='burnt',intensity=burnt?.48:slot.state==='ready'?.16:done*.28
   for(let k=0;k<4;k++){
    const pulse=(t*g.data.tickMs/1500+k*.237+i*.15)%1
    const drift=Math.sin(pulse*3+k+i)*p.h*pulse*.23
    heat(p.x+(k-1.5)*p.h*.22+drift,p.y-p.h*(.9+pulse*.97),p.h*(.08+.1*pulse),p.h*(.15+.18*pulse),
     Math.sin(Math.PI*pulse)*intensity,burnt)
   }
  }
  if(oven){
   const accepting=g.loading||g.ovenDoor||g.foodFlights.some(f=>f.food==='raw')
   const open=openness(g,t,'oven',accepting?1:0)
   ctx.drawImage(paint.textures.get('bakery-ivory-shell')!,x,y+h*.043,w,h*.907)
   for(const [i,slot] of slots.entries()){
    const p=rackPosition(station,i,slots.length,box)
    if(slot.cook)heat(p.x,p.y-p.h*.35,w*.41,h*.12,.42)
    food(slot,i)
   }
   tile('bakery-glass-motion',open,x,y,w,h)
  }else{
   ctx.drawImage(paint.textures.get('griglia-base')!,x,y+h*.508,w,h*.414)
   const laneWidth=w/slots.length
   for(const [i,slot] of slots.entries()){
    const p=rackPosition(station,i,slots.length,box)
    const landing=g.foodFlights.some(f=>f.food==='panino'&&f.slot===i)
    const closing=openness(g,t,'press'+i,slot.state==='cooking'&&!landing?1:0)
    ctx.save()
    const squeeze=1-.59*closing
    ctx.translate(0,p.y*(1-squeeze));ctx.scale(1,squeeze)
    food(slot,i)
    ctx.restore()
    const hingeY=y+h*.535
    // The back edge of the iron stays on its pin as the walnut grip sweeps forward.
    const angle=closing*Math.PI/2
    const top=hingeY-h*.408*Math.cos(angle)
    const bottom=hingeY+h*.142*Math.sin(angle)
    const width=laneWidth*(.92+.036*Math.sin(angle))
    const height=bottom-top
    const key=closing<.52?'griglia-raised':'griglia-half'
    const next=closing<.52?'griglia-half':'griglia-copper'
    const blend=smooth(closing<.52?(closing-.30)/.22:(closing-.66)/.34)
    const left=p.x-width/2
    ctx.save()
    if(blend<1)ctx.drawImage(paint.textures.get(key)!,left,top,width,height)
    if(blend>0){
     ctx.globalAlpha=blend
     ctx.drawImage(paint.textures.get(next)!,left,top,width,height)
    }
    ctx.restore()
    if(slot.cook)heat(p.x,p.y,laneWidth*.4,h*.018,.48)
    if(slot.pesto||slot.pestoJob){
     // The garnish remains legible even behind the closed iron.
     const badgeH=Math.max(13,Math.min(23,h*.075)),badgeW=badgeH*2.55
     ctx.save();ctx.translate(p.x,y+h*.833)
     ctx.fillStyle='#253824';ctx.strokeStyle='#c4cd87';ctx.lineWidth=1
     ctx.beginPath();ctx.roundRect(-badgeW/2,-badgeH/2,badgeW,badgeH,3);ctx.fill();ctx.stroke()
     ctx.fillStyle='#f4ecc7';ctx.textAlign='center';ctx.textBaseline='middle'
     ctx.font='600 '+Math.round(badgeH*.72)+'px system-ui';ctx.fillText(slot.pestoJob?'Spread':'Pesto',0,0)
     ctx.restore()
     const age=(t-(slot.pestoAt??-1000))*g.data.tickMs/1000*.72/g.data.stations.pesto
     if(age>=0&&age<.72){
      const front=g.view!=='Kitchen',origin=front?frontGalley.pesto:rear.pesto
      const move=smooth(age/.29)*(1-smooth((age-.52)/.20))
      const swipe=Math.sin(Math.PI*2*clamp((age-.29)/.23))
      const xx=origin.x+(p.x-origin.x)*move+swipe*p.h*.31
      const yy=origin.y+(p.y-p.h*.36-origin.y)*move-34*Math.sin(Math.PI*move)
      const jar=paint.textures.get('pesto')!
      ctx.save();ctx.translate(xx,yy);ctx.rotate(swipe*.18)
      // Isolate the wooden handle from the existing illustrated jar.
      ctx.strokeStyle='#69853b';ctx.lineWidth=p.h*.17;ctx.lineCap='round';ctx.beginPath()
      ctx.moveTo(-p.h*.06,0);ctx.lineTo(p.h*.09,-p.h*.05);ctx.stroke()
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.h*.14,0);ctx.lineTo(p.h*.67,-p.h*.69);ctx.lineTo(p.h*.61,-p.h*.77);ctx.lineTo(p.h*.52,-p.h*.75);ctx.closePath();ctx.clip()
      ctx.drawImage(jar,jar.width*.60,0,jar.width*.40,jar.height*.37,0,-p.h*.77,p.h*.67,p.h*.78)
      ctx.restore()
     }
    }
   }
  }
 }
 return draw
}
