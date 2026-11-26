import type {Bench} from './bench.ts'
import {serveX} from './station-layout.ts'

export const gaitAtlases=[...'abcdef'].map(id=>'gait-'+id).concat('gait-e-side','gait-f-side')
export const gaitFrames=12
type Guest=Bench['guests'][number]
type Mark={x:number;y:number;h:number}
const mix=(a:number,b:number,u:number)=>a+(b-a)*u
const unit=(u:number)=>Math.max(0,Math.min(1,u))
const smooth=(u:number)=>{const p=unit(u);return p*p*(3-2*p)}
const walkState=(state:Guest['state'])=>state==='walking'||state==='joining'
export const leavingCounter=(state:Guest['state'])=>state==='leaving'||state==='paid'

/** Ground-plane blocking. Advancing from the queue starts exactly where the guest was standing.
 * The outbound path crosses the near aisle and carries the actor entirely behind the side jamb. */
export function guestWalk(o:{spot:number;look:string}, guest:Pick<Guest,'state'|'fromLine'>, age:number, entrance:number,departure:number,stride:number){
 const left=o.spot===0,frontFacing=o.look==='e'||o.look==='f'
 const counter:Mark={x:serveX[o.spot],y:643,h:413}
 const line:Mark={x:left?810:923,y:504,h:246}
 const doorway:Mark={x:frontFacing?counter.x+(left?-29:29):left?469:1165,y:445,h:168}
 const out:Mark={x:left?414:1232,y:614,h:358}
 const departing=leavingCounter(guest.state),inLine=guest.state==='line'||guest.state==='joining'
 const start=departing?counter:walkState(guest.state)?guest.fromLine?line:doorway:inLine?line:counter
 const end=departing?out:inLine?line:counter
 // Keep a served item in the customer's hand through its arrival at the palm.
 const progress=departing?unit((age/departure-.4)/.60):walkState(guest.state)?unit(age/entrance):1
 const travelling=(walkState(guest.state)&&progress<1)||(departing&&progress>0)
 const eased=smooth(progress)
 const x=mix(start.x,end.x,eased),y=mix(start.y,end.y,eased),h=mix(start.h,end.h,eased)
 const forward=departing||!frontFacing
 const direction=end.x>=start.x?1:-1
 // One stride advances a fixed fraction of body height. The integral keeps cadence
 // tied to ground covered as the actor grows in perspective and settles at the counter.
 const distance=Math.hypot(end.x-start.x,(end.y-start.y)*1.8)
 const perspective=end.h===start.h?eased/start.h:Math.log(h/start.h)/(end.h-start.h)
 const cycles=distance*perspective*(forward?1.27:1.85)*stride
 const step=cycles*Math.PI*2
 const turn=travelling?(departing?smooth(progress/.13):smooth((1-progress)/.085)):0
 return {x,y,h,travelling,turn,
  side:departing&&frontFacing,flip:forward&&direction<0,frame:Math.floor(cycles*gaitFrames)%gaitFrames,
  sway:travelling?Math.sin(step)*h*.004:0,dip:travelling?Math.sin(step)**2*h*.008:0}
}

export function drawGait(ctx:CanvasRenderingContext2D,atlas:HTMLImageElement,x:number,y:number,
 h:number,frame:number,flip:boolean,tilt:number){
 const fw=atlas.width/4,fh=atlas.height/3,w=h*fw/fh
 ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(flip?-1:1,1)
 ctx.drawImage(atlas,frame%4*fw,Math.floor(frame/4)*fh,fw,fh,-w/2,-h,w,h)
 ctx.restore()
}
