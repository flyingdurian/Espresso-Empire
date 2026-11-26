import type {Bench} from './bench.ts'

type Point=readonly [number,number]
type Quad=readonly [Point,Point,Point,Point]
type Paint=(key:string,x:number,y:number,h:number,angle?:number)=>void
type Crop=(key:string)=>HTMLImageElement
const ease=(p:number)=>{const t=Math.max(0,Math.min(1,p));return t*t*(3-2*t)}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t
const doorCrop:Quad=[[40,115],[356,61],[356,227],[40,251]]
const lowerLiner:Quad=[[65,178],[377,141],[377,210],[65,232]]
const inner:Quad=[[1477,287],[1638,257],[1638,343],[1477,356]]

// Map each triangle of the painted panel to its projected corners.
function panel(ctx:CanvasRenderingContext2D,img:HTMLImageElement,src:Quad,dst:Quad){
 for(const indices of [[0,1,2],[0,2,3]]){
  const [a,b,c]=indices.map(i=>src[i]),[p,q,r]=indices.map(i=>dst[i])
  const u=b[0]-a[0],v=b[1]-a[1],w=c[0]-a[0],h=c[1]-a[1],det=u*h-v*w
  const ax=((q[0]-p[0])*h-(r[0]-p[0])*v)/det,bx=(u*(r[0]-p[0])-w*(q[0]-p[0]))/det
  const ay=((q[1]-p[1])*h-(r[1]-p[1])*v)/det,by=(u*(r[1]-p[1])-w*(q[1]-p[1]))/det
  ctx.save()
  ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.lineTo(...r);ctx.closePath();ctx.clip()
  ctx.transform(ax,ay,bx,by,p[0]-ax*a[0]-bx*a[1],p[1]-ay*a[0]-by*a[1])
  ctx.drawImage(img,0,0);ctx.restore()
 }
}

function cartonSeat(index:number){
 const column=index%4,back=index>=4
 return {x:1496+column*39+(back?5:0),y:354-column*3.7-(back?6:0),h:61+column*5-(back?3:0)}
}

export function drawColdStation(ctx:CanvasRenderingContext2D,g:Bench,t:number,texture:Crop,fixed:(k:string)=>void,prop:Paint){
 if(!g.fridgeDoor){fixed('fridge');return}
 fixed('fridge-open')
 const age=(t-g.fridgeDoor.start)/(g.fridgeDoor.end-g.fridgeDoor.start)
 const open=Math.min(ease(age/.21),ease((1-age)/.20))
 const opened=texture('new-fridge-open'),closed=texture('new-fridge')
 panel(ctx,opened,lowerLiner,inner)
 const perCarton=g.data.capacity.carton
 const count=Math.ceil(g.milkReserve/perCarton)
 const inFlight=g.milkRefill?Math.ceil((g.milkReserve+g.milkRefill.amount)/perCarton)-1:-1
 const f=g.milkRefill?(t-g.milkRefill.start)/(g.milkRefill.end-g.milkRefill.start):0
 const pickup=ease((f-.17)/.27),putAway=ease((f-.73)/.27)
 const outOfBay=pickup>.015&&!(count>inFlight&&putAway>.99)
 for(let row=1;row>=0;row--)for(let col=0;col<4;col++){
  const i=row*4+col
  const moving=i===inFlight
  if(moving?outOfBay:i>=count)continue
  const s=cartonSeat(i)
  prop('new-milk-carton',s.x,s.y,s.h)
 }
 const angle=open*1.67,cos=Math.cos(angle),sin=Math.sin(angle)
 const dx=158*cos-19*sin,dy=-27*cos+14*sin
 const door:Quad=[[1479,288],[1479+dx,288+dy],[1479+dx,357+dy+9*cos+3*sin],[1479,357]]
 if(Math.abs(dx)>.8){
  panel(ctx,dx>0?closed:opened,dx>0?doorCrop:lowerLiner,door)
 }
 if(open>.03){
  ctx.strokeStyle='#ad9c83';ctx.lineWidth=2+2*sin
  ctx.beginPath();ctx.moveTo(...door[1]);ctx.lineTo(...door[2]);ctx.stroke()
 }
 if(!g.milkRefill)return
 if(!outOfBay)return
 const seat=cartonSeat(Math.max(0,inFlight))
 const empty=count<=inFlight
 const h=lerp(lerp(seat.h,92,pickup),empty?85:seat.h,putAway)
 const tilt=-1.16*Math.min(ease((f-.38)/.09),ease((.81-f)/.12))
 // A partly full carton returns to its own spot. An empty leaves in the barista’s hand.
 const x=lerp(lerp(seat.x,1214,pickup),empty?1708:seat.x,putAway)
 const y=lerp(lerp(seat.y,242,pickup),empty?473:seat.y,putAway)-
  Math.sin(Math.PI*pickup)*32-Math.sin(Math.PI*putAway)*20
 // The painted carton's folded spout is just below its left gable.
 const lx=-h*.20,ly=-h*.89
 const spoutX=x+lx*Math.cos(tilt)-ly*Math.sin(tilt),spoutY=y+lx*Math.sin(tilt)+ly*Math.cos(tilt)
 if(f>.45&&f<.72){
  ctx.strokeStyle='#fff5e0';ctx.lineWidth=2.8;ctx.lineCap='round'
  ctx.beginPath();ctx.moveTo(spoutX,spoutY);ctx.quadraticCurveTo(spoutX-3,spoutY+12,1140,260);ctx.stroke()
 }
 prop('new-milk-carton',x,y,h,tilt)
}
