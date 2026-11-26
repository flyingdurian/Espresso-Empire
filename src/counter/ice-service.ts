// The same measured scoop follows a pickup, a free drag and the final pour.
type Point={x:number;y:number}
const home={x:1446,y:703}
const clamp=(x:number)=>Math.max(0,Math.min(1,x))
const smooth=(x:number)=>{const n=clamp(x);return n*n*(3-2*n)}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t
export function scoopPose(ageMs:number,pointer:Point|null){
 const dig=smooth(ageMs/140),lift=smooth((ageMs-140)/160)
 return {
  x:mix(home.x-56*dig,pointer?.x??home.x-45,lift),
  y:mix(home.y+6*dig,(pointer?.y??home.y-35)+13,lift),
  angle:mix(-.15-.19*dig,-.15,lift),load:smooth((ageMs-75)/95)
 }
}
export type IceProp=(key:string,x:number,y:number,h:number,angle?:number,alpha?:number)=>void
export function scoopWithIce(ctx:CanvasRenderingContext2D,prop:IceProp,x:number,y:number,h:number,angle:number,load:number,spill:number){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle)
 prop('scoop-empty',0,0,h)
 const offsets=[[-.59,-.24],[-.39,-.26],[-.47,-.43]]
 for(const [i,[xx,yy]] of offsets.entries()){
  const visibility=load*(1-clamp((spill-i*.18)/.08))
  if(visibility>0)prop('cube-'+(i+1),h*xx,h*yy,h*(.29+i*.014),.21*(i-1),visibility)
 }
 ctx.restore()
}
export function iceWell(ctx:CanvasRenderingContext2D,prop:IceProp,stock:number,capacity:number){
 const full=clamp(stock/Math.max(1,capacity)),total=45
 ctx.save();ctx.beginPath();ctx.moveTo(1238,654);ctx.lineTo(1375,650);ctx.lineTo(1460,700);ctx.lineTo(1295,708);ctx.closePath();ctx.clip()
 // Emptying exposes steel between the cubes. Keep each remaining cube in its own seat.
 for(let row=0;row<5;row++)for(let col=0;col<9;col++){
  const i=row*9+col
  if((i*17%total)>=Math.ceil(total*full))continue
  const u=(row+.5)/5,v=(col+.5)/9,offset=Math.sin(i*13.37)
  prop('cube-'+(1+i%3),1238+65*u+(136+23*u)*v+offset*3,658+48*u-Math.cos(i*5)*2,16+u*6+offset*2,offset*.33)
 }
 ctx.restore()
}
