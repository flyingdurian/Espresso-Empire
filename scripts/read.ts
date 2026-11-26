import {readFile} from 'node:fs/promises'
import {loadContent} from '../src/content/load.ts'
export const readData=(path:string)=>readFile(new URL('../public/data/'+path,import.meta.url),'utf8').then(JSON.parse)
export const loadDisk=()=>loadContent(readData)
