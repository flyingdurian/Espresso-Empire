import assert from 'node:assert/strict'
import test from 'node:test'
import {guestWalk,gaitFrames} from '../src/counter/guest-walk.ts'

test('each customer walks forward through the queue and turns toward the exit after the handoff',()=>{
 for(const look of 'abcdef')for(const spot of [0,1]){
  const ticket={look,spot}
  const pose=(state:Parameters<typeof guestWalk>[1]['state'],age:number,fromLine=false)=>
   guestWalk(ticket,{state,fromLine},age,54,48,1)
  const queued=pose('line',14),advance=pose('walking',0,true)
  assert.deepEqual([advance.x,advance.y,advance.h],[queued.x,queued.y,queued.h])
  const atCounter=pose('waiting',0),settled=pose('walking',54,true)
  assert.deepEqual([settled.x,settled.y,settled.h],[atCounter.x,atCounter.y,atCounter.h])
  const first=pose('walking',3),later=pose('walking',35)
  if(!'ef'.includes(look))assert.equal(first.flip,later.x<first.x)
  const departing=pose('paid',31),final=pose('paid',48)
  assert.equal(departing.flip,final.x<departing.x)
  assert.equal(departing.side,'ef'.includes(look))
  assert.equal(pose('paid',15).x,atCounter.x)
  assert.ok(spot?final.x>1106:final.x<528)
  const frames=new Set(Array.from({length:201},(_,i)=>pose('walking',54*i/200).frame))
  assert.equal(frames.size,gaitFrames)
 }
})
