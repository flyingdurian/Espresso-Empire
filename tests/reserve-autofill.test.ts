import {strict as assert} from 'node:assert'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {Bench,type Config,type Shot} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {reserveHead,shotReserveArc} from '../src/counter/service-pass.ts'
import {canDrop} from '../src/counter/drop-eligibility.ts'
const read=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(read<Config>('counter'),read<Tuning>('tuning'))
const count=(g:Bench)=>g.shotReserve.filter(Boolean).length+g.groups.flatMap(x=>x.pots).filter(Boolean).length
const advance=(g:Bench,seconds:number)=>{for(let i=0;i<g.ticks(seconds);i++)g.step()}
test('reserve edge fill prioritizes the current minority then balances and preserves every available shot',()=>{
 for(const majority of ['short','standard'] as const){
  const g=game(),minority:Shot=majority==='short'?'standard':'short'
  g.shotReserve[0]=majority;g.shotReserve[1]=majority;g.shotReserve[2]=majority
  g.groups[0].pots=[majority,minority];g.groups[1].pots=[majority,minority];g.groups[2].pots=[minority,majority]
  const total=count(g);assert.match(g.command({action:'bankShots'}),/Staged 5 shots/)
  assert.deepEqual(g.shotReserve.slice(3,6),[minority,minority,minority]);assert.equal(g.shotReserve.filter(Boolean).length,8)
  assert.equal(count(g),total);assert.equal(g.groups.flatMap(v=>v.pots).filter(Boolean).length,1)
  assert.equal(g.stagedShotMotion.size,5);assert.ok(g.stagedShotMotion.get(4)!.start>g.stagedShotMotion.get(3)!.start)
  assert.equal(g.command({action:'bankShots'}),'Shot reserve full');assert.equal(count(g),total)
 }
})
test('autofill falls back to the other shot type and never takes an extracting or queued pitcher',()=>{
 const g=game();g.groups[0].pots=['standard','standard'];g.groups[1].pots=['standard',null];g.groups[2].pots=[null,null]
 g.command({action:'cup',cup:'demi'});g.command({action:'add',add:'water',slot:0})
 assert.match(g.command({action:'dropPour',pour:{action:'pour',head:0,lane:0,slot:0}}),/queued/)
 assert.equal(g.canBankShot(0,0),false);assert.equal(canDrop(g,{kind:'pot',head:0,lane:0},'shotPocket/0'),false)
 g.groups[1].extraction={shot:'standard',lane:1,start:g.tick,end:g.tick+100}
 assert.match(g.command({action:'bankShots'}),/Staged 2 shots/);assert.equal(g.groups[0].pots[0],'standard');assert.equal(g.groups[1].pots[1],null)
 advance(g,g.data.stations.water+.8+g.data.stations.transfer);assert.equal(g.cups[0]!.shot,'standard');assert.equal(g.shotReserve.filter(Boolean).length,2)
})
test('an outgoing reserve pour holds its pocket; explicit placement and direct pour remain valid',()=>{
 const g=game();g.shotReserve[0]='short';g.groups[0].pots=['short','standard'];g.command({action:'cup',cup:'demi'});g.command({action:'pour',head:reserveHead,lane:0,slot:0})
 assert.equal(g.shotReserve[0],null);assert.equal(g.pouringFrom('transfer',reserveHead,0),true)
 g.command({action:'bankShots'});assert.equal(g.shotReserve[0],null);assert.equal(g.shotReserve[1],'short');assert.equal(g.shotReserve[2],'standard')
 g.groups[1].pots[0]='short';g.command({action:'parkShot',head:1,lane:0,pocket:3});assert.equal(g.shotReserve[3],'short')
 advance(g,3);assert.equal(g.stagedShotMotion.size,0);assert.equal(g.cups[0]!.shot,'short');assert.equal(g.cups[0]!.poured,true)
 g.command({action:'cup',cup:'demi',slot:1});g.groups[1].pots[1]='standard';g.command({action:'pour',head:1,lane:1,slot:1});assert.equal(g.groups[1].pots[1],null)
})
test('reserve arc has oven-style lift, exact endpoints and stable bounds',()=>{
 const a={x:10,y:20},b={x:90,y:70};assert.deepEqual(shotReserveArc(a,b,0),{...a,angle:0});const end=shotReserveArc(a,b,1);assert.ok(Math.abs(end.x-b.x)<1e-8&&Math.abs(end.y-b.y)<1e-8)
 const mid=shotReserveArc(a,b,.5);assert.equal(mid.x,50);assert.equal(mid.y,45-60);assert.ok(mid.angle>0)
 assert.deepEqual(shotReserveArc(a,b,-1),shotReserveArc(a,b,0));assert.deepEqual(shotReserveArc(a,b,2),shotReserveArc(a,b,1))
})
