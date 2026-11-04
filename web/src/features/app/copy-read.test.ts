import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {CopyProvider,readAppCopyRecords,useAppCopy} from './copy'
import {stateLabel,qualityLabel} from '../console/copy'
import {encounterCopy,type Encounter} from './data'

test('shared copy SDK reader preserves locale/preview authority across short and empty pages',async()=>{
 const calls:unknown[]=[],rows=[{_id:'copy-fixture',_naturalKey:'console',entries:[{key:'wordsTab',value:'Wörter'}]}]
 const client={'ui-copy':{async findMany(options:unknown){calls.push(options);return calls.length===1?{edges:[],pageInfo:{hasNextPage:true,endCursor:'page-2'}}:{edges:rows.map(node=>({node})),pageInfo:{hasNextPage:false,endCursor:null}}}}}
 const found=await readAppCopyRecords(client as never,'de',true)
 assert.deepEqual(found,rows);assert.deepEqual(calls,[{first:100,after:undefined,locale:'de',contexts:{preview:true},pick:['_id','_naturalKey','entries']},{first:100,after:'page-2',locale:'de',contexts:{preview:true},pick:['_id','_naturalKey','entries']}])
})
test('repeated and missing copy cursors refuse instead of accepting incomplete overrides',async()=>{
 for(const cursor of ['cycle',null]){
  let calls=0;const client={'ui-copy':{async findMany(){calls++;return {edges:[],pageInfo:{hasNextPage:true,endCursor:cursor}}}}}
  await assert.rejects(readAppCopyRecords(client as never,undefined));assert.ok(calls<=2)
 }
})
test('placement copy overrides translate display states and unknown names without translating user content or protocol values',()=>{
 const records=[{_naturalKey:'console',entries:[{key:'state.ready',value:'Prêt'}]},{_naturalKey:'cat',entries:[{key:'unnamed',value:'Un chat'}]},{_naturalKey:'profile',entries:[{key:'user',value:'Utilisateur'}]}]
 const unknown={cat:'',author:'',cats:[{name:''}],repostedBy:{name:''}} as unknown as Encounter
 function Probe(){const t=useAppCopy(),resolved=encounterCopy(unknown,t);return createElement('span',{'aria-label':stateLabel('READY',t)},resolved.cat+' · '+resolved.author)}
 assert.equal(renderToStaticMarkup(createElement(CopyProvider,{records,children:createElement(Probe)})),'<span aria-label="Prêt">Un chat · Utilisateur</span>')
 assert.equal(unknown.cat,'')
 const named={cat:'Miso {count}',author:'<Emma>',cats:[],repostedBy:{name:'Ava'}} as unknown as Encounter
 assert.equal(encounterCopy(named,()=>{throw Error('Known content must not become copy lookup')}).cat,'Miso {count}')
})

test('provider model IDs and unknown quality vocabulary never turn into copy lookup keys',()=>{
 const copy=(key:string)=>key==='console.quality.medium'?'Moyen':key
 assert.equal(qualityLabel('medium',copy),'Moyen')
 assert.equal(qualityLabel('future-quality',()=>{throw Error('Unknown vocabulary is not a copy key')}),'future-quality')
 assert.equal(qualityLabel('gpt-image-1-mini',()=>{throw Error('Model identifier is data')}),'gpt-image-1-mini')
 assert.equal(qualityLabel('low',key=>key),'low')
})
