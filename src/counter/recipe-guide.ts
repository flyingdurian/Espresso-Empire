import {activeCupId,activeCupPath} from './active-cup.ts'
import {takeCup,type Bench,type Add,type End} from './bench.ts'
import {ounces} from './station-layout.ts'
import {activeOrderIds,orderNumber,orderRecipe,ingredientProgress} from './order-guide.ts'
const icons:Record<Add,string>={
 milk:'/surfaces/silky.webp',foam:'/surfaces/airy.webp',coldmilk:'/station/milk-carton.webp',
 ice:'/counter/scoop-loaded.webp',water:'/art/water-urn.webp',tea:'/counter/tea-carafe.webp',
 orange:'/station/orange-carafe.webp',vanilla:'/pantry/vanilla.webp',cherry:'/pantry/cherry.webp',cold:'/counter/blend-carafe.webp',matcha:'/pantry/matcha.webp',cocoa:'/pantry/cocoa.webp',caramel:'/pantry/caramel.webp',
 strawberryDrizzle:'/empire_toppings/empire_strawberry_drizzle.webp',caramelDrizzle:'/empire_toppings/empire_caramel_drizzle.webp',cinnamonDust:'/empire_toppings/empire_cinnamon_dust.webp',cocoaDust:'/empire_toppings/empire_cocoa_dust.webp'
}
function image(path:string){const img=new Image();img.alt='';img.src=path;return img}
function node<K extends keyof HTMLElementTagNameMap>(type:K,text='',cls=''){const el=document.createElement(type);el.className=cls;el.textContent=text;return el}
export function recipeGuide(focus:HTMLElement,index:HTMLElement,scroll:HTMLElement,shotIcon:(shot:'short'|'standard')=>HTMLCanvasElement,visit?:(end:End)=>void){
 let pin:string|null=null,pinnedGuest:number|null=null,autoGuest:number|null=null,lastFocus='',lastKey='',lastGame:Bench|undefined
 const reset=()=>{pin=null;pinnedGuest=null;autoGuest=null;lastKey='';lastFocus=''}
 function update(g:Bench){
  if(g!==lastGame){reset();lastGame=g}
  const cfg=g.data,ids=activeOrderIds(g)
  if(pinnedGuest!==null&&!ids.includes(pinnedGuest)){pinnedGuest=null;pin=null}
  const drinks=ids.filter(i=>cfg.orders[i].drink&&!g.guests[i].gotDrink)
  if(autoGuest===null||!ids.includes(autoGuest)||g.guests[autoGuest].gotDrink&&drinks.length>0)autoGuest=drinks.find(i=>cfg.orders[i].end===g.view)??drinks[0]??ids[0]??null
  const orderIndex=pinnedGuest??(pin===null?autoGuest??undefined:undefined),order=orderIndex===undefined?null:cfg.orders[orderIndex]
  const id=order?.drink??pin??cfg.orders.find(o=>o.drink)?.drink??Object.keys(cfg.recipes)[0]
  const r=orderIndex!==undefined?orderRecipe(g,orderIndex):cfg.recipes[id],c=g.source==='cup'?g.cups[g.selected]:null
  const done=r?ingredientProgress(g,orderIndex,r,c):null
  const key=JSON.stringify([id,orderIndex,ids.map(i=>[i,g.guests[i].gotDrink,g.guests[i].gotFood]),pin,done,g.view,g.selected]);if(key===lastKey)return;lastKey=key
  const focusKey=id+'-'+orderIndex;if(focusKey!==lastFocus){lastFocus=focusKey;scroll.scrollTop=0}
  focus.replaceChildren()
  focus.append(node('small',order?`#${orderNumber(orderIndex!)} · ${order.name} · ${order.end} · ${order.mode}`:'From the recipe book','book-source'))
  if(r&&(!order||!g.guests[orderIndex!].gotDrink)){
   const cup=order?.mode==='To go'?r.travelCup:r.cup
   focus.append(node('h3',r.name))
   const strip=node('div','','ingredients')
   const ingredient=(src:string,name:string,type:string,complete:boolean)=>{const item=node('div','','ingredient '+type+(complete?' complete':''));const icon=node('span','','ingredient-art')
    if(type==='coffee'&&r.shot)icon.append(shotIcon(r.shot))
    else if(type==='milk'||type==='foam'){icon.append(image('/station/milk-pitcher.webp'));const sample=image(src);sample.className='sample';icon.append(sample)}
    else icon.append(image(src))
    item.append(icon,node('b',name));if(complete){const mark=node('span','✓','ingredient-check');mark.setAttribute('aria-label','Completed');item.append(mark)}strip.append(item)
   }
   ingredient(cup==='mug'?'/counter/mug-empty.webp':activeCupPath(activeCupId(cup,order?.size??'Medium')),(order&&takeCup(cup)?ounces(order.size)+' ':'')+cfg.cups[cup],'vessel',!!done?.vessel)
   if(r.shot)ingredient('/surfaces/'+r.shot+'.webp',r.shot==='short'?'Short shot':'Standard shot','coffee',!!done?.coffee)
   r.add.forEach((add,i)=>ingredient(icons[add],cfg.finishes[add],add,!!done?.adds[i]))
   focus.append(strip)
   if(c)focus.append(node('small',`Saucer ${g.selected+1} · completed ingredients`,'book-progress'))
  }
  if(order&&g.view!==order.end&&visit){const go=node('button',`Go to ${order.end}`,'book-visit');go.onclick=()=>visit(order.end);focus.append(go)}
  if(order?.food&&!g.guests[orderIndex!].gotFood)focus.append(node('h3',cfg.foods[order.food].name))
  index.replaceChildren();if(ids.length)index.append(node('h4','Active orders'))
  for(const i of ids){const o=cfg.orders[i],v=g.guests[i],name=[o.drink&&!v.gotDrink?cfg.recipes[o.drink].name+(o.toppings?.length?' + '+o.toppings.map(t=>cfg.finishes[t]).join(', '):''):'',o.food&&!v.gotFood?cfg.foods[o.food].name:''].filter(Boolean).join(' + '),b=node('button',`#${orderNumber(i)} [${o.end}] ${name}`,'book-order');b.title=o.name;b.setAttribute('aria-pressed',String(orderIndex===i));b.onclick=()=>follow(g,i);index.append(b)}
  index.append(node('h4','All recipes'))
  for(const recipe of Object.keys(cfg.recipes)){const b=node('button',cfg.recipes[recipe].name);b.setAttribute('aria-pressed',String(orderIndex===undefined&&recipe===id));b.onclick=()=>{pinnedGuest=null;pin=recipe;lastKey='';update(g);scroll.scrollTop=0};index.append(b)}
 }
 function follow(g:Bench,i:number){if(g!==lastGame){reset();lastGame=g}if(!activeOrderIds(g).includes(i))return;pinnedGuest=i;pin=null;lastKey='';update(g);scroll.scrollTop=0}
 return {update,reset,follow}
}
