import {strict as assert} from 'node:assert'
import test from 'node:test'
import {existsSync,readFileSync} from 'node:fs'
import {activeCupId,activeLidId,activeCupAssets,activeCupPath,activeCupGeometry,visibleContents,liquidTop} from '../src/counter/active-cup.ts'
import {cupColumns} from '../src/counter/cup-stack-spec.ts'
import {vesselHeight,stageCupY} from '../src/counter/station-layout.ts'
import {saucerTouch} from '../src/counter/touch-layout.ts'
import {iceSeats,iceBasinCorners,iceScoopHome,iceRim} from '../src/counter/ice-service.ts'

test('staged and held vessels resolve to upright Empire registrations, with legacy mug unchanged',()=>{
 for(const s of cupColumns)assert.equal(activeCupId(s.cup,s.size),s.cup==='mug'?'mug-empty':s.id+'_active')
 assert.equal(activeLidId('paper'),'empire_paper_lid_active');assert.equal(activeLidId('clear'),'empire_clear_lid_active')
 for(const id of activeCupAssets)assert.ok(existsSync(new URL('../public'+activeCupPath(id),import.meta.url)))
 const scene=readFileSync(new URL('../src/counter/scene.ts',import.meta.url),'utf8')
 assert.match(scene,/const art=activeCupId\(c.cup,c.size\)/);assert.match(scene,/key=activeCupId\(b.cup,b.size\)/);assert.match(scene,/image\(lid,cx-lw\/2/)
})
test('active vessel geometry fits its existing saucer; liquid and ice obey opaque/transparent visibility',()=>{
 for(const s of cupColumns){const c={cup:s.cup,size:s.size,lid:false};const h=vesselHeight(c.cup,c.size),hit=saucerTouch(0,c)
  for(const ratio of [.65,1,1.6]){const g=activeCupGeometry(c,hit.x,stageCupY,h,ratio);assert.ok(g.w<=hit.w);assert.ok(g.rim<g.foot&&g.foot<=stageCupY);assert.ok(g.h<=h)
   if(g.shape.glass){assert.ok(liquidTop(g,0)>liquidTop(g,1));assert.equal(liquidTop(g,1),g.rim)}
  }
 }
 assert.deepEqual(visibleContents('paper',0),{ice:false,surface:false});assert.deepEqual(visibleContents('paper',.67),{ice:false,surface:false});assert.equal(visibleContents('paper',.95).surface,true)
 assert.deepEqual(visibleContents('clear',0),{ice:true,surface:true})
})
test('recessed ice is clipped to the authored opening and the foreground lip is painted last',()=>{
 assert.equal(iceBasinCorners.length,4);assert.ok(iceScoopHome.y<=iceRim.y+iceRim.h)
 for(let n=6;n>0;n--){const a=iceSeats(n,6),b=iceSeats(n-1,6);assert.ok(b.length<a.length);assert.ok(b.every(p=>a.some(q=>q.rank===p.rank&&q.y===p.y)))}
 const scene=readFileSync(new URL('../src/counter/scene.ts',import.meta.url),'utf8');const start=scene.indexOf("layer('ice',iceRim.x"),end=scene.indexOf('if(!g.kitchen)',start);const ice=scene.slice(start,end)
 assert.ok(ice.indexOf('empire_ice_brass_rim')<ice.indexOf('iceWell(ctx'));assert.ok(ice.indexOf('iceWell(ctx')<ice.indexOf('empire_ice_scoop'));assert.ok(ice.indexOf('empire_ice_scoop')<ice.indexOf('empire_ice_front_lip'))
})
