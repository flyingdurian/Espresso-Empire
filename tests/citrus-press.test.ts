import test from 'node:test'
import assert from 'node:assert/strict'
import {Bench,type Config} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {finishSources,syrupKeys} from '../src/counter/station-layout.ts'
import {readData} from '../scripts/read.ts'

test('Syrup rack has five distinct targets with clear gaps for touch',()=>{
 for(let i=1;i<syrupKeys.length;i++){
  const left=finishSources[syrupKeys[i-1]],right=finishSources[syrupKeys[i]]
  assert.ok(right.x-left.x>40)
 }
 assert.equal(syrupKeys.length,5)
})

test('Citrus press runs independently, rejects duplicate starts, and charges two portions for a large glass',async()=>{
 const cfg:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
 const g=new Bench(structuredClone(cfg),tuning)
 const advance=(seconds:number)=>{for(let i=0;i<g.ticks(seconds);i++)g.step()}
 g.command({action:'citrus'})
 const cycle=g.citrus
 g.command({action:'citrus'});assert.equal(g.citrus,cycle)
 g.command({action:'cup',cup:'clear',size:'Large'})
 g.command({action:'add',add:'orange',slot:0});assert.equal(g.pours.length,0)
 advance(cfg.stations.citrus)
 assert.equal(g.orangeStock,cfg.capacity.citrus)
 g.command({action:'citrus'});assert.equal(g.citrus,null)
 g.command({action:'dropPour',pour:{action:'add',add:'orange',slot:0}})
 assert.equal(g.orangeStock,cfg.capacity.citrus-cfg.capacity.largePortions)
 g.command({action:'citrus'});assert.equal(g.citrus,null)
 advance(cfg.stations.finish)
 assert.equal(g.recipe(g.cups[0]!), 'spremuta')
 g.command({action:'citrus'});advance(cfg.stations.citrus)
 assert.equal(g.orangeStock,cfg.capacity.citrus)
})
