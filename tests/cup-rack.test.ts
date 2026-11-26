import {strict as assert} from 'node:assert'
import test from 'node:test'
import {Bench,type Config} from '../src/counter/bench.ts'
import {drawCupRacks} from '../src/counter/cup-rack.ts'
import type {Carry} from '../src/counter/station-layout.ts'
import {readData} from '../scripts/read.ts'
import type {Tuning} from '../src/content/model.ts'

test('individual glasses and takeaway sleeves follow dragging, staging, and clean returns',async()=>{
 const cfg:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
 const g=new Bench(cfg,tuning)
 const pen={save(){},restore(){},translate(){},scale(){},fillRect(){},createRadialGradient(){return {addColorStop(){}}}}
 const contents=(held:Carry|null)=>{
  const sprites:string[]=[]
  drawCupRacks(pen as unknown as CanvasRenderingContext2D,()=>{},k=>sprites.push(k),g,held)
  return sprites
 }
 const glasses=(sprites:string[])=>sprites.filter(s=>s==='glass-empty').length
 assert.equal(glasses(contents(null)),3)
 assert.equal(glasses(contents({kind:'holder',index:2})),2)
 assert.equal(g.stock.glass,3)
 g.command({action:'cup',cup:'glass',size:'Medium',slot:0});assert.equal(glasses(contents(null)),2)
 g.command({action:'returnCup',cup:'glass',size:'Medium',slot:0});assert.equal(glasses(contents(null)),3)
 assert.ok(contents({kind:'holder',index:5}).includes('paper-stack-4'))
 g.command({action:'cup',cup:'paper',size:'Small',slot:0});assert.ok(contents(null).includes('paper-stack-4'))
 g.command({action:'returnCup',cup:'paper',size:'Small',slot:0});assert.ok(!contents(null).includes('paper-stack-4'))
})
