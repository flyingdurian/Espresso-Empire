import {sizes,type Size,type Cup} from './bench.ts'
export const rack:{cup:Cup;x:number;h:number;short:string}[]=[
 {cup:'demi',x:62,h:53,short:'Demitasse'},{cup:'mug',x:156,h:69,short:'Blue mug'},
 {cup:'glass',x:252,h:78,short:'Latte glass'},{cup:'bowl',x:352,h:50,short:'Cappuccino bowl'},
 {cup:'tall',x:451,h:82,short:'Tall glass'},{cup:'paper',x:554,h:85,short:'Paper cup'},{cup:'clear',x:650,h:85,short:'Clear cup'}]
export type CupBay={cup:Cup;size:Size;x:number;y:number;h:number}
export const bays:CupBay[]=[
 ...rack.slice(0,5).map((r,i)=>({cup:r.cup,size:'Medium' as Size,x:92+i*130,y:847,h:r.h})),
 ...(['paper','clear'] as const).flatMap((cup,row)=>sizes.map((size,i)=>({cup,size,x:804+i*144,y:762+row*82,h:48+i*8})))
]
export const bayId=(b:Pick<CupBay,'cup'|'size'>)=>b.cup+'-'+b.size
export const frontLift=179
export const saucers=[820,1000], towelX=[1285,1405]
export const guestX={Door:[667,1075],Window:[542,993]}
export const cupRim:Record<Cup,[number,number]>={demi:[.492,.14],mug:[.371,.132],glass:[.389,.093],tall:[.487,.099],bowl:[.461,.166],paper:[.5,.2],clear:[.5,.2]}
export const ease=(t:number)=>{const n=Math.min(1,Math.max(0,t));return n*n*(3-2*n)}
