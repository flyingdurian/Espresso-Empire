import {takeCup,type Bench,type Add} from './bench.ts'
import {ounces} from './station-layout.ts'

const icons:Record<Add,string>={
 milk:'/surfaces/silky.webp',foam:'/surfaces/airy.webp',coldmilk:'/station/milk-carton.webp',
 ice:'/counter/scoop-loaded.webp',water:'/art/water-urn.webp',tea:'/counter/tea-carafe.webp',
 orange:'/station/orange-carafe.webp',vanilla:'/pantry/vanilla.webp',cherry:'/pantry/cherry.webp',cold:'/counter/blend-carafe.webp',matcha:'/pantry/matcha.webp',cocoa:'/pantry/cocoa.webp',caramel:'/pantry/caramel.webp'
}
function image(path:string){const img=new Image();img.alt='';img.src=path;return img}
function node<K extends keyof HTMLElementTagNameMap>(type:K,text='',cls=''){const el=document.createElement(type);el.className=cls;el.textContent=text;return el}
export function recipeGuide(focus:HTMLElement,index:HTMLElement,scroll:HTMLElement,shotIcon:(shot:'short'|'standard')=>HTMLCanvasElement){
 let pin:string|null=null,pinnedGuest:number|null=null,lastFocus='',lastKey='',lastGame:Bench|undefined,lastView='',lastIds:number[]=[]
 const reset=()=>{pin=null;pinnedGuest=null;lastKey='';lastIds=[];lastFocus=''}
 function update(g:Bench){
  const cfg=g.data,ids=g.guests.flatMap((v,i)=>v.state==='waiting'&&!v.gotDrink&&cfg.orders[i].end===g.view&&cfg.orders[i].drink?[i]:[])
  if(g!==lastGame||lastView!==g.view){reset();lastGame=g;lastView=g.view}
  if(pin&&lastIds.some(i=>cfg.orders[i].drink===pin)&&!ids.some(i=>cfg.orders[i].drink===pin))pin=null
  if(pinnedGuest!==null&&!ids.includes(pinnedGuest))pinnedGuest=null
  lastIds=ids
  const active=ids.map(i=>cfg.orders[i].drink!),id=pin??active[0]??cfg.orders.find(o=>o.drink)?.drink??Object.keys(cfg.recipes)[0]
  const orderIndex=pinnedGuest??ids.find(i=>cfg.orders[i].drink===id),order=orderIndex===undefined?null:cfg.orders[orderIndex]
  const key=[id,ids.join(','),pin,orderIndex].join('|');if(key===lastKey)return;lastKey=key
  const focusKey=id+'-'+orderIndex;if(focusKey!==lastFocus){lastFocus=focusKey;scroll.scrollTop=0}
  const r=cfg.recipes[id],cup=order?.mode==='To go'?r.travelCup:r.cup
  focus.replaceChildren()
  focus.append(node('small',order?order.name+' · '+order.mode:'From the recipe book','book-source'),node('h3',r.name))
  const strip=node('div','','ingredients')
  const ingredient=(src:string,name:string,type:string)=>{const item=node('div','','ingredient '+type);const icon=node('span','','ingredient-art')
   if(type==='coffee'&&r.shot){icon.append(shotIcon(r.shot))}
   else if(type==='milk'||type==='foam'){
    icon.append(image('/station/milk-pitcher.webp'))
    const sample=image(src);sample.className='sample';icon.append(sample)
   }else icon.append(image(src))
   item.append(icon,node('b',name));strip.append(item)}
  ingredient('/counter/'+cup+'-empty.webp',(order&&takeCup(cup)?ounces(order.size)+' ':'')+cfg.cups[cup],'vessel')
  if(r.shot)ingredient('/surfaces/'+r.shot+'.webp',r.shot==='short'?'Short shot':'Standard shot','coffee')
  for(const add of r.add)ingredient(icons[add],cfg.finishes[add],add)
  focus.append(strip)
  const group=(title:string,list:{recipe:string;guest?:number}[])=>{
   if(!list.length)return
   index.append(node('h4',title))
   for(const {recipe,guest} of list){
    const rec=cfg.recipes[recipe],b=node('button',guest===undefined?rec.name:rec.name+' · '+cfg.orders[guest].name)
    b.setAttribute('aria-pressed',String(recipe===id&&(guest===undefined||orderIndex===guest)));b.onclick=()=>{pinnedGuest=guest??null;pin=recipe;lastKey='';update(g);scroll.scrollTop=0}
    index.append(b)
   }
  }
  index.replaceChildren();group('At this counter',ids.map(i=>({recipe:cfg.orders[i].drink!,guest:i})));group('All recipes',Object.keys(cfg.recipes).filter(k=>!active.includes(k)).map(recipe=>({recipe})))
 }
 function follow(g:Bench,i:number){
  update(g);const id=g.data.orders[i]?.drink
  if(!id||g.guests[i].gotDrink)return
  pinnedGuest=i;pin=id;lastKey='';update(g);scroll.scrollTop=0
 }
 return {update,reset,follow}
}
