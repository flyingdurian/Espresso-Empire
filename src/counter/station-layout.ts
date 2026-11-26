import {pocketSeat,reserveHead} from './service-pass.ts'
import type {Cup,Size,Drink} from './bench.ts'
export const stage={w:1672,h:941}
export const heads=[134,263,393]
export const brewPoint=(head:number,lane:number)=>head===reserveHead?pocketSeat('shots',lane):({x:heads[head]+(lane?26:-25),y:594})
export const cupsX=[713,837]
export const serveX=[736,994]
export const foodX=[951,1037]
export type Holder={cup:Cup;size:Size;x:number;y:number;h:number;w:number}
export const holders:Holder[]=[
 {cup:'demi',size:'Medium',x:80,y:843,h:87.75,w:110},{cup:'mug',size:'Medium',x:196,y:843,h:93.15,w:110},
 {cup:'glass',size:'Medium',x:103,y:928,h:87.75,w:164},{cup:'bowl',size:'Medium',x:310,y:843,h:70.2,w:110},{cup:'tall',size:'Medium',x:282,y:928,h:87.75,w:164},
 ...(['paper','clear'] as const).flatMap((cup,row)=>(['Small','Large'] as const).map((size,i)=>({cup,size,x:[656,744,918,1004][row*2+i],y:879,h:i?104.8:98,w:85})))
]
export function vesselHeight(cup:Cup,size:Size){
 const h=holders.find(v=>v.cup===cup&&(v.size===size||cup!=='paper'&&cup!=='clear'))
 return h?.h??holders.find(v=>v.cup===cup)!.h
}
export const milkSpouts={silky:{x:1159,y:373},airy:{x:1214,y:369}}
export const foodBins={raw:{x:1511,y:234},panino:{x:1605,y:220}}
export const fridge={x:1559,y:306,w:181,h:108}
export const ounces=(size:Size)=>size==='Large'?'16 oz':'8 oz'
export function cupArt(c:Drink){
 if(c.lid)return c.cup+(c.add.includes('tea')?'-tea-lid':'-lid')
 if(c.add.includes('tea')&&['tall','clear'].includes(c.cup))return c.cup+'-tea'
 if(c.cup==='bowl'&&c.add.includes('milk')&&!c.add.includes('foam'))return 'bowl-milk'
 if(c.add.some(a=>a!=='ice'))return c.cup+'-full'
 return c.cup+(c.poured?'-shot':'-empty')
}

export const syrupKeys=['caramel','cocoa','vanilla','matcha','cherry'] as const
export type Syrup=typeof syrupKeys[number]
export function isSyrup(k:string):k is Syrup{return (syrupKeys as readonly string[]).includes(k)}
export const citrusPress={x:1615,y:645,h:105,carafe:{x:1609,y:642,h:38}}
export const finishSources={coldmilk:{x:1530,y:632,h:99},caramel:{x:1441,y:491,h:77},cocoa:{x:1492,y:497,h:78},vanilla:{x:1543,y:503,h:79},matcha:{x:1594,y:509,h:80},cherry:{x:1645,y:515,h:81}} as const

export const beanBags=[{key:'bean-ivory',x:82},{key:'bean-umber',x:200},{key:'bean-charcoal',x:316},{key:'bean-teal',x:429}]
export type HotStation='press'|'oven'
export type Carry={kind:'supply';station:HotStation}|{kind:'bakedSlot';station:HotStation;slot:number}|{kind:'pesto'}|{kind:'pot';head:number;lane:number}|{kind:'cup'|'food';slot:number}|{kind:'holder';index:number}|{kind:'add';add:import('./bench.ts').Add}|{kind:'handle'|'tamper'}|{kind:'beans';bag:number}
export const stageCupY=669
