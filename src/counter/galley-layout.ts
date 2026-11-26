import {juiceSeat,juiceTouch} from './service-pass.ts'
// All machine hitboxes use their center in the 1672 × 941 illustrated workspace.
export const frontGalley={
 tea:{x:98,y:328,w:133,h:156},
 blend:{x:414,y:331,w:112,h:150},
 pesto:{x:931,y:582,w:79,h:72},
 brownie:{x:1043,y:582,w:98,h:68},
 carafes:{tea:juiceSeat(2),cold:juiceSeat(1)}
}

export function carafeTouch(add:'tea'|'cold'){return juiceTouch(add==='tea'?2:1)}
