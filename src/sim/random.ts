// Integer LCG. The entire stream state fits in an unsigned 32-bit integer.
export function nextRandom(state:number):number {
  return (Math.imul(state,1664525)+1013904223)>>>0
}
