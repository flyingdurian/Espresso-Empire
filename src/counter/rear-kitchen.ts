import {drawWastePress} from './waste.ts'
import type {Bench, HotBay} from './bench.ts'
import type {Carry} from './station-layout.ts'
import {rear, rearFood, rearOven, rearPress} from './rear-layout.ts'
import {rackPosition} from './hot-appliance.ts'

export const beverageMachineArt=['urn-empty','urn-full','blend-empty','blend-full']

type Frame = {x:number;y:number;w:number;h:number}
type ImagePainter = (id:string,x:number,y:number,w:number,h:number)=>void
type PropPainter = (id:string,x:number,y:number,h:number,angle?:number,alpha?:number)=>void
type AppliancePainter = (g:Bench,t:number,type:HotBay,x:number,y:number,w:number,h:number)=>void
type Paint = {
  ctx: CanvasRenderingContext2D
  image: ImagePainter
  prop: PropPainter
  appliance: AppliancePainter
  vapor:(x:number,y:number,time:number,strength:number)=>void
}
const fraction=(t:number,c:{start:number;end:number})=>Math.max(0,Math.min(1,(t-c.start)/(c.end-c.start)))
const mix=(a:number,b:number,p:number)=>a+(b-a)*p
const towelHeight=62

function contact(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,depth=.32){
  ctx.save()
  ctx.translate(x,y)
  ctx.scale(w,h)
  const grad=ctx.createRadialGradient(0,0,0,0,0,1)
  grad.addColorStop(0,'rgba(64,30,10,'+depth+')')
  grad.addColorStop(.56,'rgba(64,30,10,'+depth*.55+')')
  grad.addColorStop(1,'rgba(64,30,10,0)')
  ctx.fillStyle=grad;ctx.fillRect(-1,-1,2,2)
  ctx.restore()
}

function foodSeat(type:HotBay,slot:number,count:number){
  const box=type==='oven'?rearOven:rearPress
  return rackPosition(type,slot,count,box)
}

function setAppliance(paint:Paint,g:Bench,t:number,type:HotBay,box:Frame){
  contact(paint.ctx,box.x+box.w*.52,box.y+box.h-2,box.w*.58,14,.55)
  paint.appliance(g,t,type,box.x,box.y,box.w,box.h)
}

function loadBin(paint:Paint,g:Bench,type:HotBay,lifting:Carry|null){
  const {image,prop,ctx}=paint
  const oven=type==='oven',p=oven?rear.load:rear.sandwich,w=p.w
  const key=oven?'raw':'panino'
  const entering=g.foodFlights.filter(f=>f.food===key)
  const count=Math.max(2,4-entering.length-(lifting?.kind==='supply'&&lifting.station===type?1:0))
  contact(ctx,p.x+3,p.y+25,w*.57,12)
  image('dish-tub',p.x-w/2,p.y-24,w,63)
  for(let i=0;i<count;i++){
    const x=p.x-w*.30+w*.19*i
    const y=p.y+10-i%2*5
    prop(key,x,y,oven?38:42,i%2===0?-.08:.045)
  }
}

export function drawRearKitchen(g:Bench,t:number,lifting:Carry|null,paint:Paint){
  const {ctx,image,prop,vapor}=paint
  image('forno-kitchen',0,0,1672,941)

  const drinks=[
    {key:'urn',at:rear.tea,cycle:g.brew,ready:g.teaReady,h:250,w:172,carafe:'tea-carafe'},
    {key:'blend',at:rear.blend,cycle:g.blend,ready:g.blendReady,h:235,w:129,carafe:'blend-carafe'}
  ]
  for(const d of drinks){
    const kettle=d.key==='urn',vibrate=!kettle&&d.cycle?Math.sin(t*2.1)*1.4:0
    const x=d.at.x-d.w/2+vibrate,y=550-d.h
    contact(ctx,d.at.x,550,d.w*.62,10,.5)
    image(d.key+'-empty',x,y,d.w,d.h)
    const fill=d.ready?1:d.cycle?fraction(t,d.cycle):0
    if(fill>0){
      const bottom=y+d.h*(kettle?.71:.59),top=y+d.h*(kettle?.36:.19)
      const line=mix(bottom,top,fill)
      ctx.save();ctx.beginPath();ctx.rect(x,line,d.w,bottom-line);ctx.clip()
      image(d.key+'-full',x,y,d.w,d.h);ctx.restore()
    }
    if(kettle&&d.cycle)vapor(rear.tea.x,322,t,.64)
    if(d.ready)prop(d.carafe,d.at.x+99,562,65)
  }

  setAppliance(paint,g,t,'oven',rearOven)
  setAppliance(paint,g,t,'press',rearPress)
  loadBin(paint,g,'oven',lifting)
  loadBin(paint,g,'press',lifting)

  contact(ctx,rear.pesto.x,643,44,6)
  if(lifting?.kind!=='pesto')prop('pesto',rear.pesto.x,643,80)
  image('old-plate',rear.brownie.x-70,617,145,29)
  prop('brownie',rear.brownie.x-15,629,54,-.07)
  prop('brownie',rear.brownie.x+16,638,55,.04)

  image('towel',1218,545,315,82)
  const outputs=g.foodOutputs.filter(f=>f.towelSlot<g.towel.length)
  g.towel.forEach((food,slot)=>{
    if(!food||outputs.some(f=>f.towelSlot===slot)||lifting?.kind==='food'&&lifting.slot===slot)return
    const pos=rearFood[slot]
    prop(food.food==='pesto'?'grilled-pesto':food.food,pos.x,pos.y,towelHeight)
  })

  for(const f of g.foodFlights){
    const type=f.food==='raw'?'oven':'press'
    const count=type==='oven'?g.ovenSlots.length:g.pressSlots.length
    const start=type==='oven'?rear.load:rear.sandwich,end=foodSeat(type,f.slot,count)
    const p=fraction(t,f),ease=p*p*(3-2*p)
    prop(f.food==='panino'&&g.pressSlots[f.slot].pesto?'panino-pesto':f.food,mix(start.x,end.x,ease),mix(start.y,end.y,ease)-Math.sin(p*Math.PI)*60,
      mix(type==='oven'?38:42,end.h,ease),Math.sin(p*Math.PI)*.10)
  }
  for(const f of outputs){
    if(lifting?.kind==='food'&&lifting.slot===f.towelSlot)continue
    const count=f.station==='oven'?g.ovenSlots.length:g.pressSlots.length
    const start=foodSeat(f.station,f.slot,count),end=rearFood[f.towelSlot],p=fraction(t,f)
    const ease=1-(1-p)**2
    prop(f.food==='pesto'?'grilled-pesto':f.food,mix(start.x,end.x,ease),mix(start.y,end.y,ease)-Math.sin(p*Math.PI)*85,
      mix(start.h,towelHeight,ease),-.10*Math.sin(p*Math.PI))
  }

  // These cut-in recesses support the movable wash rack and the lined waste bin.
  image('return-bay',26,708,379,229)
  prop('wash-'+(g.wash?'closed':'open'),rear.wash.x,919,188)
  if(!g.wash)g.washRack.forEach((cup,i)=>prop(cup+'-empty',137+i*44,867,42))
  image('return-bay',443,709,372,225)
  prop('dish-tub',rear.dishTub.x,892,95)
  g.dirty.slice(0,4).forEach((cup,i)=>prop(cup+'-empty',rear.dishTub.x-57+i*33,863,45))
  image('return-bay',1284,707,355,227)
  drawWastePress(ctx,image,prop,g,t,rear.bin.x-63,740,126,178)
}
