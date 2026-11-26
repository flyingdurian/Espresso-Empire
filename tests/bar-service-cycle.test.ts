import assert from 'node:assert/strict'
import test from 'node:test'
import {Bench,type Config} from '../src/counter/bench.ts'
import {doseVolume} from '../src/counter/espresso-bar.ts'
import {filterPose} from '../src/counter/filter-pose.ts'
import {readData} from '../scripts/read.ts'

test('spent group requires manual knock, grinder, purge, attachment and click-lock; other groups still work',async()=>{
 const data:Config=await readData('counter.json'),g=new Bench(data,await readData('tuning.json'))
 const run=(seconds:number)=>{for(let i=0;i<g.ticks(seconds);i++)g.step()}
 g.groups[1].pulls=0;g.beans=0;g.command({action:'release',head:1})
 assert.equal(g.serviceHead,1);assert.equal(g.basket,'released');assert.equal(g.groups[1].flush,null);assert.ok(g.groups[1].dirty)
 g.command({action:'pick'});g.command({action:'knock'});run(data.stations.knock);assert.equal(g.basket,'clean')
 g.command({action:'pick'});g.command({action:'grinderLever'});assert.equal(g.grind,null)
 g.command({action:'beans',bag:0});run(data.stations.load);g.command({action:'grinderLever'});assert.ok(g.grind);assert.equal(g.beans,data.capacity.hopper-3)
 g.command({action:'pull',head:0,shot:'short'});run(data.stations.grinder);assert.equal(g.basket,'dosed');run(data.stations.short-data.stations.grinder);assert.equal(g.groups[0].pots[0],'short')
 assert.equal(filterPose(g,g.tick).x,255);g.command({action:'attach',head:1});assert.equal(g.basket,'dosed')
 g.command({action:'purge',head:1});g.command({action:'attach',head:1});assert.equal(g.basket,'dosed');run(data.stations.purge)
 g.command({action:'attach',head:0});assert.equal(g.basket,'dosed');g.command({action:'attach',head:1});assert.equal(g.basket,'attached')
 g.command({action:'serviceGroup',head:1});assert.equal(g.basket,'locking');run(data.stations.handleLock);assert.equal(g.basket,'mounted');assert.equal(g.groups[1].pulls,3)
 assert.equal(doseVolume('short'),doseVolume('standard'))
})
