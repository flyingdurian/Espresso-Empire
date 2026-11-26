import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Bench,ingredientStation,type Config,type Station} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {actionTimers,timerProgress} from '../src/counter/action-timers.ts'
import {iceOriginalRim,iceRim,iceWidthScale} from '../src/counter/ice-service.ts'
const data=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(data<Config>('counter'),data<Tuning>('tuning'))
const step=(g:Bench,n:number)=>{for(let i=0;i<n;i++)g.step()}
test('requested base action durations and timer progress use the same simulation cycles',()=>{
 const g=game(),expected:Partial<Record<Station,number>>={tea:10,blend:10,short:10,standard:10,water:6,grinder:4,compact:20,pesto:3,steamer:10,microwave:10,oven:20,press:15,refillMilk:6,syrup:1.5,coldmilk:.85,refillIce:10,citrus:10,wash:15}
 for(const [station,seconds] of Object.entries(expected)){
  assert.equal(g.data.stations[station as Station],seconds)
  const job=g.cycle(station as Station),duration=g.ticks(seconds)
  assert.equal(job.end-job.start,duration)
  assert.deepEqual(timerProgress(job,job.start,g.data.tickMs),{seconds:Math.ceil(duration*g.data.tickMs/1000),fraction:0})
  assert.deepEqual(timerProgress(job,job.end,g.data.tickMs),{seconds:0,fraction:1})
 }
 for(const syrup of ['caramel','vanilla','cocoa','matcha','cherry'] as const)assert.equal(ingredientStation(syrup),'syrup')
 assert.equal(ingredientStation('water'),'water');assert.equal(ingredientStation('coldmilk'),'coldmilk')
})
test('pesto clock blocks only its own plate and does not restart or finish early',()=>{
 const g=game();g.command({action:'sandwich',slot:0});g.command({action:'sandwich',slot:1});g.command({action:'pesto',slot:0})
 const job=g.pressSlots[0].pestoJob!;assert.ok(job);assert.equal(actionTimers(g).find(x=>x.id==='pesto/0')?.end,job.end)
 g.command({action:'pesto',slot:0});assert.equal(g.pressSlots[0].pestoJob,job)
 g.command({action:'press',slot:0});assert.equal(g.pressSlots[0].state,'loaded')
 g.command({action:'press'});assert.equal(g.pressSlots[1].state,'cooking')
 step(g,g.ticks(3)-1);assert.equal(g.pressSlots[0].pesto,false);step(g,1);assert.equal(g.pressSlots[0].pesto,true);assert.equal(g.pressSlots[0].pestoJob,undefined)
 assert.ok(!actionTimers(g).some(x=>x.id==='pesto/0'))
})
test('water has separate approach and return, and neither cold milk nor syrup shows a badge',()=>{
 const g=game();g.command({action:'cup',cup:'paper',size:'Small',slot:0});g.command({action:'add',add:'water',slot:0})
 const job=g.pouringAt(0)!;assert.equal(job.end-job.start,g.ticks(6));assert.equal(job.start-g.tick,g.ticks(.45));assert.equal(actionTimers(g).find(x=>x.id==='pour/0')?.start,job.start)
 step(g,job.returnEnd!-g.tick-1);assert.equal(g.cups[0]?.add.includes('water'),false);step(g,1);assert.equal(g.cups[0]?.add.includes('water'),true)
 g.command({action:'add',add:'caramel',slot:0});const syrup=g.pouringAt(0)!;assert.equal(syrup.end-syrup.start,g.ticks(1.5));assert.ok(!actionTimers(g).some(x=>x.id==='pour/0'));step(g,g.ticks(1.5))
 g.command({action:'add',add:'coldmilk',slot:0});assert.ok(g.pouringAt(0));assert.ok(!actionTimers(g).some(x=>x.id==='pour/0'))
})
test('ice opening shrinks symmetrically without moving its center or changing capacity',()=>{
 assert.equal(iceWidthScale,.725);assert.equal(iceRim.w,iceOriginalRim.w*.725);assert.equal(iceRim.x+iceRim.w/2,iceOriginalRim.x+iceOriginalRim.w/2);assert.equal(game().data.capacity.ice,6)
})
test('only successful lid application creates a snap cycle for the actual vessel',()=>{
 const g=game();g.command({action:'cup',cup:'paper',size:'Small',slot:0})
 g.command({action:'lid',material:'paper'});assert.equal(g.snap,null)
 g.groups[0].pots[0]='standard';g.command({action:'pour',head:0,lane:0,slot:0});step(g,g.ticks(g.data.stations.transfer))
 const c=g.cups[0]!,stock=g.lidStock.paper;g.command({action:'lid',material:'clear'});assert.equal(g.snap,null)
 g.command({action:'lid',material:'paper'});const snap=g.snap as {uid:number;start:number;end:number}|null;assert.ok(snap);assert.equal(snap.uid,c.uid);assert.equal(c.lid,true);assert.equal(g.lidStock.paper,stock-1)
 g.command({action:'lid',material:'paper'});assert.equal(g.snap,snap);assert.equal(g.lidStock.paper,stock-1)
 step(g,g.ticks(g.data.stations.lid));assert.equal(g.snap,null)
})
test('ice refill is an exclusive ten-second cycle that never credits stock early',()=>{
 const g=game();g.ice=1;g.command({action:'cup',cup:'clear',size:'Small',slot:0});g.command({action:'refillIce'})
 const job=g.iceRefill!;assert.equal(job.end-job.start,g.ticks(10));g.command({action:'refillIce'});assert.equal(g.iceRefill,job)
 assert.equal(g.canDropPour({action:'add',add:'ice',slot:0}),false);assert.equal(actionTimers(g).find(x=>x.id==='ice-refill')?.end,job.end)
 step(g,g.ticks(10)-1);assert.equal(g.ice,1);step(g,1);assert.equal(g.ice,g.data.capacity.ice);assert.equal(g.iceRefill,null)
})
