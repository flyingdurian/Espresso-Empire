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
export const icePortions=(size:string,large:number)=>size==='Large'?large:1
export const iceCubeCount=(portions:number)=>3*Math.max(1,Math.min(2,portions))
export const iceCubeStart=(index:number,count:number)=>index*.36/Math.max(1,count-1)
export function scoopWithIce(ctx:CanvasRenderingContext2D,prop:IceProp,x:number,y:number,h:number,angle:number,load:number,spill:number,portions=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle)
 prop('scoop-empty',0,0,h)
 const offsets=[[-.59,-.24],[-.39,-.26],[-.47,-.43],[-.63,-.43],[-.31,-.45],[-.47,-.62]].slice(0,iceCubeCount(portions))
 for(const [i,[xx,yy]] of offsets.entries()){
  const visibility=load*(1-clamp((spill-iceCubeStart(i,offsets.length))/.08))
  if(visibility>0)prop('cube-'+(i%3+1),h*xx,h*yy,h*(.29+i%3*.014),.21*(i%3-1),visibility)
 }
 ctx.restore()
}
/** A deterministic stack of seated cubes. Lower layers remain as upper layers disappear. */
export function iceSeats(stock:number,capacity:number){
 const amount=clamp(stock/Math.max(1,capacity)),seats:{x:number;y:number;h:number;angle:number;key:string;rank:number}[]=[]
 for(let row=0;row<5;row++)for(let col=0;col<9;col++){
  const i=row*9+col,u=(row+.5)/5,v=(col+.5)/9,jitter=Math.sin(i*13.37)
  seats.push({key:'cube-'+(1+i%3),x:1238+65*u+(136+23*u)*v+jitter*3,y:658+48*u-Math.cos(i*5)*2,h:18+u*6+jitter*2,angle:jitter*.33,rank:i*17%45})
 }
 for(let row=0;row<3;row++)for(let col=0;col<7;col++){
  const i=row*7+col,u=(row+1)/5,v=(col+1)/8,jitter=Math.sin(i*4.13)
  seats.push({key:'cube-'+(1+i%3),x:1238+65*u+(136+23*u)*v+jitter*5,y:651+48*u-Math.cos(i*5)*2,h:21+u*7,angle:jitter*.42,rank:45+i*8%21})
 }
 return seats.filter(p=>p.rank<Math.ceil(seats.length*amount))
}
export function iceWell(ctx:CanvasRenderingContext2D,prop:IceProp,stock:number,capacity:number){
 ctx.save();ctx.beginPath();ctx.moveTo(1238,635);ctx.lineTo(1375,630);ctx.lineTo(1460,700);ctx.lineTo(1295,708);ctx.closePath();ctx.clip()
 for(const p of iceSeats(stock,capacity))prop(p.key,p.x,p.y,p.h,p.angle)
 ctx.restore()
}
