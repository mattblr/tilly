import {defineModel} from '@foir/cli/configs'
export const artworkAttempt=defineModel({
  key:'artwork-attempt',name:'Private artwork attempt',pluralName:'Artwork attempts',
  access:{ownerPlane:'user',defaultVisibility:'private'},config:{publishing:false,versioning:false,cacheControl:{scope:'NO_CACHE'}},
  fields:[
    {key:'photoKey',type:'text',label:'Canonical capture',required:true,queryable:true},
    {key:'sourceFileId',type:'text',label:'Immutable source file',required:true},
    {key:'sourceRevision',type:'text',label:'Initial source revision',required:true},
    {key:'sourceExecutionId',type:'text',label:'Finalization execution',required:true},
    {key:'artId',type:'text',label:'Public art record',queryable:true},
    {key:'phase',type:'text',label:'Workflow phase',required:true,queryable:true},
    {key:'jobRevision',type:'text',label:'Conditional write revision',required:true},
    {key:'outputFileId',type:'text',label:'Verified generated output'},
    {key:'preparation',type:'json',label:'Bounded style preparation'},
    {key:'prompt',type:'text',label:'Prepared generation instruction'},
    {key:'style',type:'text',label:'Prepared style name'},
    {key:'tierDays',type:'integer',label:'Prepared style tier'},
    {key:'modelVersion',type:'text',label:'Prepared image model'},
    {key:'quality',type:'text',label:'Prepared image quality'},
    {key:'publication',type:'json',label:'Bounded publication stage'},
    {key:'notified',type:'boolean',label:'Ready notification claimed'},
  ],
})
export {artworkQuota} from '../src/server/operations/artwork-policy.ts'
