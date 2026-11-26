import type {Add,Cup,Drink} from './bench.ts'

export const surfaceNames=['short','standard','water','silky','airy','mixed','coldmilk','iced-milk','frappe','tea','matcha','cocoa','pure-silky','pure-airy','pure-mixed','clear-water'] as const
export type Surface=typeof surfaceNames[number]
const portions:Record<Add,number>={milk:.59,foam:.23,cold:.68,ice:0,coldmilk:.55,tea:.76,water:.67,matcha:.12,cocoa:.12,caramel:.12,vanilla:.12,cherry:.12,orange:.76,strawberryDrizzle:0,caramelDrizzle:0,cinnamonDust:0,cocoaDust:0}
// The opening and foot are registered to the cropped, empty illustrated vessel.
export const vessel:Record<Cup,{cx:number;rim:number;rx:number;ry:number;foot:number;glass:boolean}>={
 demi:{cx:.49,rim:.15,rx:.276,ry:.125,foot:.81,glass:false},
 mug:{cx:.35,rim:.13,rx:.332,ry:.103,foot:.94,glass:false},
 glass:{cx:.389,rim:.103,rx:.36,ry:.084,foot:.84,glass:true},
 bowl:{cx:.46,rim:.17,rx:.321,ry:.139,foot:.84,glass:false},
 tall:{cx:.49,rim:.106,rx:.467,ry:.084,foot:.89,glass:true},
 paper:{cx:.50,rim:.16,rx:.463,ry:.134,foot:.95,glass:false},
 clear:{cx:.51,rim:.16,rx:.464,ry:.113,foot:.94,glass:true}
}
// Relative optical strength: a small dose of powdered tea or cocoa colors a full glass of milk.
const pigment:Record<Add,[number,number,number,number]>={
 milk:[246,222,180,1],foam:[248,233,205,.14],coldmilk:[245,233,208,1.05],
 cocoa:[69,33,21,1.6],matcha:[82,111,42,1.5],caramel:[175,93,37,.82],vanilla:[233,202,146,.55],cherry:[142,14,38,1.25],orange:[244,148,35,1.9],
 cold:[193,157,115,1.15],tea:[190,126,52,.65],water:[211,187,155,.13],ice:[215,226,224,0],strawberryDrizzle:[182,48,65,0],caramelDrizzle:[174,108,45,0],cinnamonDust:[165,93,51,0],cocoaDust:[75,43,29,0]
}
function blendedColor(c:Drink){
 const mix=[0,0,0];let weight=0
 const tint=(r:number,g:number,b:number,w:number)=>{weight+=w;[r,g,b].forEach((v,i)=>{mix[i]+=w*Math.log(v/255)})}
 if(c.poured&&c.shot){if(c.shot==='short')tint(137,72,36,.60);else tint(56,27,17,.60)}
 c.add.forEach(a=>tint(...pigment[a]))
 return weight?'rgb('+mix.map(n=>Math.round(255*Math.exp(n/weight))).join(',')+')':'#b5cad4'
}
export function drinkLook(c:Drink){
 const has=(a:Add)=>c.add.includes(a),shot=c.poured?c.shot:null,ice=has('ice')
 const raw=c.add.reduce((v,a)=>v+portions[a],shot ? .25 : 0)
 const fill=Math.min(.96,raw+(ice&&raw>0?.08:0))
 let surface:Surface|null=null
 if(has('matcha'))surface='matcha'
 else if(has('cocoa'))surface='cocoa'
 else if(has('caramel'))surface=has('cold')?'frappe':has('foam')?'mixed':has('milk')?'silky':'standard'
 else if(has('foam')&&has('milk'))surface=shot?'mixed':'pure-mixed'
 else if(has('foam'))surface=shot?'airy':'pure-airy'
 else if(has('milk'))surface=shot?'silky':'pure-silky'
 else if(has('cold'))surface='frappe'
 else if(has('tea')||has('orange'))surface='tea'
 else if(has('coldmilk'))surface=shot?'iced-milk':'coldmilk'
 else if(has('water'))surface=shot?'water':'clear-water'
 else if(has('cherry')||has('vanilla'))surface=shot??'clear-water'
 else surface=shot
 const color=surface?.startsWith('pure-')?'#ecdfc4':surface==='mixed'||surface==='silky'||surface==='iced-milk'?(shot?'#b97a48':'#eadcc0'):surface==='matcha'?'#729456':surface==='cocoa'?'#5c3326':surface==='frappe'?'#a67750':surface==='tea'?'#be813b':surface==='coldmilk'?'#f0e5cb':surface==='airy'?(shot?'#795236':'#eee4cb'):shot==='short'?'#8b4823':shot?'#341a10':'#c8dbe0'
 const flavored=has('cocoa')||has('caramel')||has('matcha')||has('orange')||has('vanilla')||has('cherry')
 return {surface,fill,color:flavored?blendedColor(c):color,ice,flavored}
}
