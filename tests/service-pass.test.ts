import assert from 'node:assert/strict'
import test from 'node:test'
import {Bench,type Config,type Shot} from '../src/counter/bench.ts'
import {reserveHead,servicePass} from '../src/counter/service-pass.ts'
import {readData} from '../scripts/read.ts'
import type {Tuning} from '../src/content/model.ts'

const config:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
const run=(g:Bench,time:number)=>{for(let i=0;i<g.ticks(time);i++)g.step()}
test('a full mixed shot reserve preserves portions and frees each group for the next extraction',()=>{
 const g=new Bench(structuredClone(config),tuning)
 for(let i=0;i<servicePass.shots.capacity;i++){
  const shot:Shot=i%2?'short':'standard',head=i%g.groups.length
  g.command({action:'pull',shot,head,lane:0});run(g,config.stations[shot])
  assert.equal(g.groups[head].pots[0],shot)
  g.command({action:'parkShot',head,lane:0,pocket:i})
  assert.equal(g.groups[head].pots[0],null);assert.equal(g.shotReserve[i],shot)
 }
 g.command({action:'pull',shot:'short',head:0,lane:0});run(g,config.stations.short)
 g.command({action:'parkShot',head:0,lane:0,pocket:0})
 assert.equal(g.groups[0].pots[0],'short');assert.equal(g.shotReserve[0],'standard')
 g.command({action:'cup',cup:'demi'})
 g.command({action:'dropPour',pour:{action:'pour',head:reserveHead,lane:1,slot:0}})
 assert.equal(g.shotReserve[1],null)
 g.command({action:'parkShot',head:0,lane:0,pocket:1});assert.equal(g.groups[0].pots[0],'short')
 run(g,config.stations.transfer);assert.equal(g.recipe(g.cups[0]),'ristretto')
 g.command({action:'parkShot',head:0,lane:0,pocket:1});assert.equal(g.shotReserve[1],'short')
})
test('food wells preserve individual pesto portions, capacity, and partial delivery',()=>{
 const cfg=structuredClone(config)
 cfg.orders=[{...cfg.orders[0],drink:'espresso',food:'pesto',after:0,patience:200,end:'Door'}]
 const g=new Bench(cfg,tuning)
 for(let i=0;i<5;i++){
  g.command({action:'sandwich',slot:0})
  if(i%2===1)g.command({action:'pesto',slot:0})
  g.command({action:'press',slot:0});run(g,cfg.stations.press)
  g.command({action:'bankHot',station:'press',slot:0})
 }
 assert.equal(g.pressSlots[0].state,'ready')
 assert.deepEqual(g.foodReserve.filter(Boolean).map(f=>f!.food),['grilled','pesto','grilled','pesto'])
 const slot=g.towel.length+1
 g.command({action:'serve',guest:0,kind:'food',slot})
 assert.equal(g.guests[0].gotFood,true);assert.equal(g.foodAt(slot),null);assert.equal(g.guests[0].state,'waiting')
 g.command({action:'bankHot',station:'press',slot:0});assert.equal(g.foodAt(slot)?.food,'grilled')
 for(let i=0;i<=servicePass.pastries.capacity;i++){
  g.command({action:'load',slot:0});g.command({action:'oven',slot:0});run(g,cfg.stations.oven)
  g.command({action:'bankHot',station:'oven',slot:0})
 }
 assert.equal(g.foodReserve.filter(f=>f?.food==='baked').length,servicePass.pastries.capacity);assert.equal(g.warm,1)
})
