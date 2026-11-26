import assert from 'node:assert/strict'
import test from 'node:test'
import {Bench,type Config} from '../src/counter/bench.ts'
import {doseVolume} from '../src/counter/espresso-bar.ts'
import {filterPose} from '../src/counter/filter-pose.ts'
import {readData} from '../scripts/read.ts'

test('a spent group auto-knocks, rinses and docks; grinder and final lock wait for the barista',async()=>{
 const data:Config=await readData('counter.json')
 const g=new Bench(data,await readData('tuning.json'))
 const run=(seconds:number)=>{for(let i=0;i<g.ticks(seconds);i++)g.step()}
 g.groups[1].pulls=0;g.beans=0
 g.command({action:'serviceGroup',head:1})
 assert.equal(g.serviceHead,1);assert.ok(g.groups[1].flush)
 run(data.stations.handleTravel);assert.equal(g.basket,'knocking')
 run(data.stations.knock+data.stations.handleTravel);assert.equal(g.basket,'emptyHeld')
 assert.equal(filterPose(g,g.tick).x,255)
 g.command({action:'grinderLever'});assert.equal(g.grind,null)
 g.command({action:'beans',bag:0});run(data.stations.load);g.command({action:'grinderLever'})
 assert.ok(g.grind);assert.equal(g.beans,0)
 g.command({action:'pull',head:0,shot:'short'});run(data.stations.grinder)
 assert.equal(g.basket,'dosed');assert.equal(g.groups[0].pots[0],'short');assert.equal(g.groups[1].dirty,false)
 g.command({action:'grinderLever'});run(data.stations.handleTravel);assert.equal(g.basket,'tamping')
 run(data.stations.load);assert.equal(g.basket,'tamped')
 g.command({action:'serviceGroup',head:0});assert.equal(g.basket,'tamped')
 g.command({action:'serviceGroup',head:1});assert.equal(g.basket,'locking')
 run(data.stations.handleLock);assert.equal(g.basket,'mounted');assert.equal(g.groups[1].pulls,data.capacity.basketDoses)
 assert.equal(doseVolume('short'),doseVolume('standard'))
})
