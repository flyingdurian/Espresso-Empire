import {paintedSurface} from '../view/painted-surface.ts'
import type {Shift} from './shift.ts'
export const portraits=['regular','writer','reader','visitor']
export const garnishes=[
  {tool:'water',art:'water-urn',x:657,h:122},{tool:'milk',art:'milk',x:830,h:116},
  {tool:'foam',art:'foam-crock',x:1010,h:96},{tool:'cold',art:'cold-jug',x:1185,h:113},
  {tool:'snacks',art:'bread-basket',x:1385,h:98}
] as const
export const cradleX=472
export const wellX=(i:number)=>755+i*211
const art=['lounge','backbar','service-cart','shot-tin','clean-tin','empty','espresso','ristretto','americano','latte','cappuccino','frappe','cookie','warm','pastry','plate','dose-single',...garnishes.map(g=>g.art),...portraits,...portraits.map(p=>p+'-served')]
export const seatX=[204,592,984,1370]
export async function createPaintedStage(host:HTMLElement){
  const {pieces,prop,draw}=await paintedSurface(host,Object.fromEntries(art.map(id=>[id,'/art/'+id+'.webp'])))
  return (game:Shift,phase:number)=>{
    pieces.length=0
    pieces.push({id:game.room==='Lounge'?'lounge':'backbar',x:0,y:0,w:1600,h:900})
    if(game.room==='Lounge'){
      game.seats.forEach((s,i)=>{
        const id=game.data.seats[i].art
        const h=500
        const leave=s.state==='expired'?Math.min(1,(game.tick-s.resolved)/game.ticks(1)):0
        if(leave<1)prop(s.state==='served'?id+'-served':id,seatX[i]+leave*18,686+leave*6,h,0,1-leave)
      })
      pieces.push({id:'service-cart',x:-16,y:572,w:1632,h:425})
      for(const g of garnishes){
        if(game.operation!==g.tool)prop(g.art,g.x,685,g.h)
      }
      const shot=game.operation==='short'||game.operation==='standard'
      if(game.active){
        const id=game.active==='espresso'?'shot-tin':game.active
        prop(id,cradleX,770,83)
      }else if(game.operation&&game.data.actions[game.operation].base){
        prop(game.operation==='foam'?'latte':'shot-tin',cradleX,770,83)
      }else{
        prop(shot&&phase>.45?'shot-tin':'clean-tin',cradleX,770,78,shot?Math.sin(phase*Math.PI*8)*.012:0)
      }
      game.parked.forEach((id,i)=>{if(id)prop(id,wellX(i),792,77)})
      const moving=garnishes.find(g=>g.tool===game.operation)
      if(moving){
        const travel=Math.min(1,Math.min(phase,1-phase)*3)
        const ease=travel*travel*(3-2*travel)
        prop(moving.art,moving.x+(cradleX+76-moving.x)*ease,685-17*ease,moving.h,-.72*ease)
      }
    }
    draw()
  }
}
