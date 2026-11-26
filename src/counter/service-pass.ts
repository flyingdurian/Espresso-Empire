import stations from '../../public/data/service-pass.json' with {type:'json'}
import type {HotBay} from './bench.ts'
export const servicePass=stations
// The staging rack is a separate source from every espresso group.
export const reserveHead=-1
export const juiceRack={x:1328,y:821,w:328,h:38,capacity:4}
export function juiceSeat(i:number){return {x:juiceRack.x+juiceRack.w*(i+.5)/juiceRack.capacity,y:851,h:76}}
export function juiceTouch(i:number){const p=juiceSeat(i);return {x:p.x,y:p.y-37,w:juiceRack.w/juiceRack.capacity-6,h:74}}

export const foodBay=(bay:HotBay)=>bay==='oven'?stations.pastries:stations.panini
export const bayFirst=(bay:HotBay)=>bay==='press'?0:stations.panini.capacity
export const passFoodCount=stations.panini.capacity+stations.pastries.capacity

export function pocketSeat(section:keyof Pick<typeof stations,'shots'|'panini'|'pastries'>,index:number){
 const {capacity,columns,well}=stations[section]
 const rows=Math.ceil(capacity/columns),row=Math.floor(index/columns),column=index%columns
 const w=well.w*.88/columns,h=well.h*.76/rows
 return {x:well.x+well.w*.06+w*(column+.5),y:well.y+well.h*.12+h*(row+.70),w,h}
}
export function frontFoodSeat(slot:number,towel:number){
 const i=slot-towel
 if(i<0)return {x:slot?813:727,y:718,h:43}
 const section=i<stations.panini.capacity?'panini':'pastries'
 const seat=pocketSeat(section,section==='panini'?i:i-stations.panini.capacity)
 return {x:seat.x,y:seat.y+4,h:section==='panini'?28:27}
}

/** A named pocket never redirects to another pocket. Generic rack deposits still use first-free. */
export function chooseShotPocket(count:number,free:(i:number)=>boolean,preferred?:number):number{
 if(preferred!==undefined)return Number.isInteger(preferred)&&preferred>=0&&preferred<count&&free(preferred)?preferred:-1
 for(let i=0;i<count;i++)if(free(i))return i
 return -1
}

/** Same jump profile as oven loading; the shot lands precisely at its pocket seat. */
export function shotReserveArc(from:{x:number;y:number},to:{x:number;y:number},progress:number){
 const p=Math.max(0,Math.min(1,progress))
 return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p-Math.sin(Math.PI*p)*60,angle:Math.sin(Math.PI*p)*.08}
}
