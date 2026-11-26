export class FixedClock {
  private remainder=0
  advance(elapsedMs:number,tickMs:number,step:()=>void) {
    this.remainder+=elapsedMs
    while(this.remainder>=tickMs) {step();this.remainder-=tickMs}
  }
  fraction(tickMs:number){return this.remainder/tickMs}
  reset(){this.remainder=0}
}
