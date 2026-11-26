import assert from 'node:assert/strict'
import test from 'node:test'
import {Bench,type Config} from '../src/counter/bench.ts'
import {completeLevel,freshProgress,piazzaShift} from '../src/counter/campaign.ts'
import type {Tuning} from '../src/content/model.ts'
import {readData} from '../scripts/read.ts'

test('a completed meal pays its price once and remaining patience sets the tip',async()=>{
 const cfg:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
 cfg.orders=[{...cfg.orders[0],food:'brownie',drink:null,end:'Door',after:0,tipMultiplier:1}]
 for(const remaining of [.95,.35,.05]){
  const g=new Bench(cfg,tuning)
  while(g.guests[0].state!=='waiting')g.step()
  g.guests[0].left=Math.floor(g.ticks(cfg.orders[0].patience)*remaining)
  g.command({action:'brownie'});g.command({action:'serve',guest:0,kind:'food',slot:g.foodIndex})
  const zone=remaining>=tuning.zoneBoundaries[1]?2:remaining>=tuning.zoneBoundaries[0]?1:0
  const price=cfg.foods.brownie.price,tip=Math.round(price*tuning.tipFractions[zone])
  g.command({action:'serve',guest:0,kind:'food',slot:g.foodIndex})
  assert.deepEqual(g.lastPayment,{guest:0,price,tip,bonus:tuning.comboBonuses[0],at:g.tick})
  assert.equal(g.sales,price);assert.equal(g.tips,tip);assert.equal(g.coins,price+tip+g.bonuses)
  const profile=freshProgress(),stars=[...profile.stars]
  completeLevel(profile,piazzaShift,g.stars,g.coins)
  assert.equal(profile.bank,g.coins);assert.deepEqual(profile.stars,stars)
 }
})
