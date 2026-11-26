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


test('approved adjusted ceramic sprites are used for both stock and held cups; glass registrations stay intact',()=>{
 const d=cupColumns.find(s=>s.cup==='demi')!,c=cupColumns.find(s=>s.cup==='bowl')!
 assert.equal(d.w,55);assert.equal(c.w,63)
 for(const s of [d,c]){
  assert.equal(s.stackMode,'single');assert.equal(activeCupId(s.cup,'Medium'),s.id+'_active')
  assert.deepEqual(readFileSync(new URL('../public/empire_cupware/'+s.id+'.webp',import.meta.url)),readFileSync(new URL('../public/empire_cupware/'+s.id+'_active.webp',import.meta.url)))
  const g=activeCupGeometry({cup:s.cup,size:'Medium',lid:false},0,0,vesselHeight(s.cup,'Medium'),s.w/s.h)
  assert.ok(Math.abs(g.w-s.activeWidth!)<1e-8);assert.ok(g.h<=vesselHeight(s.cup,'Medium'))
 }
 for(const cup of ['glass','tall'] as const){const s=cupColumns.find(s=>s.cup===cup)!;assert.equal(s.activeScale,undefined);assert.equal(s.stackMode,undefined);assert.equal(vesselHeight(cup,'Medium'),87.75)}
})
test('actual takeaway sprite proportions preserve the same rim diameter for both sizes with or without a lid',()=>{
 for(const cup of ['paper','clear'] as const)for(const lid of [false,true]){
  const pair=cupColumns.filter(s=>s.cup===cup).map(s=>activeCupGeometry({cup,size:s.size,lid},0,0,vesselHeight(cup,s.size),s.w/s.h))
  assert.ok(Math.abs(pair[0].rx-pair[1].rx)<1e-8);assert.ok(pair[0].h<pair[1].h)
 }
})

test('corrected Latte and Frappé identities preserve recipes while using the matching vessel anchors',()=>{
 const latte=cupColumns.find(s=>s.cup==='glass')!,frappe=cupColumns.find(s=>s.cup==='tall')!
 assert.equal(latte.id,'empire_latte_glass');assert.equal(frappe.id,'empire_frappe_glass')
 assert.equal(latte.label,'Latte glass');assert.equal(frappe.label,'Frappé glass')
 const l=activeCupGeometry({cup:'glass',size:'Medium',lid:false},0,100,87.75,197/256)
 const f=activeCupGeometry({cup:'tall',size:'Medium',lid:false},0,100,87.75,180/250)
 assert.equal(l.shape.foot,.80);assert.equal(f.shape.foot,.89)
 assert.ok(l.rim<l.foot&&f.rim<f.foot)
})

test('registered actual takeaway rasters match the stock widths, EE logo and paired lid geometry',()=>{
 for(const mat of ['paper','clear'] as const){
  const pair=cupColumns.filter(s=>s.cup===mat)
  for(const s of pair){
   const bytes=readFileSync(new URL('../public'+activeCupPath(activeCupId(s.cup,s.size)),import.meta.url))
   assert.equal(bytes.toString('ascii',12,16),'VP8L');const packed=bytes.readUInt32LE(21),w=(packed&0x3fff)+1,h=((packed>>>14)&0x3fff)+1
   assert.equal(w,256);assert.ok(Math.abs(s.activeAspect!-w/h)<1e-9)
   const stock=readFileSync(new URL('../public/empire_cupware/'+s.id+'_stock_1.webp',import.meta.url)),dims=stock.readUInt32LE(21),stockH=((dims>>>14)&0x3fff)+1
   assert.equal(h-s.activeMouthPixels!,stockH-s.stockRidgePixels!)
  }
  for(const lid of [false,true]){
   const poses=pair.map(s=>activeCupGeometry({cup:s.cup,size:s.size,lid},0,stageCupY,vesselHeight(s.cup,s.size),s.activeAspect!))
   assert.ok(Math.abs(poses[0].w-poses[1].w)<1e-8);assert.ok(poses[0].h<poses[1].h)
   for(const [i,s] of pair.entries())assert.ok(poses[i].h<=vesselHeight(s.cup,s.size)+1e-8)
   if(!lid)assert.equal(poses[0].w,pair[0].w)
  }
  if(mat==='paper')assert.ok(pair.every(s=>s.logo==='EE serif monogram'&&!('sleevePixels' in s)))
 }
})

test('lidding never changes the body geometry or base anchor for either material and size',()=>{
 for(const s of cupColumns.filter(s=>s.cup==='paper'||s.cup==='clear')){
  const pose={cup:s.cup,size:s.size,lid:false},h=vesselHeight(s.cup,s.size),a=s.activeAspect!
  assert.deepEqual(activeCupGeometry(pose,s.x,stageCupY,h,a),activeCupGeometry({...pose,lid:true},s.x,stageCupY,h,a))
 }
})
