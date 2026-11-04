import {appearanceAnswer} from '../server/operations/appearance-contract'
export type EvidenceCount={label:string;count:number}
export type AppearanceEvidence={samples:number;breeds:EvidenceCount[];patterns:EvidenceCount[]}
const patterns=new Set(['solid','tabby','bicolour','bicolor','tricolour','tricolor','tortoiseshell','colourpoint','colorpoint','mixed','unknown'])
const normal=(label:string)=>label.normalize('NFKC').trim().toLocaleLowerCase('en')
function add(rows:EvidenceCount[],label:string){
  const key=normal(label),row=rows.find(row=>normal(row.label)===key)
  if(row)row.count++;else {if(rows.length>=128)throw Error('The appearance vocabulary needs review.');rows.push({label,count:1})}
}
export function addAppearanceEvidence(previous:AppearanceEvidence,value:unknown):AppearanceEvidence {
  const answer=appearanceAnswer(value),out=structuredClone(previous)
  if(['unknown','no_cat'].includes(answer.status))return out
  const breeds=answer.possibilities.filter(label=>!patterns.has(normal(label)))
  if(!breeds.length&&answer.pattern==='unknown')return out
  out.samples++
  for(const label of breeds)add(out.breeds,label)
  if(answer.pattern!=='unknown')add(out.patterns,answer.pattern)
  return out
}
export function evidenceShares(rows:readonly EvidenceCount[]){
  const sum=rows.reduce((n,row)=>n+row.count,0)
  return [...rows].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).map(row=>({...row,percent:sum?Math.round(row.count/sum*100):0}))
}
export function readAppearanceEvidence(value:unknown):AppearanceEvidence|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const v=value as AppearanceEvidence
  if(!Number.isSafeInteger(v.samples)||v.samples<1||!Array.isArray(v.breeds)||!Array.isArray(v.patterns))return null
  for(const rows of [v.breeds,v.patterns]){
    if(rows.length>128)return null
    if(rows.some(row=>typeof row?.label!=='string'||!row.label.trim()||row.label.length>60||/[\p{Cc}\p{Cf}<>]|https?:|www\./iu.test(row.label)||!Number.isSafeInteger(row.count)||row.count<1||row.count>v.samples))return null
    if(new Set(rows.map(row=>normal(row.label))).size!==rows.length)return null
  }
  return v.breeds.length||v.patterns.length?v:null
}

export function evidenceFromGroups(groups:readonly {key:unknown;count:number}[],truncated=false):AppearanceEvidence|null {
  if(truncated||groups.length>257)return null
  const evidence:AppearanceEvidence={samples:0,breeds:[],patterns:[]}
  for(const row of groups){
    if(typeof row.key!=='string'||!Number.isSafeInteger(row.count)||row.count<1)return null
    if(row.key==='sample:photo'){evidence.samples=row.count;continue}
    const split=row.key.indexOf(':'),kind=row.key.slice(0,split),label=row.key.slice(split+1)
    if(!['breed','pattern'].includes(kind))return null
    const display=kind==='breed'?label.replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('en')):label
    ;(kind==='breed'?evidence.breeds:evidence.patterns).push({label:display,count:row.count})
  }
  return readAppearanceEvidence(evidence)
}
