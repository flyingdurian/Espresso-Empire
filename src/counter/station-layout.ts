import {pocketSeat,reserveHead} from './service-pass.ts'
import type {Cup,Size,Drink} from './bench.ts'
import {cupColumns} from './cup-stack-spec.ts'
export const stage={w:1672,h:941}
export const heads=[134,263,393]
export const brewPoint=(head:number,lane:number)=>head===reserveHead?pocketSeat('shots',lane):({x:heads[head]+(lane?26:-25),y:594})
export const cupsX=[713,837]
export const serveX=[736,994]
export const foodX=[951,1037]
export type Holder={cup:Cup;size:Size;x:number;y:number;h:number;w:number}
// Stock column anchors are separate from the original active-drink heights.
export const holders:Holder[]=cupColumns.map(c=>({cup:c.cup,size:c.size,x:c.x,y:c.y,
 h:({demi:87.75,mug:93.15,glass:87.75,bowl:70.2,tall:87.75,paper:c.size==='Large'?104.8:98,clear:c.size==='Large'?104.8:98})[c.cup],
 w:c.cup==='paper'||c.cup==='clear'?85:64}))
export function vesselHeight(cup:Cup,size:Size){
 const h=holders.find(v=>v.cup===cup&&(v.size===size||cup!=='paper'&&cup!=='clear'))
 return h?.h??holders.find(v=>v.cup===cup)!.h
}
export const milkSpouts={silky:{x:1165,y:372},airy:{x:1220,y:372}}
// Four visual compartments; only the two existing supply types are active.
export const miniRack=[{x:1482,y:248,food:'raw'},{x:1530,y:238,food:null},{x:1578,y:228,food:null},{x:1626,y:218,food:'panino'}] as const
export const foodBins={raw:{x:miniRack[0].x,y:miniRack[0].y-8},panino:{x:miniRack[3].x,y:miniRack[3].y-8}}
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
export const citrusPress={x:1588,y:775,h:130,carafe:{x:1582,y:765,h:40}}
export const finishSources={coldmilk:{x:1530,y:632,h:99},caramel:{x:1450,y:489,h:78},cocoa:{x:1499,y:497,h:78},vanilla:{x:1548,y:505,h:78},matcha:{x:1597,y:513,h:78},cherry:{x:1646,y:521,h:78}} as const

// Seat opaque feet on y=162; compensate for each authored sprite's transparent tail.
export const beanBags=[{key:'bean-ivory',x:82,y:171,h:96},{key:'bean-umber',x:200,y:171,h:96},{key:'bean-charcoal',x:316,y:171,h:96},{key:'bean-teal',x:429,y:174,h:96}]
export type HotStation='press'|'oven'
export type Carry={kind:'supply';station:HotStation}|{kind:'bakedSlot';station:HotStation;slot:number}|{kind:'pesto'}|{kind:'pot';head:number;lane:number}|{kind:'cup'|'food';slot:number}|{kind:'holder';index:number}|{kind:'add';add:import('./bench.ts').Add}|{kind:'handle'|'tamper'}|{kind:'beans';bag:number}
export const stageCupY=669
