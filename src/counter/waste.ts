import type {Bench} from './bench.ts'

type ImagePainter=(name:string,x:number,y:number,w:number,h:number)=>void
type PropPainter=(name:string,x:number,y:number,h:number,angle?:number)=>void

export function drawWastePress(ctx:CanvasRenderingContext2D,image:ImagePainter,prop:PropPainter,g:Bench,t:number,x:number,y:number,w:number,h:number){
 const cycle=g.compacting
 const progress=cycle?Math.min(1,Math.max(0,(t-cycle.start)/(cycle.end-cycle.start))):0
 const pressure=cycle?Math.min(1,progress/.26,(1-progress)/.21):0
 ctx.save()
 ctx.translate(x,y)
 ctx.scale(w/140,h/190)
 image('waste-press',0,0,140,190)
 ctx.save()
 ctx.beginPath()
 ctx.moveTo(18,5);ctx.lineTo(118,5);ctx.lineTo(129,28);ctx.lineTo(10,28);ctx.closePath();ctx.clip()
 // Each solid keeps its own appearance as it lands inside the actual liner.
 g.wastePieces.forEach((id,i)=>{
  const age=(t-g.binChanged)*g.data.tickMs
  const drop=i===g.wastePieces.length-1?Math.max(0,1-age/180):0
  const cx=24+(i*43)%85,cy=32-i*1.5-drop*25+pressure*12
  if(id==='liquid'){
   ctx.fillStyle='#613720'
   ctx.beginPath();ctx.ellipse(cx,cy-4,11,2.8,.04,0,Math.PI*2);ctx.fill()
  }else prop(id,cx,cy,13+(i%2)*2,.4-i%3*.35)
 })
 if(pressure>0)image('waste-shutter',4,4,132,27*pressure)
 ctx.restore()
 if(cycle||g.binLoad===g.data.capacity.bin){
  const lamp=ctx.createRadialGradient(121,154,1,121,154,5)
  lamp.addColorStop(0,'#fff2a2');lamp.addColorStop(.48,'#ffb14e');lamp.addColorStop(1,'#ef852511')
  ctx.fillStyle=lamp;ctx.fillRect(116,149,10,10)
 }
 ctx.restore()
}
