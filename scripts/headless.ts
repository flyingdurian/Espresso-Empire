import {loadDisk} from './read.ts'
import {runTrace,digest} from '../src/sim/simulation.ts'
const data=await loadDisk()
const seed=Number(process.argv[2]??data.diagnostic.defaultSeed)
const tick=Number(process.argv[3]??data.diagnostic.checkpointTick)
const state=runTrace(data,seed,tick)
console.log(JSON.stringify({fixture:data.diagnostic.id,seed,tick,digest:digest(state),state},null,2))
