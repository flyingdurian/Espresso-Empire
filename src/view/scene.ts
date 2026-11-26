import type {Content} from '../content/model.ts'
import {zone,type Snapshot} from '../sim/simulation.ts'
import {drawElevation} from './drawing.ts'
export async function createScene(host:HTMLElement,content:Content) {
  const source=document.createElement('canvas')
  let sync=()=>{}
  // The same diagram remains available on devices without a working GPU context.
  try {
    const {Application,Sprite,Texture}=await import('pixi.js')
    const app=new Application()
    await app.init({width:1000,height:550,backgroundAlpha:0,autoStart:false,preference:'webgl',antialias:true})
    source.width=1500;source.height=825
    const texture=Texture.from(source),sprite=new Sprite(texture)
    sprite.width=1000;sprite.height=550;app.stage.addChild(sprite);host.append(app.canvas)
    sync=()=>{texture.source.update();app.render()}
    host.dataset.renderer='PixiJS'
  } catch {
    host.append(source);host.dataset.renderer='Canvas 2D'
  }
  let previous=''
  return (s:Snapshot,selected:string)=>{
    const key=[s.section,selected,...s.orders.map(o=>o.remaining?zone(o,content.tuning.zoneBoundaries):'elapsed')].join('/')
    if(key===previous) return
    previous=key;drawElevation(source,content,s,selected);sync()
  }
}
