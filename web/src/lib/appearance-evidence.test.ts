import {test} from 'node:test'
import assert from 'node:assert/strict'
import {addAppearanceEvidence,evidenceShares,readAppearanceEvidence,type AppearanceEvidence} from './appearance-evidence'
const empty=():AppearanceEvidence=>({samples:0,breeds:[],patterns:[]})
const answer=(breed:string,pattern='tabby')=>({status:'possible',possibilities:[breed],coatLength:'long',pattern})
test('later cat observations accumulate breed evidence independently of coat patterns',()=>{
 let evidence=empty()
 for(let i=0;i<4;i++)evidence=addAppearanceEvidence(evidence,answer('Siberian'))
 evidence=addAppearanceEvidence(evidence,answer('Maine Coon'))
 evidence=addAppearanceEvidence(evidence,answer('maine coon'))
 assert.equal(evidence.samples,6)
 assert.deepEqual(evidenceShares(evidence.breeds).map(x=>[x.label,x.count,x.percent]),[['Siberian',4,67],['Maine Coon',2,33]])
 assert.deepEqual(evidenceShares(evidence.patterns),[{label:'tabby',count:6,percent:100}])
})
test('unknown and no-cat evidence stays invisible and does not dilute observations',()=>{
 let e=addAppearanceEvidence(empty(),{status:'unknown',possibilities:[],coatLength:'unknown',pattern:'unknown'})
 assert.equal(readAppearanceEvidence(e),null)
 e=addAppearanceEvidence(e,{status:'no_cat',possibilities:[],coatLength:'unknown',pattern:'unknown'})
 assert.equal(e.samples,0)
})
test('pattern labels cannot become breed badges and malformed public counts are refused',()=>{
 const e=addAppearanceEvidence(empty(),answer('Tabby'))
 assert.deepEqual(e.breeds,[]);assert.equal(e.patterns[0].count,1)
 assert.equal(readAppearanceEvidence({...e,samples:0}),null)
 assert.equal(readAppearanceEvidence({...e,breeds:[{label:'https://evil.test',count:1}]}),null)
 assert.equal(readAppearanceEvidence({...e,breeds:[{label:'Maine Coon',count:2}]}),null)
})
