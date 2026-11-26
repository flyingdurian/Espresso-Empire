import {pocketSeat,servicePass,juiceRack,juiceSeat} from './service-pass.ts'
export type ReserveSection='shots'|'panini'|'pastries'|'juice'
type Painter=(id:string,x:number,y:number,w:number,h:number)=>void
type Rect={x:number;y:number;w:number;h:number}
export type Recess=Rect&{kind:'round'|'rect';seatX:number;seatY:number}
export function reserveRecess(section:ReserveSection,i:number):Recess{
 if(section==='juice'){
  const p=juiceSeat(i),w=juiceRack.w/juiceRack.capacity-8
  return {x:p.x-w/2,y:juiceRack.y+3,w,h:juiceRack.h-6,kind:'round',seatX:p.x,seatY:p.y}
 }
 const p=pocketSeat(section,i),w=p.w-3,h=p.h-3
 // The floor and foreground lip enclose the original transfer endpoint.
 return {x:p.x-w/2,y:p.y-h*.70,w,h,kind:section==='shots'?'round':'rect',seatX:p.x,seatY:p.y}
}
function rounded(ctx:CanvasRenderingContext2D,r:Rect,radius:number){ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,radius)}
function contour(ctx:CanvasRenderingContext2D,r:Recess){
 if(r.kind==='round'){ctx.beginPath();ctx.ellipse(r.x+r.w/2,r.y+r.h/2,r.w/2,r.h/2,0,0,Math.PI*2)}
 else rounded(ctx,r,Math.min(4,r.h*.17))
}
export function reserveShell(ctx:CanvasRenderingContext2D,section:ReserveSection,paint?:Painter){
 const r=section==='juice'?juiceRack:servicePass[section].well
 ctx.save();ctx.shadowColor='rgba(32,19,9,.48)';ctx.shadowBlur=4;ctx.shadowOffsetY=3
 rounded(ctx,r,7);ctx.fillStyle='#513719';ctx.fill();ctx.shadowColor='transparent'
 const brass=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);brass.addColorStop(0,'#f2d49a');brass.addColorStop(.13,'#9c7339');brass.addColorStop(.42,'#d7bd86');brass.addColorStop(.8,'#6d4826');brass.addColorStop(.92,'#dfbd7f');brass.addColorStop(1,'#694725')
 ctx.fillStyle=brass;rounded(ctx,{x:r.x+1,y:r.y+1,w:r.w-2,h:r.h-2},6);ctx.fill()
 const base=ctx.createLinearGradient(0,r.y+3,0,r.y+r.h-4);base.addColorStop(0,'#655d50');base.addColorStop(.48,'#302b26');base.addColorStop(1,'#8a7962')
 ctx.fillStyle=base;rounded(ctx,{x:r.x+4,y:r.y+4,w:r.w-8,h:r.h-8},4);ctx.fill();ctx.restore()
 if(paint){ctx.save();rounded(ctx,{x:r.x+2,y:r.y+2,w:r.w-4,h:r.h-4},5);ctx.clip();paint('empire_reserve_rect',r.x+2,r.y+2,r.w-4,r.h-4);ctx.restore()}
}
export function reservePocket(ctx:CanvasRenderingContext2D,p:Recess,paint?:Painter){
 if(p.kind==='rect'&&paint){paint('empire_reserve_rect',p.x,p.y,p.w,p.h);return}
 ctx.save();contour(ctx,p);ctx.fillStyle='#251e18';ctx.fill();ctx.strokeStyle='#e3c799';ctx.lineWidth=1.3;ctx.stroke();ctx.clip()
 const well=ctx.createLinearGradient(0,p.y,0,p.y+p.h);well.addColorStop(0,'#1d1916');well.addColorStop(.26,'#3b3934');well.addColorStop(.60,'#746b5d');well.addColorStop(.81,'#4b4338');well.addColorStop(1,'#1b1815')
 ctx.fillStyle=well;ctx.fillRect(p.x,p.y,p.w,p.h)
 if(p.kind==='round'){
  // Inner cylindrical wall: specular side reflections and a darker recessed floor.
  const shine=ctx.createLinearGradient(p.x,0,p.x+p.w,0);for(const [at,c] of [[0,'#191a18'],[.12,'#b1aaa0'],[.23,'#615e58'],[.48,'#282725'],[.76,'#817d73'],[.90,'#c9bdb0'],[1,'#292724']] as const)shine.addColorStop(at,c)
  ctx.fillStyle=shine;ctx.fillRect(p.x,p.y,p.w,p.h)
  const floor=ctx.createRadialGradient(p.seatX,p.seatY,1,p.seatX,p.seatY,p.w*.42);floor.addColorStop(0,'#6c655a');floor.addColorStop(.7,'#373532');floor.addColorStop(1,'#171614')
  ctx.fillStyle=floor;ctx.beginPath();ctx.ellipse(p.seatX,p.seatY,p.w*.42,p.h*.25,0,0,Math.PI*2);ctx.fill()
  ctx.strokeStyle='#f1d8a1';ctx.lineWidth=.65;ctx.beginPath();ctx.ellipse(p.seatX,p.y+p.h/2,p.w*.47,p.h*.45,0,Math.PI*1.10,Math.PI*1.9);ctx.stroke()
 }
 ctx.fillStyle='rgba(12,10,8,.35)';ctx.beginPath();ctx.ellipse(p.seatX,p.seatY,p.w*.37,p.h*.14,0,0,Math.PI*2);ctx.fill();ctx.restore()
}
/** Foreground lip is always drawn after the seated item, not baked behind it. */
export function reserveLip(ctx:CanvasRenderingContext2D,p:Recess,paint?:Painter){
 if(p.kind==='rect'&&paint){paint('empire_reserve_rect_lip',p.x,p.y,p.w,p.h);return}
 ctx.save();contour(ctx,p);ctx.clip();ctx.beginPath();const y=p.seatY-1,bot=p.y+p.h
 if(p.kind==='round'){ctx.moveTo(p.x,y-2);ctx.quadraticCurveTo(p.seatX,y+4,p.x+p.w,y-2)}
 else {ctx.moveTo(p.x,y);ctx.lineTo(p.x+p.w,y)}
 ctx.lineTo(p.x+p.w,bot);ctx.lineTo(p.x,bot);ctx.closePath()
 const lip=ctx.createLinearGradient(0,y,0,bot);lip.addColorStop(0,'#f3d7a5');lip.addColorStop(.16,'#b7a58a');lip.addColorStop(.43,'#67615a');lip.addColorStop(.82,'#3e3831');lip.addColorStop(1,'#c4a36a');ctx.fillStyle=lip;ctx.fill();ctx.restore()
 ctx.save();ctx.beginPath();if(p.kind==='round'){ctx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w/2,p.h/2,0,0,Math.PI)}else{ctx.moveTo(p.x+2,p.y+p.h-.7);ctx.lineTo(p.x+p.w-2,p.y+p.h-.7)}ctx.strokeStyle='#cfb58c';ctx.lineWidth=1;ctx.stroke();ctx.restore()
}
