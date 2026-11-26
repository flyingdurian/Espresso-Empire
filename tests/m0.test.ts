import test from 'node:test'
import assert from 'node:assert/strict'
import {loadDisk,readData} from '../scripts/read.ts'
import {loadContent,validateReferences} from '../src/content/load.ts'
import {Simulation,runTrace,zone,digest} from '../src/sim/simulation.ts'
import {FixedClock} from '../src/sim/clock.ts'
const data=await loadDisk(),f=data.diagnostic
const trace=()=>runTrace(data,f.defaultSeed,f.checkpointTick)

test('headless checkpoint pins both state and ordered event history',async()=>{
  const ref=await readData('checkpoint.json')
  assert.equal(digest(trace()),ref.digest);assert.deepEqual(trace(),trace())
})
test('seed controls random draws and survives restart',()=>{
  assert.notEqual(runTrace(data,0,0).rng,runTrace(data,42,0).rng)
  const items=(seed:number)=>runTrace(data,seed,0).orders.map(o=>o.item)
  assert.notDeepEqual(items(0),items(1234567))
  assert.deepEqual(items(0),items(0))
})
test('steady frames, coarse frames and irregular frames reach the same snapshot',()=>{
  for(const ms of [10,80,137]) {
    const sim=new Simulation(data,f.defaultSeed),clock=new FixedClock()
    let elapsed=0;const total=f.checkpointTick*data.tuning.tickMs
    while(elapsed<total) {
      const delta=Math.min(ms,total-elapsed);clock.advance(delta,data.tuning.tickMs,()=>sim.step());elapsed+=delta
    }
    assert.deepEqual(sim.snapshot(),trace())
  }
})
test('pause is stable, step advances one tick, snapshots cannot mutate the engine',()=>{
  const sim=new Simulation(data,0),a=sim.snapshot();a.cart.fill(null);a.events.length=0
  assert.notDeepEqual(a,sim.snapshot());assert.equal(sim.tick,0)
  sim.step();assert.equal(sim.tick,1);assert.equal(sim.snapshot().orders[0].remaining,a.orders[0].remaining-1)
})
test('changing a JSON timer moves the batch-ready boundary',()=>{
  const changed=structuredClone(data);changed.menu.stations[0].cycleSeconds*=2
  const ready=(d:typeof data)=>runTrace(d,0,f.durationTicks).events.find(e=>e.kind==='Batch ready'&&e.detail==='group')!.tick
  assert.equal(ready(changed)-ready(data),data.menu.stations[0].cycleSeconds*1000/data.tuning.tickMs)
})
test('timer thresholds cover exact 15 and 50 percent',()=>{
  const o={...trace().orders[0],max:100}
  for(const [remaining,expected] of [[0,'Urgent'],[14,'Urgent'],[15,'Waiting'],[49,'Waiting'],[50,'Relaxed']] as const)
    assert.equal(zone({...o,remaining},data.tuning.zoneBoundaries),expected)
})
test('trace ends at the fixture boundary; expired timers remain at zero',()=>{
  const sim=new Simulation(data,0);for(let i=0;i<f.durationTicks+20;i++)sim.step()
  const s=sim.snapshot();assert.equal(s.tick,f.durationTicks);assert.equal(s.events.at(-1)?.kind,'Trace complete')
  assert.equal(s.events.filter(e=>e.kind==='Timer elapsed'&&e.detail==='L3').length,1)
  assert.ok(s.orders.every(o=>o.remaining>=0))
})
test('headless rejects out-of-range seeds and ticks',()=>{
  for(const x of [-1,NaN,1.1,4294967296])assert.throws(()=>new Simulation(data,x),/Seed/)
  assert.throws(()=>runTrace(data,0,1.1),/Tick/)
})
test('schema validation includes file and field path',async()=>{
  await assert.rejects(loadContent(async path=>{
    const v=await readData(path);if(path==='menu.json')v.stations[0].batch=-1;return v
  }),/menu.json.*stations\/0\/batch/)
})
for(const [name,change,path] of [
  ['broken edge',(d:typeof data)=>{d.building.edges[0].to='absent'},/building.json \/edges\/0/],
  ['second production floor',(d:typeof data)=>{d.building.sections[0].kind='production'},/one full-production floor/],
  ['invalid timing range',(d:typeof data)=>{d.tuning.neighborSeconds=[5,2]},/tuning.json \/neighborSeconds/],
  ['bad recipe',(d:typeof data)=>{d.menu.recipes[0].components=['absent']},/menu.json \/recipes\/0/],
  ['impossible cart',(d:typeof data)=>{d.diagnostic.cupSlots=0},/loadedCups/],
  ['duplicate seat',(d:typeof data)=>{d.diagnostic.orders[0].seat=d.diagnostic.orders[1].seat},/orders\/seat/]
] as const) test('rejects '+name,()=>{const d=structuredClone(data);change(d);assert.throws(()=>validateReferences(d),path)})
