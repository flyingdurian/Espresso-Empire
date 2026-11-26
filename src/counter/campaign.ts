import piazza from '../../public/data/piazza.json' with {type:'json'}
import forno from '../../public/data/forno.json' with {type:'json'}
import breakfast from '../../public/data/breakfast.json' with {type:'json'}
import campaign from '../../public/data/campaign.json' with {type:'json'}
import type {Config,Order} from './bench.ts'

export type UpgradeId='grinder'|'espresso'|'steamer'|'oven'
export const upgrades=campaign.upgrades as {id:UpgradeId;name:string;description:string;costs:number[]}[]
export type UpgradeRanks=Record<UpgradeId,number>
export type Progress={unlocked:number;bank:number;stars:number[];ranks:UpgradeRanks}
export const breakfastName=breakfast.name
export const piazzaShift=-2
export const piazzaName=piazza.name
export const lunchShift=-1
export const lunchName=forno.name
export function shiftName(level:number){return level===piazzaShift?piazzaName:level===lunchShift?lunchName:level===0?breakfastName:levels[level-1].name}
export const levels=campaign.levels

const KEY='via-bianca-lab-campaign-v1'
export const freshProgress=():Progress=>({unlocked:1,bank:0,stars:Array(levels.length).fill(0),ranks:{grinder:0,espresso:0,steamer:0,oven:0}})
export function loadProgress():Progress{
 try{
  const raw=localStorage.getItem(KEY);if(!raw)return freshProgress()
  const saved=JSON.parse(raw) as Partial<Progress>,out=freshProgress()
  out.unlocked=Math.max(1,Math.min(levels.length,Math.trunc(Number(saved.unlocked)||1)))
  out.bank=Math.max(0,Math.trunc(Number(saved.bank)||0))
  out.stars=levels.map((_,i)=>Math.max(0,Math.min(3,Math.trunc(Number(saved.stars?.[i])||0))))
  for(const u of upgrades)out.ranks[u.id]=Math.max(0,Math.min(u.costs.length,Math.trunc(Number(saved.ranks?.[u.id])||0)))
  return out
 }catch{return freshProgress()}
}
export function saveProgress(p:Progress){try{localStorage.setItem(KEY,JSON.stringify(p))}catch{/* Private windows may disable persistence. */}}
export function buyUpgrade(p:Progress,id:UpgradeId):boolean{
 const u=upgrades.find(v=>v.id===id)!,cost=u.costs[p.ranks[id]]
 if(cost===undefined||p.bank<cost)return false
 p.bank-=cost;p.ranks[id]++;return true
}
export function completeLevel(p:Progress,level:number,stars:number,coins:number){
 p.bank+=Math.max(0,Math.floor(coins))
 if(level<1)return
 p.stars[level-1]=Math.max(p.stars[level-1],stars)
 if(stars>0&&level<levels.length)p.unlocked=Math.max(p.unlocked,level+1)
}

const {names,speed,archetypeFactors}=campaign
const archetypes=campaign.archetypes as NonNullable<Order['archetype']>[]

export function levelConfig(base:Config,level:number,ranks:UpgradeRanks):Config{
 const stage=levels[Math.max(0,Math.min(levels.length-1,level-1))],cfg=structuredClone(base)
 cfg.seed=base.seed+level*campaign.seedStep
 cfg.stations.grinder=Number((base.stations.grinder*Math.pow(speed.grinder,ranks.grinder)).toFixed(2))
 cfg.stations.short=Number((base.stations.short*Math.pow(speed.espresso,ranks.espresso)).toFixed(2))
 cfg.stations.standard=Number((base.stations.standard*Math.pow(speed.espresso,ranks.espresso)).toFixed(2))
 cfg.stations.steamer=Number((base.stations.steamer*Math.pow(speed.steamer,ranks.steamer)).toFixed(2))
 cfg.stations.oven=Number((base.stations.oven*Math.pow(speed.oven,ranks.oven)).toFixed(2))
 if(level===0||level===lunchShift||level===piazzaShift){
  const service=level===piazzaShift?piazza:level===lunchShift?forno:breakfast
  if(level===lunchShift)cfg.startView='Kitchen'
  cfg.orders=structuredClone(service.orders) as Order[]
  // Longer manual equipment cycles need additional time at the counter.
  cfg.orders.forEach(o=>{o.patience=Math.ceil(o.patience*1.4)})
  cfg.partialRelief=service.partialRelief
  cfg.ovenGrace=service.ovenGrace
  cfg.pressGrace=service.pressGrace
  cfg.ovenWarning=service.ovenWarning
  cfg.jitterSeconds=0
  return cfg
 }
 cfg.orders=Array.from({length:stage.tickets},(_,i):Order=>{
  const template=base.orders[i%base.orders.length],archetype=archetypes[i%archetypes.length],f=archetypeFactors[archetype]
  const drink=stage.menu[i%stage.menu.length]
  const modifiers:Partial<Record<string,NonNullable<Order['toppings']>>>={latte:['caramelDrizzle'],cappuccino:['cocoaDust'],vanillalatte:['strawberryDrizzle'],hotcocoa:['cinnamonDust'],mocha:['cinnamonDust'],frappe:['caramelDrizzle']}
  const toppings=level>=4?modifiers[drink]:undefined
  const withFood=stage.foods>0&&i%3===1&&Math.floor(i/3)<stage.foods
  const food=withFood?(['brownie','baked','grilled','pesto'] as const)[Math.floor(i/3)%4]:null
  const toGo=level>=4?(i%3!==0):i%3===1
  return {...template,name:names[i%names.length],look:campaign.looks[i%campaign.looks.length],end:i%2?'Window':'Door',spot:Math.floor(i/2)%2,
   mode:toGo?'To go':'Dine in',size:toGo?(i%2===0?'Large':'Small'):'Medium',
   drink,food,toppings,after:i*stage.pace,patience:Math.round(template.patience*stage.patience*f.patience),archetype,tipMultiplier:f.tip}
 })
 return cfg
}
