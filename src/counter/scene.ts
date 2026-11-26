import {guestWalk,drawGait,leavingCounter,gaitAtlases} from './guest-walk.ts'
import {servicePass,reserveHead,frontFoodSeat,pocketSeat} from './service-pass.ts'
import {iceWell,scoopPose,scoopWithIce,icePortions,iceCubeCount,iceCubeStart,iceScoopHome,iceRim,iceAssets,iceAssetPath,iceBasinClip} from './ice-service.ts'
import {activeCupId,activeLidId,activeCupAssets,activeCupPath,activeCupGeometry,visibleContents,liquidTop} from './active-cup.ts'
import {drawCupRacks} from './cup-rack.ts'
import {stackSpecs,stackAssetPath,stackParts,stackPartId,stackPartPath,stockStateIds,stockStatePath} from './cup-stack-spec.ts'
import {espressoParts,glassHeight,doseVolume,shotGlass,brewGroup,extraction} from './espresso-bar.ts'
import {drawMilkPitcher,drawSteamLane,loadMilkArt,milkCycle} from './milk-station.ts'
import {drawColdStation} from './cold-station.ts'
import {frontGalley} from './galley-layout.ts'
import {drawWastePress} from './waste.ts'
import {pourPose,tool,phase,fillProgress} from './drink-motion.ts'
import type {Slide} from './counter-travel.ts'
import {frontHot,hotArt,makeHotAppliance,rackFoodHeight,rackPosition,frontPressPerspective,frontPressPoint} from './hot-appliance.ts'
import {beverageMachineArt,drawRearKitchen} from './rear-kitchen.ts'
import {actingProfile} from './guest-performance.ts'
import {receivingSpriteIds,handoffAnchor,sipPhase} from './handoff.ts'
import {type Bench,type End,type Drink,type Delivery} from './bench.ts'
import {holders,heads,brewPoint,cupsX,serveX,stage,type Carry,stageCupY,beanBags,foodBins,miniRack,milkSpouts,vesselHeight,finishSources,citrusPress,isSyrup,syrupKeys} from './station-layout.ts'
import {filterSockets,filterPose,filterTexture} from './filter-pose.ts'
import {isLayer,transformLayer,type LayerMap,type LayerRect,type PreviewState} from './layer-overrides.ts'
import {drinkLook,surfaceNames,vessel} from './drink-look.ts'
type Rect={x:number;y:number;w:number;h:number;file?:string}
type Cycle={start:number;end:number}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const progress=(t:number,c:Cycle|null)=>c?clamp((t-c.start)/(c.end-c.start)):0
export async function workstation(canvas:HTMLCanvasElement){
 let ctx=canvas.getContext('2d',{alpha:false})!
 const res=await fetch('/station/registration.json');if(!res.ok)throw Error('Missing workstation layout')
 const manifest=await res.json(),rects:Record<string,Rect>=manifest.assets??manifest
 const textures=new Map<string,HTMLImageElement>()
 const decode=async(url:string)=>{const im=new Image();im.src=url;await im.decode();return im}
 const load=async(key:string,url:string)=>{textures.set(key,await decode(url))}
 const ids=[...gaitAtlases,'service-well',...receivingSpriteIds,'door','window','forno-kitchen','return-bay','froth','cold-milk','beans','scoop-loaded','scoop-empty','ice-cube','portafilter-full','portafilter-empty','dose-ground','puck','pitcher-empty','towel','raw','baked','panino','grilled','grilled-pesto','panino-pesto','pesto','brownie','tea-carafe','blend-carafe','carafe-empty','wash-open','wash-closed','dish-tub','waste-press','waste-shutter','lids','lids-clear','clear-lid','paper-lid','clear-tea','clear-tea-lid','tall-tea','bowl-milk','tray',
 ...['paper','clear'].flatMap(c=>[1,2,3,4,5].map(n=>c+'-stack-'+n)),...['demi','mug','glass','bowl','tall','paper','clear'].flatMap(c=>['empty','shot','full'].map(k=>c+'-'+k)),...['e','f'].flatMap(c=>['glance','watch','thanks'].map(k=>'guest-'+c+'-'+k)),...['a','b','c','d','e','f'].flatMap(c=>['idle','happy'].map(k=>'guest-'+c+'-'+k))]
 const [milkArt]=await Promise.all([loadMilkArt(decode),...activeCupAssets.map(id=>load(id,activeCupPath(id))),...stockStateIds.map(id=>load(id,stockStatePath(id))),...stackSpecs.flatMap(s=>[load(s.id,stackAssetPath(s)),...stackParts.map(p=>load(stackPartId(s,p),stackPartPath(s,p)))]),...iceAssets.map(id=>load(id,iceAssetPath(id))),...espressoParts.map(key=>load(key,'/station/'+key+'.webp')),...['citrus-press','orange-carafe','china-rack','takeaway-rack','brew-plinth'].map(name=>load(name,'/station/'+name+'.webp')),...[...hotArt,...beverageMachineArt].map(k=>load(k,'/forno/'+k+'.webp')),...surfaceNames.map(n=>load('surface-'+n,'/surfaces/'+n+'.webp')),...[1,2,3].map(n=>load('cube-'+n,'/surfaces/ice-'+n+'.webp')),...['filter-empty','filter-loose','filter-tamped','filter-inverted','filter-edge','grinder-fork-front',...Array.from({length:9},(_,i)=>'lock-'+i)].map(n=>load(n,'/filter/'+n+'.webp')),...[...syrupKeys,...beanBags.map(b=>b.key)].map(n=>load(n,'/pantry/'+n+'.webp')),...ids.map(k=>load(k,'/counter/'+k+'.webp')),...['plate','shot-tin','clean-tin','cold-jug'].map(k=>load('old-'+k,'/art/'+k+'.webp')),...Object.entries(rects).filter(([,r])=>typeof r.x==='number').map(([k,r])=>load('new-'+k,'/station/'+(r.file??k+'.webp').split('/').pop()))])
 // Resolve moving tools during setup, before a shift can start.
 textures.set('new-milk-pitcher',milkArt.pitcher)
 const pourActions=['transfer','ice','tea','cold','milk','foam','coldmilk','orange',...syrupKeys] as const
 const pourTools=new Map(pourActions.map(action=>{
  const spec=tool(action,0,0)
  const sprite=textures.get(spec.key)
  if(!sprite)throw Error('Missing pour tool '+spec.key)
  return [spec.key,sprite] as const
 }))
 let preview: {map:LayerMap;selected:string;state:PreviewState}|null=null
 function layer(id:string,x:number,y:number,w:number,h:number,paint:()=>void){
  const rect:LayerRect={x,y,w,h}
  if(!preview||!isLayer(id)){paint();return}
  transformLayer(ctx,rect,preview.map[id],()=>{
   paint()
   if(preview?.selected===id){ctx.save();ctx.strokeStyle='#7df5c5';ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.strokeRect(x,y,w,h);ctx.restore()}
  })
 }
 function image(k:string,x:number,y:number,w:number,h:number){
  if(k==='china-rack-single'){
   const im=textures.get('china-rack');if(im)ctx.drawImage(im,0,0,im.width,im.height*.53,x,y,w,h);return
  }
  const im=textures.get(k);if(im)ctx.drawImage(im,x,y,w,h)
 }
 function lockImage(key:string,x:number,y:number){
  // Foreshorten toward the viewer and rotate around the group socket, never the tip.
  ctx.save();ctx.translate(x,y);ctx.rotate(.20);ctx.scale(1,.62);image(key,-76,-12,152,92);ctx.restore()
 }
 function prop(k:string,x:number,y:number,h:number,angle=0,alpha=1){
  const im=textures.get(k);if(!im)return
  const w=h*im.width/im.height;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=clamp(alpha);ctx.drawImage(im,-w/2,-h,w,h);ctx.restore()
 }
 function paintFilter(key:string,x:number,y:number,h:number,angle:number){
  const im=textures.get(key)!,w=im.width*h/im.height
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(im,-w*94/435,-h*(key==='filter-inverted'||key==='filter-edge'?79:46)/203,w,h);ctx.restore()
 }
 function fixed(k:string,alpha=1){const r=rects[k];if(!r)return;layer(k.startsWith('fridge')||k.startsWith('microwave')?'':k,r.x,r.y,r.w,r.h,()=>{ctx.save();ctx.globalAlpha=clamp(alpha);image('new-'+k,r.x,r.y,r.w,r.h);ctx.restore()})}
 function stream(x:number,y:number,x2:number,y2:number,color:string){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
 function steam(x:number,y:number,t:number){ctx.save();for(let i=0;i<4;i++){const p=(t*.035+i*.25)%1;ctx.globalAlpha=Math.sin(Math.PI*p)*.58;ctx.strokeStyle='#fff9e4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+i*4,y-35*p);ctx.bezierCurveTo(x-8+i*4,y-10-35*p,x+10+i*4,y-18-35*p,x+i*4,y-26-35*p);ctx.stroke()}ctx.restore()}
 function vapor(x:number,y:number,t:number,strength:number,down=false){
  ctx.save()
  for(let i=0;i<10;i++){
   const p=(t*.045+i*.137)%1, drift=Math.sin(i*1.9+p*4)*p*12
   const cx=x+drift,cy=y+(down?1:-1)*p*(43+strength*18),radius=(3+p*11)*strength
   const cloud=ctx.createRadialGradient(cx,cy,0,cx,cy,radius)
   cloud.addColorStop(0,'rgba(255,250,230,'+(.53*Math.sin(Math.PI*p))+')');cloud.addColorStop(1,'rgba(253,247,230,0)')
   ctx.fillStyle=cloud;ctx.fillRect(cx-radius,cy-radius,2*radius,2*radius)
  }ctx.restore()
 }
 function drawServing(d:Delivery,x:number,y:number,height:number){
  if(d.drink){drink(d.drink,x,y,height);return}
  if(d.food)prop(d.food.food==='pesto'?'grilled-pesto':d.food.food,x,y,height)
 }
 const handHistory=new WeakMap<Bench['guests'][number],{current:Delivery;previous:Delivery|null}>()
 const palms=new Map<number,{x:number;y:number;height:number}>()
 function guests(g:Bench,end:End,t:number){
  palms.clear();ctx.save();ctx.beginPath();const [wx,wy,ww,wh]=manifest.window;ctx.rect(wx-2,wy-2,ww+4,wh+4);ctx.clip()
  image(end.toLowerCase(),wx-85,wy-35,ww+170,wh+95)
  const cast=g.guests.flatMap((v,i)=>{
   const o=g.data.orders[i]
   if(o.end!==end||v.state==='queued'||v.state==='gone')return []
   const style=actingProfile(o),seconds=(t-v.since)*g.data.tickMs/1000
   const path=guestWalk(o,v,t-v.since,g.ticks(g.data.stations.entrance),g.ticks(g.data.stations.departure),style.stride)
   return [{v,i,o,style,seconds,path}]
  }).sort((a,b)=>a.path.y-b.path.y)
  for(const {v,i,o,style,seconds,path} of cast){
   const moving=path.travelling,exit=leavingCounter(v.state)
   let frame='idle'
   const phase=t*.10*style.stride+i*1.82,impatient=v.state==='waiting'&&v.left<g.ticks(o.patience)*.42
   const greeting=v.state==='waiting'&&!v.received&&seconds<style.greet
   if(greeting)frame='happy'
   if((o.look==='e'||o.look==='f')&&!greeting&&v.state==='waiting'){
    frame=impatient&&seconds%4<2?'watch':seconds%6>4?'glance':'idle'
   }
   const receipt=v.received
   let hand=handHistory.get(v)
   if(receipt&&receipt!==hand?.current){
    hand={current:receipt,previous:hand?.current??null};handHistory.set(v,hand)
   }
   const touch=receipt?(t-receipt.end)*g.data.tickMs/1000:-1
   const reaching=!!receipt&&t>=receipt.start+(receipt.end-receipt.start)*.32
   const raised=receipt&&reaching&&v.state==='waiting'?sipPhase(touch,style.repeat,style.sip,!!receipt.drink):0
   if(reaching&&!moving)frame='receive'
   const nod=touch>=0&&touch<.7?Math.sin(Math.PI*touch/.7)*6:0
   const breathing=moving?0:Math.sin(phase*.7)*1.1
   const greetingLean=greeting?Math.sin(Math.PI*seconds/style.greet)*.035:0
   const restless=impatient?Math.sin(phase*.45)*style.lean:0
   const lean=greetingLean+restless*.035+(moving?0:Math.sin(phase*.35)*.004)
   const actorX=path.x+path.sway+restless*3,feetY=path.y
   const actorHeight=path.h+breathing-path.dip-(moving?0:nod)
   // Keep the planted foot at the center of the turn and seat the approaching shoes on the pavement.
   const shoes=feetY-actorHeight*.031
   if(shoes<wy+wh+4){
    ctx.save();ctx.translate(actorX,shoes);ctx.scale(actorHeight*.12,actorHeight*.019)
    const shadow=ctx.createRadialGradient(0,0,0,0,0,1)
    shadow.addColorStop(0,'rgba(49,35,32,.24)');shadow.addColorStop(1,'rgba(49,35,32,0)')
    ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore()
   }
   const gait=moving&&path.turn>=.5
   ctx.save();ctx.translate(actorX,0);ctx.scale(1-.12*Math.sin(path.turn*Math.PI),1);ctx.translate(-actorX,0)
   if(gait){
    const atlas=textures.get('gait-'+o.look+(path.side?'-side':''))!
    drawGait(ctx,atlas,actorX,feetY,actorHeight,path.frame,path.flip,lean)
   }else{
    if(raised<1)prop('guest-'+o.look+'-'+frame,actorX,feetY,actorHeight,lean,1-raised)
    if(raised>0)prop('guest-'+o.look+'-sip',actorX,feetY,actorHeight,lean,raised)
   }
   ctx.restore()
   const palm=handoffAnchor(o.look,actorX,feetY,actorHeight,lean,raised)
   const handSize=actorHeight*(receipt?.drink?.cup==='demi' ? .046 : receipt?.drink ? .062 : .046)
   palms.set(i,{...palm,height:handSize})
   if(exit&&moving)continue
   if(receipt&&t>=receipt.end){
    ctx.save();ctx.translate(palm.x,palm.y)
    const angle=receipt.drink?-.13:.12
    ctx.rotate(raised*angle)
    drawServing(receipt,0,0,handSize);ctx.restore()
    if(hand)hand.previous=null
   }else if(hand?.previous&&receipt&&t>=hand.previous.end){
    // The first course stays in hand while the next one is offered.
    const flight=progress(t,receipt),release=clamp((flight-.48)/.35)
    ctx.save();ctx.globalAlpha=1-release
    const previousSize=actorHeight*(hand.previous.drink?.cup==='demi'?.046:hand.previous.drink?.062:.046)
    drawServing(hand.previous,palm.x+release*9,palm.y+release*7,previousSize);ctx.restore()
   }
  }ctx.restore()
 }

 function disk(target:CanvasRenderingContext2D,key:string|null,cx:number,cy:number,rx:number,ry:number,color:string){
  target.save();target.beginPath();target.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);target.clip()
  target.fillStyle=color;target.fillRect(cx-rx,cy-ry,2*rx,2*ry)
  const im=key?textures.get('surface-'+key):null
  if(im)target.drawImage(im,cx-rx,cy-ry,2*rx,2*ry)
  target.restore()
 }
 function surface(target:CanvasRenderingContext2D,c:Drink,cx:number,cy:number,rx:number,ry:number){
  const look=drinkLook(c)
  disk(target,look.surface,cx,cy,rx,ry,look.color)
  if(!look.flavored)return
  target.save();target.beginPath();target.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);target.clip()
  target.globalCompositeOperation='color';target.fillStyle=look.color;target.fillRect(cx-rx,cy-ry,rx*2,ry*2)
  target.globalCompositeOperation='source-over';target.globalAlpha*=.32;target.fillRect(cx-rx,cy-ry,rx*2,ry*2);target.restore()
  if(c.add.includes('milk')||c.add.includes('foam')){
   const airy=c.add.includes('foam'),silky=c.add.includes('milk')
   target.save();target.globalAlpha*=airy?.72:.43
   disk(target,airy&&silky?'mixed':airy?'airy':'silky',cx,cy,rx*.79,ry*.79,look.color);target.restore()
  }
 }
 function overhead(target:HTMLCanvasElement,c:Drink){
  const pen=target.getContext('2d')!,n=target.width,r=n*.43,look=drinkLook(c)
  pen.clearRect(0,0,n,n);pen.save();pen.translate(n*.5,n*.5)
  const isGlass=vessel[c.cup].glass,inside=isGlass?'#9d9081':'#d6c1a1'
  const rim=pen.createRadialGradient(-r*.18,-r*.22,r*.1,0,0,r*1.13)
  rim.addColorStop(0,inside);rim.addColorStop(.87,isGlass?'#857c6b':'#9c8062');rim.addColorStop(.94,'#e6d6ba');rim.addColorStop(.98,isGlass?'#a6b8b6':'#faf0dc');rim.addColorStop(1,'#866d56')
  pen.fillStyle=rim;pen.beginPath();pen.arc(0,0,r*1.1,0,Math.PI*2);pen.fill()
  if(look.fill)surface(pen,c,0,0,r*(.76+.24*look.fill),r*(.76+.24*look.fill))
  if(look.ice)for(const [i,xx,yy] of [[1,-.49,.02],[2,.01,-.46],[3,.04,.16]]){const im=textures.get('cube-'+i)!;pen.drawImage(im,r*xx,r*yy,r*.51,r*.46)}
  pen.restore()
 }
 function drink(c:Drink,x:number,y:number,h:number,previous?:Drink,fraction=1,iceProgress=1){
  const art=activeCupId(c.cup,c.size),im=textures.get(art)!
  const geo=activeCupGeometry(c,x,y,h,im.width/im.height),{w:width,shape,cx,ry,rx,rim,foot}=geo
  h=geo.h
  const look=drinkLook(c),old=previous?drinkLook(previous):look,fill=mix(old.fill,look.fill,fraction)
  prop(art,x,y,h)
  const transparent=shape.glass
  const top=liquidTop(geo,fill),visibility=visibleContents(c.cup,fill)
  const rad=rx*(transparent?.62+.38*fill:.88+.12*fill)
  ctx.save();ctx.beginPath()
  if(transparent){
   ctx.moveTo(cx-rx,rim);ctx.lineTo(cx-rx*.60,foot);ctx.quadraticCurveTo(cx,foot+ry*.50,cx+rx*.60,foot);ctx.lineTo(cx+rx,rim);ctx.bezierCurveTo(cx+rx,rim-1.4*ry,cx-rx,rim-1.4*ry,cx-rx,rim)
  }else ctx.ellipse(cx,rim,rx,ry,0,0,Math.PI*2)
  ctx.clip()
  if(fill>.005&&visibility.surface){
   if(transparent){
    const depth=foot-top
    ctx.fillStyle=old.fill?old.color:look.color;ctx.fillRect(cx-rx,top,2*rx,depth+ry)
    ctx.save();ctx.globalAlpha=fraction;ctx.fillStyle=look.color;ctx.fillRect(cx-rx,top,2*rx,depth+ry);ctx.restore()
    const milkCoffee=c.poured&&c.add.includes('coldmilk')
    const blended=c.add.includes('cold')
    if(milkCoffee||blended){
     // Keep the painted cream marbling visible through the glass. It descends with the incoming dose.
     const tx=textures.get(milkCoffee?'surface-iced-milk':'surface-frappe')!
     const established=old.fill>0&&(milkCoffee?previous?.poured&&previous.add.includes('coldmilk'):previous?.add.includes('cold'))
     const amount=previous&&!established?fraction:1
     const bodyHeight=depth*Math.min(1,amount*1.35)
     if(bodyHeight>0){
      ctx.save()
      ctx.globalCompositeOperation='soft-light'
      ctx.globalAlpha=milkCoffee?.76:.48
      const textureY=tx.height*(.24-.09*amount)
      ctx.drawImage(tx,tx.width*.18,textureY,tx.width*.64,tx.height*.60,cx-rad,top,rad*2,bodyHeight)
      ctx.restore()
     }
    }
    if(previous&&old.fill>.005&&fraction>0&&fraction<1){
     // A fresh layer starts at the meniscus before dispersing into the body.
     const thickness=Math.max(1,depth*Math.sin(Math.PI*fraction)*.62)
     const veil=ctx.createLinearGradient(0,top,0,top+thickness)
     const incoming=c.poured&&!previous.poured?'90,43,21':c.add.at(-1)==='orange'?'236,155,43':c.add.at(-1)==='cherry'?'151,40,66':c.add.at(-1)==='vanilla'?'221,182,112':c.add.at(-1)==='matcha'?'119,145,72':c.add.at(-1)==='cocoa'?'99,54,32':c.add.at(-1)==='caramel'?'194,128,50':c.add.at(-1)==='water'?'209,197,175':c.add.at(-1)==='tea'?'191,120,59':'249,232,201'
     veil.addColorStop(0,'rgba('+incoming+',.73)');veil.addColorStop(1,'rgba('+incoming+',0)')
     ctx.fillStyle=veil;ctx.fillRect(cx-rx,top,rx*2,thickness)
    }
    if(c.add.includes('foam')){
     const foamDepth=Math.min(depth*.36,h*.15)*(old.surface==='airy'||old.surface==='mixed'||previous?.add.includes('foam')?1:fraction)
     const layer=ctx.createLinearGradient(0,top,0,top+Math.max(1,foamDepth))
     layer.addColorStop(0,'#fff3d8');layer.addColorStop(.68,'#e9d5af');layer.addColorStop(1,'rgba(229,198,143,0)')
     ctx.fillStyle=layer;ctx.fillRect(cx-rx,top,2*rx,foamDepth)
    }
    const edge=ctx.createLinearGradient(cx-rx,0,cx+rx,0)
    edge.addColorStop(0,'#49392d83');edge.addColorStop(.16,'#84694913');edge.addColorStop(.35,'#fff1d71f');edge.addColorStop(.75,'#fff8df08');edge.addColorStop(1,'#4b3c2b8c')
    ctx.fillStyle=edge;ctx.fillRect(cx-rx,top,rx*2,depth+ry)
   }
   const ryTop=ry*(transparent?.55+.45*fill:1)
   if(previous&&old.fill&&fraction<1)surface(ctx,previous,cx,top,rad,ryTop)
   ctx.save();ctx.globalAlpha=old.fill?fraction:1;surface(ctx,c,cx,top,rad,ryTop);ctx.restore()
   if(fraction>0&&fraction<1&&!c.add.includes('ice')){
    ctx.save();ctx.strokeStyle='#fff0cc';ctx.globalAlpha=.20*Math.sin(Math.PI*fraction);ctx.lineWidth=.8
    ctx.beginPath();ctx.ellipse(cx,top,rad*(.15+.58*fraction),ryTop*(.13+.58*fraction),0,0,Math.PI*2);ctx.stroke();ctx.restore()
   }
  }
  if(look.ice&&visibility.ice){
   const count=iceCubeCount(c.size==='Large'?2:1)
   for(let i=0;i<count;i++){
    const start=iceCubeStart(i,count),settled=phase(iceProgress,start+.30,start+.62)
    if(!old.ice&&settled<=0)continue
    const height=Math.min(rx*.69,h*.20),ix=cx+[-.38,.03,.33][i%3]*rad
    const rest=transparent?foot-height*(i%3===1?.28:0)-Math.floor(i/3)*height*.48:rim+ry*.7
    const wet=transparent?top+height*.68+(i%2)*ry*.22:top+height*.22
    const end=fill?Math.min(rest,wet):rest
    const bounce=Math.sin(Math.PI*phase(iceProgress,start+.62,start+.80))*height*.09
    prop('cube-'+(i%3+1),mix(cx,ix,settled),mix(rim,end,settled*settled)-bounce,height,(i-1)*.18+.26*(1-settled))
   }
  }
  ctx.restore()
  if(transparent&&(look.ice||fill))prop(art,x,y,h,0,.42)
  if(c.lid&&(c.cup==='paper'||c.cup==='clear')){
   const lid=activeLidId(c.cup),li=textures.get(lid)!,lw=rx*2.12,lh=Math.min(lw*li.height/li.width,h*.24)
   image(lid,cx-lw/2,rim+ry*.65-lh,lw,lh)
  }
 }
 let heldIce:{start:number;pointer:{x:number;y:number}|null;portions:number}|null=null
 function beginIce(){if(heldIce)return false;heldIce={start:performance.now(),pointer:null,portions:1};return true}
 function moveIce(x:number,y:number){if(heldIce)heldIce.pointer={x,y}}
 function setIcePortions(portions:number){if(heldIce)heldIce.portions=portions}
 function stopIce(){heldIce=null}
 function releaseIce(game:Bench,slot:number){
  if(!heldIce||gatherAge()<130)return
  const p=scoopPose(gatherAge(),heldIce.pointer)
  releaseIngredient(game,slot,{kind:'add',add:'ice'},p.x,p.y-iceScoopHome.h*.36)
 }
 function gatherAge(){return heldIce?performance.now()-heldIce.start:0}
 const releases=new WeakMap<Bench,Map<number,{tick:number;carry:Carry;x:number;y:number}>>()
 function releaseIngredient(game:Bench,slot:number,carry:Carry,x:number,y:number){
  if(game.pouringAt(slot))return
  const records=releases.get(game)??new Map()
  records.set(slot,{tick:game.tick,carry,x,y});releases.set(game,records)
 }
 function flowing(from:{x:number;y:number},to:{x:number;y:number},p:number,color:string,width:number){
  const strength=Math.sin(phase(p,.31,.72)*Math.PI)
  if(strength>.005){
   ctx.save();ctx.strokeStyle=color;ctx.lineWidth=.7+strength*width;ctx.lineCap='round'
   const reach=phase(p,.31,.36)
   const x=mix(from.x,to.x,reach),y=mix(from.y,to.y,reach*reach)
   ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(from.x-2.5,mix(from.y,y,.43),x,y);ctx.stroke()
   ctx.strokeStyle='rgba(255,243,217,.44)';ctx.lineWidth=.7;ctx.stroke();ctx.restore()
  }
  const drip=phase(p,.72,.79)
  if(drip>0&&drip<1){
   ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(mix(from.x,to.x,drip),mix(from.y,to.y,drip*drip),1.5,2,0,0,2*Math.PI);ctx.fill();ctx.restore()
  }
 }
 function steamedPitcher(texture:'silky'|'airy',x:number,y:number,h:number,angle:number,level:number,work:number,time:number){
  drawMilkPitcher(ctx,milkArt,texture,x,y,h,angle,level,work,time)
 }
 const renderHot=makeHotAppliance({context:()=>ctx,textures,prop})
 const hotAppliance=(g:Bench,t:number,station:'oven'|'press',x:number,y:number,w:number,h:number)=>{const front=x===frontHot[station].x;layer((front?'front/':'rear/')+station,x,y,w,h,()=>{const paint=()=>renderHot(g,t,station,x,y,w,h,lifting);if(front&&station==='press')frontPressPerspective(ctx,paint);else paint()})}
 let lifting:Carry|null=null
 function frontBrewers(g:Bench,t:number){
  layer('brew-plinth',22,398,479,25,()=>image('brew-plinth',22,398,479,25))
  for(const key of ['tea','blend'] as const){
   const tea=key==='tea',frame=frontGalley[key],job=tea?g.brew:g.blend,ready=tea?g.teaReady:g.blendReady
   const atlas=tea?'urn':'blend',h=frame.h,w=tea?h*172/250:h*129/235
   const x=frame.x-w/2+(job&&!tea?Math.sin(t*2.1)*.85:0),y=frame.y-h/2
   layer(tea?'tea-brewer':'blender',x,y,w,h,()=>{
   image(atlas+'-empty',x,y,w,h)
   const amount=ready?1:progress(t,job)
   if(amount>0){
    const bottom=y+h*(tea?.71:.59),top=y+h*(tea?.36:.19),line=mix(bottom,top,amount)
    ctx.save();ctx.beginPath();ctx.rect(x,line,w,bottom-line);ctx.clip();image(atlas+'-full',x,y,w,h);ctx.restore()
   }
   if(tea&&job)vapor(frame.x-4,y+16,t,.72)
   })
  }
 }
 function front(g:Bench,end:End,t:number,selectedHead:number){
  guests(g,end,t);fixed('plate');fixed('espresso');frontBrewers(g,t);fixed('grinder');fixed('steam')
  const reserved=Object.entries(g.steamJobs).reduce((sum,[lane,job])=>sum+(job?job.amount*(1-milkCycle(lane==='silky'?'silky':'airy',progress(t,job)).charge):0),0)
  const tankFraction=clamp((g.milkTank+reserved+(g.milkRefill?g.milkRefill.amount*progress(t,g.milkRefill):0))/g.data.capacity.milkTank)
  const gauge={x:1135.8,y:304.2,w:3.1,h:34.3}
  ctx.fillStyle='#473e32';ctx.fillRect(gauge.x,gauge.y,gauge.w,gauge.h)
  ctx.fillStyle='#fff4d2';ctx.fillRect(gauge.x+.25,gauge.y+gauge.h*(1-tankFraction),gauge.w-.5,gauge.h*tankFraction)
  for(let i=0;i<=4;i++){ctx.fillStyle='#b8a68b';ctx.fillRect(gauge.x+gauge.w-.75,gauge.y+gauge.h*i/4,1.7,.65)}
  const fill=clamp((g.beans+g.grinding*(1-progress(t,g.grind)))/g.data.capacity.hopper)*(g.hopperFill?progress(t,g.hopperFill):1)
  if(fill>0){const r=rects['bean-fill'];if(r){ctx.save();ctx.beginPath();ctx.rect(r.x,r.y+r.h*(1-fill),r.w,r.h*fill+1);ctx.clip();fixed('bean-fill');ctx.restore()}}
  if(g.grind){
   const fraction=progress(t,g.grind)
   ctx.save();ctx.lineCap='round';ctx.lineWidth=3.4;ctx.strokeStyle='#382619'
   ctx.beginPath();ctx.arc(255,330,11.5,0,Math.PI*2);ctx.stroke()
   ctx.strokeStyle='#f1c26e';ctx.beginPath();ctx.arc(255,330,11.5,-Math.PI/2,-Math.PI/2+2*Math.PI*fraction);ctx.stroke();ctx.restore()
  }
  beanBags.forEach((bag,i)=>layer(bag.key,bag.x-40,bag.y-bag.h,80,bag.h,()=>{
   if(!g.bagCounts[i]||lifting?.kind==='beans'&&lifting.bag===i)return
   ctx.save();ctx.fillStyle='rgba(52,29,12,.35)';ctx.beginPath();ctx.ellipse(bag.x,162,28,3,0,0,Math.PI*2);ctx.fill();ctx.restore()
   prop(bag.key,bag.x,bag.y,bag.h)
  }))
  image('hot-spigot',459,486,30,56)
  for(const [h,group] of g.groups.entries()){
   brewGroup(ctx,image,group,h,t,h===selectedHead)
   if(g.basket==='mounted'||g.serviceHead!==h)layer('filter/'+h,filterSockets[h]-44,502,88,70,()=>lockImage('lock-8',filterSockets[h],514))
   if(group.flush){stream(heads[h],520,heads[h],576,'#d8e8e1');vapor(heads[h],531,t,1.15,true)}
   const run=group.extraction
   for(let lane=0;lane<group.pots.length;lane++){
    if(lifting?.kind==='pot'&&lifting.head===h&&lifting.lane===lane)continue
    if(g.pouringFrom('transfer',h,lane))continue
    const pt=brewPoint(h,lane)
    const amount=run?.lane===lane?doseVolume(run.shot)*phase(progress(t,run),.13,.95):doseVolume(group.pots[lane])
    shotGlass(ctx,image,pt.x,pt.y,glassHeight,0,amount,run?.lane===lane?run.shot:group.pots[lane])
   }
   extraction(ctx,group,h,t)
  }
  const basket=g.basket,pose=filterPose(g,t),job=progress(t,g.basketCycle)
  if(basket!=='mounted'&&lifting?.kind!=='handle'){
   const h=basket==='dosed'||basket==='grinding'?47:49
   layer('loose-filter',pose.x-32,pose.y-16,112,65,()=>{
   if(pose.lock!==null)lockImage('lock-'+pose.lock,pose.x,pose.y)
   else{
    const flip=basket==='knocking'&&job>.18&&job<.78
    const key=flip?(job<.31||job>.67?'filter-edge':'filter-inverted'):filterTexture(g)
    paintFilter(key,pose.x,pose.y,h,flip?-.035:pose.angle)
    if(basket==='grinding'){ctx.save();ctx.globalAlpha=progress(t,g.grind);paintFilter('filter-loose',pose.x,pose.y,h,pose.angle);ctx.restore();stream(255,380,255,394,'#835531')}
    if(basket==='dosed'||basket==='grinding'||g.assistedService&&basket==='emptyHeld')image('grinder-fork-front',227,386,56,25)
   }
   if(basket==='knocking'&&job>.43&&job<.78)prop('puck',80,686+24*((job-.43)/.35)**2,17,job)
   })
  }
  if(lifting?.kind!=='tamper'){
   const approach=basket==='tamping'?Math.min(1,job/.4,(1-job)/.36):0
   const x=mix(360,304,approach),y=mix(701,715,approach)-18*Math.sin(Math.PI*approach)
   const im=textures.get('new-tamper')!,w=49*im.width/im.height
   layer('tamper',x-w/2,y-49*.93,w,49,()=>image('new-tamper',x-w/2,y-49*.93,w,49))
  }
  for(const texture of ['silky','airy'] as const){
   const job=g.steamJobs[texture],pt=milkSpouts[texture],ingredient=texture==='silky'?'milk':'foam'
   const work=job?progress(t,job):0
   const level=(g.textures[texture]+(job?job.amount*milkCycle(texture,work).charge:0))/g.data.capacity.milkBatch
   const present=!g.pouringFrom(ingredient)&&!(lifting?.kind==='add'&&lifting.add===ingredient)
   const port={x:texture==='silky'?1167:1207,y:295}
   layer('milk/'+texture,pt.x-25,295,50,82,()=>drawSteamLane(ctx,milkArt,texture,pt,port,level,work,t,present))
  }
  layer('fridge',1450,231,211,152,()=>drawColdStation(ctx,g,t,k=>textures.get(k)!,fixed,prop))

  layer('mini-rack',1456,175,196,79,()=>{
   // One continuous brass-edged wooden foot visually joins the four bins.
   ctx.save();ctx.fillStyle='#6b3d22';ctx.strokeStyle='#bf955d';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(1457,245);ctx.lineTo(1652,205);ctx.lineTo(1652,214);ctx.lineTo(1457,254);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()
   for(const seat of miniRack){
    const {x,y,food}=seat
    image('new-pastry-bin',x-26,y-40,52,40)
    if(food){
     const held=lifting?.kind==='supply'&&lifting.station===(food==='raw'?'oven':'press')
     const count=preview?.selected==='mini-rack'&&preview.state==='empty'?0:preview?.selected==='mini-rack'&&preview.state==='working'?1:2-Math.min(2,g.foodFlights.filter(f=>f.food===food).length+Number(held))
     for(let n=0;n<count;n++)prop(food,x-10+n*18,y-9-n*4,17)
    }
    image('new-pastry-bin-lip',x-26,y-40,52,40)
   }
  })
  const carton=finishSources.coldmilk
  layer('cold-milk',carton.x-30,carton.y-carton.h,60,carton.h,()=>{if(g.milkReserve&&!(lifting?.kind==='add'&&lifting.add==='coldmilk')&&!g.pouringFrom('coldmilk'))prop('new-milk-carton',carton.x,carton.y,carton.h)})
  // Dedicated brass-edged syrup rail, layered over the existing shelf only.
  layer('syrup-shelf',1429,482,236,46,()=>{
   ctx.save();ctx.fillStyle='#523020';ctx.strokeStyle='#d6b17a';ctx.lineWidth=2
   ctx.beginPath();ctx.moveTo(1430,482);ctx.lineTo(1665,520);ctx.lineTo(1665,528);ctx.lineTo(1430,490);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()
  })
  for(const key of syrupKeys){
   const {x,y,h}=finishSources[key],im=textures.get(key)!,w=h*im.width/im.height
   const job=g.pours.find(j=>j.action===key),travel=preview?.selected==='syrup/'+key&&preview.state==='working'?1:job?Math.sin(Math.PI*phase(progress(t,job),.3,.72)):0
   const cut=Math.round(im.height*.26),headH=h*cut/im.height
   layer('syrup/'+key,x-w/2,y-h,w,h,()=>{
   ctx.drawImage(im,0,cut,im.width,im.height-cut,x-w/2,y-h+headH,w,h-headH)
   ctx.drawImage(im,0,0,im.width,cut,x-w/2,y-h+travel*5,w,headH)
   })
  }
  const citrus=citrusPress,jug=citrus.carafe,work=g.citrus?progress(t,g.citrus):0
  layer('citrus',citrus.x-45,citrus.y-citrus.h,90,citrus.h,()=>{
  ctx.save();ctx.shadowColor='rgba(27,12,5,.7)';ctx.shadowBlur=6;ctx.shadowOffsetY=4;prop('citrus-press',citrus.x,citrus.y,citrus.h);ctx.restore()
  if(g.citrus){
   const cx=citrus.x-2,cy=citrus.y-citrus.h*.88+Math.sin(t)*.9
   ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*.9)*.08)
   const peel=ctx.createRadialGradient(-5,-6,0,0,0,16);peel.addColorStop(0,'#ffdf78');peel.addColorStop(.58,'#eba534');peel.addColorStop(1,'#b75b11')
   ctx.fillStyle=peel;ctx.beginPath();ctx.ellipse(0,0,13,9,0,Math.PI,Math.PI*2);ctx.fill()
   ctx.fillStyle='#ffe2a0';ctx.fillRect(-12,0,24,1.4);ctx.restore()
  }
  if(!g.pouringFrom('orange')&&!(lifting?.kind==='add'&&lifting.add==='orange')){
   prop('carafe-empty',jug.x,jug.y,jug.h)
   const filled=g.citrus?Math.max(work,g.orangeStock/g.data.capacity.citrus):g.orangeStock/g.data.capacity.citrus
   if(filled){ctx.save();ctx.beginPath();ctx.rect(jug.x-32,jug.y-jug.h*(.15+.85*filled),64,jug.h);ctx.clip();prop('orange-carafe',jug.x,jug.y,jug.h);ctx.restore()}
  }
  })
  for(const station of ['oven','press'] as const){
   const box=frontHot[station]
   hotAppliance(g,t,station,box.x,box.y,box.w,box.h)
  }
  layer('microwave',1112,440,134,126,()=>{fixed(g.microReady?'microwave-open':'microwave');if(g.microReady)prop('baked',1180,539,26)})
  layer('ice',iceRim.x,iceRim.y,iceRim.w,iceRim.h,()=>{
   image('empire_ice_brass_rim',iceRim.x,iceRim.y,iceRim.w,iceRim.h)
   iceWell(ctx,prop,g.ice-(heldIce&&gatherAge()>155?Math.min(g.ice,heldIce.portions):0),g.data.capacity.ice)
   if(!heldIce&&!g.pouringFrom('ice')){
    ctx.save();iceBasinClip(ctx);ctx.fillStyle='rgba(23,15,10,.32)';ctx.beginPath();ctx.ellipse(iceScoopHome.x-9,iceScoopHome.y-5,25,5,0,0,Math.PI*2);ctx.fill();ctx.restore()
    prop('empire_ice_scoop',iceScoopHome.x,iceScoopHome.y,iceScoopHome.h,iceScoopHome.angle)
   }
   image('empire_ice_front_lip',iceRim.x,iceRim.y,iceRim.w,iceRim.h)
  })
  if(!g.kitchen){
   const bin=servicePass.carafes
   image('service-well',bin.x,bin.y,bin.w*.49,bin.h)
   image('service-well',bin.x+bin.w*.5,bin.y+1,bin.w*.49,bin.h)
   if(g.teaStock&&!(lifting?.kind==='add'&&lifting.add==='tea'))prop('tea-carafe',1497,831,64)
   if(g.blendStock&&!(lifting?.kind==='add'&&lifting.add==='cold'))prop('blend-carafe',1595,833,68)
  }
  drawCupRacks(ctx,image,prop,g,lifting,layer,preview?.map)
  drawWastePress(ctx,image,prop,g,t,404,748,142,193)
  const {pesto,brownie}=frontGalley
  if(lifting?.kind!=='pesto')prop('pesto',pesto.x,pesto.y+30,55)
  image('old-plate',brownie.x-46,brownie.y+9,92,22)
  prop('brownie',brownie.x-13,brownie.y+20,31,-.045)
  prop('brownie',brownie.x+12,brownie.y+23,32,.07)
  const shots=servicePass.shots.well
  layer('shot-reserve',shots.x,shots.y,shots.w,shots.h,()=>{
   image('service-well',shots.x,shots.y,shots.w,shots.h)
   for(const [i,stored] of g.shotReserve.entries()){
    const seat=pocketSeat('shots',i)
    ctx.save();ctx.fillStyle='rgba(42,30,23,.65)';ctx.strokeStyle='#d3b789';ctx.lineWidth=1.15
    ctx.beginPath();ctx.ellipse(seat.x,seat.y-1,15,5.2,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()
    if(!stored||lifting?.kind==='pot'&&lifting.head===reserveHead&&lifting.lane===i)continue
    const job=g.stagedShotMotion.get(i),p=job?progress(t,job):1
    const from=job?brewPoint(job.head,job.lane):seat
    shotGlass(ctx,image,mix(from.x,seat.x,p),mix(from.y,seat.y,p)-Math.sin(Math.PI*p)*31,mix(glassHeight,glassHeight*.88,p),0,doseVolume(stored),stored)
   }
  })
  const outputs=g.foodOutputs
  const stagedFood=(slot:number)=>{
   const food=g.foodAt(slot),seat=frontFoodSeat(slot,g.towel.length)
   if(!food||outputs.some(j=>j.towelSlot===slot)||lifting?.kind==='food'&&lifting.slot===slot)return
   if(slot<g.towel.length)image('old-plate',seat.x-32,seat.y-12,64,17)
   prop(food.food==='pesto'?'grilled-pesto':food.food,seat.x,seat.y,seat.h)
  }
  for(const section of ['panini','pastries'] as const){
   const bay=servicePass[section],r=bay.well,first=g.towel.length+(section==='panini'?0:servicePass.panini.capacity)
   layer(section==='panini'?'panini-reserve':'pastry-reserve',r.x,r.y,r.w,r.h,()=>{
    image('service-well',r.x,r.y,r.w,r.h)
    for(let i=0;i<bay.capacity;i++)stagedFood(first+i)
   })
  }
  for(let i=0;i<g.towel.length;i++)stagedFood(i)
  for(let i=0;i<g.cups.length;i++){
   const x=cupsX[i],c=g.cups[i];prop('old-plate',x,674,24)
   if(!c||lifting?.kind==='cup'&&lifting.slot===i)continue;const h=vesselHeight(c.cup,c.size)
   const transit=g.pouringAt(i)
   if(!transit){drink(c,x,stageCupY,h);continue}
   const p=progress(t,transit),a=transit.action
   const visual={...c,poured:c.poured||a==='transfer',add:a==='transfer'?c.add:[...c.add,a]}
   const amount=fillProgress(p),iceProgress=phase(p,.33,.76)
   const im=textures.get(activeCupId(c.cup,c.size))!,geo=activeCupGeometry(c,x,stageCupY,h,im.width/im.height)
   const {shape,w,cx,rim}=geo
   const fill=mix(drinkLook(c).fill,drinkLook(visual).fill,amount)
   // Stop the exterior stream at the opening of an opaque vessel; the contents are hidden.
   const landed=shape.glass?liquidTop(geo,fill):rim
   if(isSyrup(a)){
    const pump=finishSources[a],im=textures.get(a)!,nozzle={x:pump.x-pump.h*im.width/im.height*.43,y:pump.y-pump.h*.89+Math.sin(Math.PI*phase(p,.3,.72))*5}
    const reach=Math.min(phase(p,0,.30),1-phase(p,.73,1)),xx=mix(x,nozzle.x-(cx-x),reach),yy=mix(stageCupY,stageCupY+nozzle.y+11-rim,reach)
    drink(visual,xx,yy,h,c,amount)
    if(p>.3&&p<.73)flowing(nozzle,{x:xx+cx-x,y:yy-stageCupY+landed},p,tool(a,0,0).color,2.2)
    continue
   }
   if(a==='water'){
    const reach=Math.min(phase(p,0,.28),1-phase(p,.77,1)),xx=mix(x,463,reach),yy=mix(stageCupY,621,reach)
    drink(visual,xx,yy,h,c,amount)
    if(p>.28&&p<.79){flowing({x:460,y:540},{x:xx+(cx-x),y:yy-stageCupY+landed},p,'#d6e8ee',2.4);steam(xx,yy-h,t)}
    continue
   }
   const release=releases.get(g)?.get(i)
   const matches=release?.tick===transit.start&&(a==='transfer'?release.carry.kind==='pot'&&release.carry.head===transit.head&&release.carry.lane===transit.lane:release.carry.kind==='add'&&release.carry.add===a)
   const spec=tool(a,transit.head??0,transit.lane??0),toolIm=pourTools.get(spec.key)!
   const pose=pourPose(a,p,transit.head??0,transit.lane??0,{x:cx,y:rim},toolIm.width/toolIm.height,matches?release:undefined)
   drink(visual,x,stageCupY,h,c,amount,a==='ice'?iceProgress:1)
   if(a==='ice'){
    const portions=icePortions(c.size,g.data.capacity.largePortions),count=iceCubeCount(portions)
    scoopWithIce(ctx,prop,pose.x,pose.y,pose.h,pose.angle,matches?1:phase(p,.055,.145),iceProgress,portions)
    const cubeHeight=Math.min(w*shape.rx*.69,h*.20)
    for(let j=0;j<count;j++){
     const start=iceCubeStart(j,count),drop=phase(iceProgress,start,start+.30)
     if(drop>0&&drop<1)prop('cube-'+(j%3+1),mix(pose.lip.x,cx,drop)+Math.sin(Math.PI*drop)*(j-1)*3,mix(pose.lip.y,rim,drop*drop),cubeHeight,(j-1)*drop*.23)
    }
   }else{
    if(a==='milk'||a==='foam'){
     const texture=a==='milk'?'silky':'airy'
     const portion=c.size==='Large'?g.data.capacity.largePortions:1
     const amountLeft=(g.textures[texture]+portion*(1-pose.pour))/g.data.capacity.milkBatch
     steamedPitcher(texture,pose.x,pose.y,pose.h,pose.angle,amountLeft,0,t)
    }else if(a==='transfer')shotGlass(ctx,image,pose.x,pose.y,pose.h,pose.angle,doseVolume(c.shot)*(1-pose.pour),c.shot)
    else prop(spec.key,pose.x,pose.y,pose.h,pose.angle)
    flowing(pose.lip,{x:cx,y:landed},p,spec.color,a==='foam'||a==='cold'?5:2.7)
   }

  }
  for(const job of g.foodFlights){
   const station=job.food==='raw'?'oven':'press',start=foodBins[job.food],p=progress(t,job)
   const slots=station==='oven'?g.ovenSlots:g.pressSlots,rawEnd=rackPosition(station,job.slot,slots.length,frontHot[station]),end=station==='press'?{...rawEnd,...frontPressPoint(rawEnd.x,rawEnd.y)}:rawEnd
   prop(job.food==='panino'&&slots[job.slot].pesto?'panino-pesto':job.food,mix(start.x,end.x,p),mix(start.y,end.y,p)-Math.sin(p*Math.PI)*60,mix(17,end.h,p),Math.sin(p*Math.PI)*.18)
  }
  for(const job of g.foodOutputs){
   if(lifting?.kind==='food'&&lifting.slot===job.towelSlot||t>=job.end)continue
   const slots=job.station==='oven'?g.ovenSlots:g.pressSlots,rawStart=rackPosition(job.station,job.slot,slots.length,frontHot[job.station]),start=job.station==='press'?{...rawStart,...frontPressPoint(rawStart.x,rawStart.y)}:rawStart
   const p=progress(t,job)
   const end=frontFoodSeat(job.towelSlot,g.towel.length)
   prop(job.food==='pesto'?'grilled-pesto':job.food,mix(start.x,end.x,p),mix(start.y,end.y,p)-Math.sin(Math.PI*p)*41,mix(start.h,end.h,p),Math.sin(Math.PI*p)*-.13)
  }
  for(const d of g.deliveries){
   const palm=palms.get(d.guest);if(!palm||t>=d.end)continue
   const p=progress(t,d),seat=frontFoodSeat(d.slot,g.towel.length),fromX=d.drink?cupsX[d.slot]:seat.x
   const fullHeight=d.drink?vesselHeight(d.drink.cup,d.drink.size):seat.h
   drawServing(d,mix(fromX,palm.x,p),mix(d.drink?stageCupY:seat.y,palm.y,p)-58*Math.sin(Math.PI*p),mix(fullHeight,palm.height,p))
  }
  if(heldIce){
   const p=scoopPose(gatherAge(),heldIce.pointer)
   scoopWithIce(ctx,prop,p.x,p.y,iceScoopHome.h,p.angle,p.load,0,heldIce.portions)
  }
 }
 function kitchen(g:Bench,t:number){
  drawRearKitchen(g,t,lifting,{ctx,image,prop,vapor,appliance:hotAppliance})
 }
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)')
 const draw=(g:Bench,frac:number,selectedHead:number,visible:Rect,held:Carry|null=null,swipe:Slide|null=null,layerPreview:{map:LayerMap;selected:string;state:PreviewState}|null=null)=>{preview=layerPreview;lifting=held;const t=g.tick+frac,sx=canvas.width/visible.w,sy=canvas.height/visible.h
  ctx.setTransform(sx,0,0,sy,-visible.x*sx,-visible.y*sy);ctx.fillStyle='#332b22';ctx.fillRect(0,0,stage.w,stage.h)
  const view=(v:End|'Kitchen')=>v==='Kitchen'?kitchen(g,t):front(g,v,t,selectedHead)
  const destination=g.turn?.to??swipe?.to
  if(!destination){view(g.view);return}
  const travel=g.turn?progress(t,g.turn):0
  const from=swipe?.fraction??0
  const eased=g.turn?from+(1-from)*travel*travel*(3-2*travel):from
  if(reducedMotion.matches){view(eased<.5?g.view:destination);return}
  const direction=destination==='Kitchen'?1:g.view==='Kitchen'?-1:destination==='Window'?1:-1
  const distance=stage.w*direction
  const paintMovingView=(place:End|'Kitchen',offset:number)=>{
   ctx.save();ctx.translate(offset,0);ctx.beginPath();ctx.rect(0,0,stage.w,stage.h);ctx.clip();view(place);ctx.restore()
  }
  paintMovingView(g.view,-eased*distance)
  paintMovingView(destination,(1-eased)*distance)

 }
 function carried(item:Carry,g:Bench){
  let key='filter-tamped',h=43,contents:Drink|null=null,angle=0
  switch(item.kind){
   case 'supply':{key=item.station==='oven'?'raw':'panino';h=g.kitchen?(item.station==='oven'?38:42):17;break}
   case 'pesto':key='pesto';h=g.kitchen?80:55;break
   case 'bakedSlot':{
    key=item.station==='oven'?'baked':g.pressSlots[item.slot]?.pesto?'grilled-pesto':'grilled';const count=item.station==='oven'?g.ovenSlots.length:g.pressSlots.length
    h=rackFoodHeight(item.station,g.kitchen?(item.station==='oven'?278:304):frontHot[item.station].w,count);break
   }
   case 'cup':{contents=g.cups[item.slot];if(contents){key=activeCupId(contents.cup,contents.size);h=vesselHeight(contents.cup,contents.size)}break}
   case 'food':{const f=g.foodAt(item.slot);key=f?.food==='pesto'?'grilled-pesto':f?.food??'brownie';h=g.kitchen?62:frontFoodSeat(item.slot,g.towel.length).h;break}
   case 'holder':{const b=holders[item.index];key=activeCupId(b.cup,b.size);h=b.h;break}
   case 'pot':key='shot-glass';h=glassHeight*(item.head===reserveHead?.88:1);break
   case 'beans':key=beanBags[item.bag].key;h=96;break
   case 'handle':key=filterTexture(g);h=g.basket==='dosed'?47:49;break
   case 'tamper':key='new-tamper';h=49;break
   case 'add':{
    const a=item.add
    if(isSyrup(a)){
     // Drag the dose. The bottle and its plunger remain bolted to the shelf.
     const ghost=document.createElement('canvas');ghost.width=56;ghost.height=72
     const pen=ghost.getContext('2d')!,tint=tool(a,0,0).color
     const shine=pen.createRadialGradient(20,44,0,28,48,22)
     shine.addColorStop(0,'#fff1bf');shine.addColorStop(.31,tint);shine.addColorStop(1,tint)
     pen.fillStyle=shine;pen.strokeStyle='#4d2a1e';pen.lineWidth=1.6;pen.beginPath()
     pen.moveTo(28,4);pen.bezierCurveTo(27,24,6,37,7,51);pen.bezierCurveTo(8,77,49,76,49,51);pen.bezierCurveTo(49,37,31,24,28,4)
     pen.fill();pen.stroke();return {canvas:ghost,logicalWidth:23,logicalHeight:29}
    }
    if(a==='coldmilk'){key='new-milk-carton';h=finishSources[a].h}
    else if(a==='orange'){key='orange-carafe';h=citrusPress.carafe.h}
    else if(a==='ice'){key='empire_ice_scoop';h=iceScoopHome.h;angle=-.15}
    else if(a==='water'){key='old-clean-tin';h=43}
    else if(a==='tea'||a==='cold'){key=a==='tea'?'tea-carafe':'blend-carafe';h=a==='tea'?64:68}
    else{key='new-milk-pitcher';h=40}
    break
   }
  }
  const im=textures.get(key)!
  if(item.kind==='holder')h=activeCupGeometry({cup:holders[item.index].cup,size:holders[item.index].size,lid:false},0,0,h,im.width/im.height).h
  const w=h*im.width/im.height,pad=angle?Math.ceil(w*.17):2
  const logicalWidth=Math.ceil(w+pad*2),logicalHeight=Math.ceil(h+pad*2)
  const ghost=document.createElement('canvas');ghost.width=logicalWidth*2;ghost.height=logicalHeight*2
  const original=ctx;ctx=ghost.getContext('2d')!
  try{
   ctx.scale(2,2);if(contents)drink(contents,logicalWidth/2,h+pad,h);else if(item.kind==='add'&&(item.add==='milk'||item.add==='foam')){
    const texture=item.add==='milk'?'silky':'airy'
    steamedPitcher(texture,logicalWidth/2,h+pad,h,0,g.textures[texture]/g.data.capacity.milkBatch,0,g.tick)
   }else if(item.kind==='pot')shotGlass(ctx,image,logicalWidth/2,h+pad,h,angle,doseVolume(g.pitcherBank(item.head)?.[item.lane]??null),g.pitcherBank(item.head)?.[item.lane]??null)
   else prop(key,logicalWidth/2,h+pad,h,angle)
  }finally{ctx=original}
  return {canvas:ghost,logicalWidth,logicalHeight}
 }
 function shotIcon(shot:'short'|'standard'){
  const art=document.createElement('canvas')
  art.width=128;art.height=100
  const pen=art.getContext('2d')!,glass=textures.get('shot-glass')!
  shotGlass(pen,(_key,x,y,w,h)=>pen.drawImage(glass,x,y,w,h),64,98,96,0,doseVolume(shot),shot)
  return art
 }
 return {shotIcon,draw,overhead,carried,releaseIngredient,beginIce,moveIce,setIcePortions,stopIce,releaseIce}
}
