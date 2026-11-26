// The same measured scoop follows a pickup, a free drag and the final pour.
type Point={x:number;y:number}
export const iceScoopHome={x:1407,y:709,angle:0,h:51}
const home=iceScoopHome
export const iceRim={x:1210,y:635,w:290,h:90}
export const iceAssets=['empire_ice_brass_rim','empire_ice_front_lip','empire_ice_scoop',...([1,2,3,4].map(n=>'empire_ice_cube_'+n))]
export const iceAssetPath=(id:string)=>'/empire_ice/'+id+'.webp'
const clamp=(x:number)=>Math.max(0,Math.min(1,x))
const smooth=(x:number)=>{const n=clamp(x);return n*n*(3-2*n)}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t
export function scoopPose(ageMs:number,pointer:Point|null){
 const dig=smooth(ageMs/140),lift=smooth((ageMs-140)/160)
 return {
  x:mix(home.x-56*dig,pointer?.x??home.x-45,lift),
  y:mix(home.y+6*dig,(pointer?.y??home.y-35)+13,lift),
  angle:mix(home.angle-.13*dig,-.15,lift),load:smooth((ageMs-75)/95)
 }
}
export type IceProp=(key:string,x:number,y:number,h:number,angle?:number,alpha?:number)=>void
export const icePortions=(size:string,large:number)=>size==='Large'?large:1
export const iceCubeCount=(portions:number)=>3*Math.max(1,Math.min(2,portions))
export const iceCubeStart=(index:number,count:number)=>index*.36/Math.max(1,count-1)
export function scoopWithIce(ctx:CanvasRenderingContext2D,prop:IceProp,x:number,y:number,h:number,angle:number,load:number,spill:number,portions=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle)
 prop('empire_ice_scoop',0,0,h)
 const offsets=[[-.26,-.20],[-.10,-.25],[-.19,-.39],[-.34,-.36],[.01,-.37],[-.16,-.51]].slice(0,iceCubeCount(portions))
 for(const [i,[xx,yy]] of offsets.entries()){
  const visibility=load*(1-clamp((spill-iceCubeStart(i,offsets.length))/.08))
  if(visibility>0)prop('empire_ice_cube_'+(i%3+1),h*xx,h*yy,h*(.29+i%3*.014),.21*(i%3-1),visibility)
 }
 ctx.restore()
}
/** A deterministic stack of seated cubes. Lower layers remain as upper layers disappear. */
export function iceSeats(stock:number,capacity:number){
 const amount=clamp(stock/Math.max(1,capacity)),seats:{x:number;y:number;h:number;angle:number;key:string;rank:number;priority:number}[]=[]
 // A seated base across the perspective well, then two raised layers. Rank controls
 // removal, not placement; every surviving cube keeps its exact position.
 const layers=[{rows:4,cols:9,lift:0,size:24},{rows:3,cols:8,lift:8,size:27},{rows:2,cols:6,lift:16,size:29}]
 let base=0
 for(const [level,l] of layers.entries()){
  const count=l.rows*l.cols
  for(let row=0;row<l.rows;row++)for(let col=0;col<l.cols;col++){
   const i=row*l.cols+col,u=(row+.65)/(l.rows+.3),v=(col+.65)/(l.cols+.3),j=Math.sin((base+i+1)*13.37)
   const start=1233+40*u+level*7,span=198+15*u-level*14
   seats.push({key:'empire_ice_cube_'+(1+(base+i)%4),x:start+span*v+j*3,y:678+30*u-l.lift-Math.cos(i*5+level)*2,h:l.size+u*4+j*2,angle:j*.50,rank:base+i,priority:level*3+Math.abs(v-.53)*1.8+Math.abs(u-.55)*.60+j*.035})
  }
  base+=count
 }
 // Depletion opens up the edges as well as lowering the pile, without moving surviving cubes.
 const ranked=[...seats].sort((a,b)=>a.priority-b.priority||a.rank-b.rank)
 ranked.forEach((p,i)=>{p.rank=i})
 const visible=Math.ceil(seats.length*amount)
 // Paint distant feet first, then higher strata, giving a stable piled silhouette.
 return seats.filter(p=>p.rank<visible)
}
// Interior of the authored shell, measured as normalized corners. The forward rim
// is separately painted over the contents by the scene compositor.
export const iceBasinCorners=[[.074,.075],[.759,.075],[.924,.778],[.185,.778]] as const
export function iceBasinClip(ctx:CanvasRenderingContext2D){
 ctx.beginPath();iceBasinCorners.forEach(([x,y],i)=>{const px=iceRim.x+x*iceRim.w,py=iceRim.y+y*iceRim.h;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)});ctx.closePath();ctx.clip()
}
export function iceWell(ctx:CanvasRenderingContext2D,prop:IceProp,stock:number,capacity:number){
 ctx.save();iceBasinClip(ctx)
 for(const p of iceSeats(stock,capacity))prop(p.key,p.x,p.y,p.h,p.angle)
 ctx.restore()
}
