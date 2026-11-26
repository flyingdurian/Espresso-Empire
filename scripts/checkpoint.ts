import {writeFile} from 'node:fs/promises'
import {loadDisk} from './read.ts'
import {runTrace,digest} from '../src/sim/simulation.ts'
const data=await loadDisk(),{defaultSeed:seed,checkpointTick:tick}=data.diagnostic
await writeFile(new URL('../public/data/checkpoint.json',import.meta.url),JSON.stringify({seed,tick,digest:digest(runTrace(data,seed,tick))})+'\n')
