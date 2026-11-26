export interface Tuning {
  version:number; tickMs:number; staggerSeconds:number[]; neighborSeconds:number[]; patienceSeconds:number[];
  zoneBoundaries:number[]; tipFractions:number[]; comboSeconds:number; comboBonuses:number[];
  smilesByZone:number[]; starFractions:number[]; orderLimit:number; cartDecay:boolean
}
export interface Section { id:string; floorId:string; name:string; kind:'production'|'service'; seats:string[] }
export interface Building {sections:Section[]; edges:{from:string;to:string;mode:'lift'|'pan';seconds:number}[]}
export interface Recipe { id:string; name:string; icon:string; vessel:string; components:string[]; price:number; unlockLevel:number }
export interface Station { id:string; name:string; section:string; batch:number; cycleSeconds:number; graceSeconds:number; outputs:string[]; tiers:number[] }
export interface Archetype { id:string; patienceSeconds:number; tipMultiplier:number; orderPool:string[] }
export interface Menu { components:string[]; vessels:string[]; recipes:Recipe[]; stations:Station[]; archetypes:Archetype[] }
export interface Command {tick:number;kind:'cycle'|'position';target:string}
export interface Fixture {
  id:string; defaultSeed:number; startSection:string; durationTicks:number; checkpointTick:number;
  cupSlots:number; plateSlots:number; loadedCups:string[]; population:number; orderPool:string[];
  orders:{id:string; seat:string;archetype:string;remainingSeconds:number;item:string}[]; commands:Command[]
}
export interface Content { tuning:Tuning; building:Building; menu:Menu; diagnostic:Fixture }
