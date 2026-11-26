import {carafeTouch} from '../src/counter/galley-layout.ts'
import {iceTouch} from '../src/counter/ice-service.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Bench,type Config} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {canDrop} from '../src/counter/drop-eligibility.ts'
import {juiceRack,juiceSeat,juiceTouch,servicePass,pocketSeat} from '../src/counter/service-pass.ts'
import {reserveRecess,reserveShell,reservePocket,reserveLip} from '../src/counter/reserve-depth.ts'
import {citrusTouch,shotPocketTouch,foodWellTouch,type TouchBox} from '../src/counter/touch-layout.ts'
import {tool} from '../src/counter/drink-motion.ts'
const data=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(data<Config>('counter'),data<Tuning>('tuning'))
const overlap=(a:TouchBox,b:TouchBox)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2
const tick=(g:Bench,secs:number)=>{for(let i=0;i<g.ticks(secs);i++)g.step()}
test('four juice seats have exclusive touch ownership clear of press, ice and existing carafes',()=>{
 const seats=Array.from({length:juiceRack.capacity},(_,i)=>juiceTouch(i))
 const existing=[...Object.values(citrusTouch()),iceTouch]
 assert.equal(seats.length,4);assert.deepEqual(carafeTouch('tea'),seats[2]);assert.deepEqual(carafeTouch('cold'),seats[1])
 for(const [i,a] of seats.entries()){
  for(const b of [...seats.slice(i+1),...existing])assert.equal(overlap(a,b),false)
  assert.deepEqual(tool('orange',0,i).home,juiceSeat(i))
 }
})
test('juice drops require usable seats; large drinks cannot pool partial pitchers or consume from press',()=>{
 const g=game();g.command({action:'cup',cup:'clear',size:'Large',slot:0});g.orangeDock=3;g.orangeReserve[0]=0;g.orangeReserve[3]=1
 assert.equal(canDrop(g,{kind:'add',add:'orange'},'saucer/0'),false)
 assert.equal(canDrop(g,{kind:'juicePitcher',from:-1},'juiceSeat/0'),false)
 assert.equal(canDrop(g,{kind:'juicePitcher',from:-1},'juiceSeat/3'),false);g.orangeReserve[3]=null;assert.equal(canDrop(g,{kind:'juicePitcher',from:-1},'juiceSeat/3'),true)
 g.command({action:'moveOrange',from:-1,to:3})
 assert.equal(canDrop(g,{kind:'add',add:'orange',pitcher:0},'saucer/0'),false)
 assert.equal(canDrop(g,{kind:'add',add:'orange',pitcher:3},'saucer/0'),true)
 g.command({action:'dropPour',pour:{action:'add',add:'orange',slot:0,pitcher:3}})
 assert.equal(g.orangeReserve[3],1);assert.equal(g.orangeReserve[0],0)
 tick(g,g.data.stations.finish);assert.deepEqual(g.cups[0]?.add,['orange'])
})
test('a depleted pitcher cannot be removed while its pour animation is active',()=>{
 const g=game();g.orangeDock=null;g.orangeReserve[3]=1;g.command({action:'cup',cup:'clear',size:'Small',slot:0})
 g.command({action:'add',add:'orange',pitcher:3,slot:0});assert.equal(g.orangeReserve[3],0)
 assert.equal(g.canMoveOrange(3,-1),false);tick(g,g.data.stations.finish);assert.equal(g.canMoveOrange(3,-1),true)
 g.command({action:'moveOrange',from:3,to:-1});assert.equal(g.orangeDock,0);assert.equal(g.orangeReserve[3],null)
})
test('recess floors enclose existing item seats without altering pocket hitboxes or capacity',()=>{
 for(const section of ['shots','panini','pastries'] as const)for(let i=0;i<servicePass[section].capacity;i++){
  const r=reserveRecess(section,i),p=pocketSeat(section,i),hit=section==='shots'?shotPocketTouch(i):foodWellTouch(section,i)
  assert.equal(r.seatX,p.x);assert.equal(r.seatY,p.y);assert.equal(hit.x,p.x)
  assert.ok(r.y<r.seatY&&r.seatY<r.y+r.h)
  assert.ok(r.x>=servicePass[section].well.x&&r.x+r.w<=servicePass[section].well.x+servicePass[section].well.w)
 }
 const ops:string[]=[];const grad={addColorStop(){}};const pen=new Proxy({}, {get:(_,k)=>()=>{ops.push(String(k));return grad}}) as CanvasRenderingContext2D
 reserveShell(pen,'shots');reservePocket(pen,reserveRecess('shots',0));ops.push('item');reserveLip(pen,reserveRecess('shots',0))
 assert.ok(ops.indexOf('clip')<ops.indexOf('item'));assert.ok(ops.lastIndexOf('fill')>ops.indexOf('item'))
})
