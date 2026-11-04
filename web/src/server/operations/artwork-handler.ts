import {createFoirClient} from '@foir/sdk/data'
import {continueRun} from '@foir/sdk/server'
import {artworkStep,type ArtworkJob,type ArtworkPhase,type ArtworkPorts} from './artwork-workflow'
import {artworkAttemptFields,artworkAttemptValue,type ArtworkAttempt,type ArtworkStoredRow} from './artwork-access'
import {prepareArtworkSlice} from './artwork-preparation'
import {FinalizationRefusal} from './capture-finalization-contract'
import {finalizationReceipt,finalizedRequest} from './capture-finalization'
import {canonicalCapture} from './tagged-captures'
import {all,createOwned} from './social'
import {chosenPrivacy,audienceFor,setViewers} from './audience'
import {analysisJpeg,readAppearancePhoto} from './appearance-photo'
import {checkSharingContent,checkedAudience,publicationHeld,publishCheckedFile,withContentSafety} from './content-safety'
import {uploadOperationImage} from './files'
import {draw,tell} from './art'
import {operationApi} from './environment'
import * as generated from './generated/foir.op.tilly.make-catch-art.generated'
import type {Audience,DispatchEnvelope,OperationIngress,OperationInput,OperationResponse,QueryClient} from './types'

const ID=/^[a-z0-9]{10,40}$/
const advance=(jobId:string,cleanup=false)=>continueRun({cursor:JSON.stringify({v:1,jobId,...(cleanup?{cleanup:true}:{})})})
async function loadAttempt(foir:QueryClient,id:string):Promise<ArtworkAttempt|null> {
  const answer=await foir.raw<{artworkAttempt:ArtworkStoredRow|null}>(`query ArtworkAttempt($id: String) { artworkAttempt(id: $id) { ${artworkAttemptFields} } }`,{id})
  return answer.artworkAttempt?artworkAttemptValue(answer.artworkAttempt):null
}
async function patchAttempt(foir:QueryClient,job:ArtworkJob,fields:Record<string,unknown>,bump=false) {
  const revision=bump?crypto.randomUUID():job.revision
  const result=await foir.raw<{updateArtworkAttempt:{record:{_id:string}|null}}>(
    'mutation ArtworkConditional($id: ID, $phase: String, $revision: String, $data: ArtworkAttemptUpdateInput!) { updateArtworkAttempt(where: {id: {eq: $id}, phase: {eq: $phase}, jobRevision: {eq: $revision}}, data: $data) { record { _id } } }',
    {id:job.id,phase:job.phase,revision:job.revision,data:Object.fromEntries(Object.entries({...fields,...(bump?{jobRevision:revision}:{})}).map(([key,value])=>[key,{set:value}]))})
  if (!result.updateArtworkAttempt.record) return null
  return revision
}
async function patchArt(foir:QueryClient,id:string,fields:Record<string,unknown>) {
  const result=await foir.raw<{updateCatchArt:{record:{_id:string}|null}}>(
    'mutation ArtworkDisplay($id: ID, $data: CatchArtUpdateInput!) { updateCatchArt(where: {id: {eq: $id}}, data: $data) { record { _id } } }',
    {id,data:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,{set:value}]))})
  if (!result.updateCatchArt.record) throw new Error('The artwork display record could not be saved.')
}
async function privateOutput(foir:QueryClient,job:ArtworkJob) {
  if (job.outputFileId) {
    const file=await foir.raw<{setFileVisibility:string}>('mutation ArtworkPrivateFile($id: ID!, $visibility: Visibility!) { setFileVisibility(id: $id, visibility: $visibility) }',{id:job.outputFileId,visibility:'PRIVATE'})
    if (file.setFileVisibility!=='PRIVATE') throw new Error('The generated image could not be kept private.')
  }
}
/** Bounded compensation: bytes first, then one old record grant per slice. */
export async function narrowArtwork(foir:QueryClient,job:ArtworkJob) {
  await privateOutput(foir,job)
  // Whoever could see the art through its catch no longer can.
  await setViewers(foir,[['CatchArt',job.artId]],null)
  const result=await foir.raw<{setCatchArtVisibility:string}>('mutation ArtworkPrivateRecord($id: ID!, $visibility: Visibility!) { setCatchArtVisibility(id: $id, visibility: $visibility) }',{id:job.artId,visibility:'PRIVATE'})
  if (result.setCatchArtVisibility!=='PRIVATE') throw new Error('The artwork record could not be kept private.')
  const grants=await foir.raw<{access:{grants:{granteeId:string}[]}|null}>('query ArtworkOldGrants($id: ID!) { access: catchArtAccess(id: $id) { grants { granteeId } } }',{id:job.artId})
  if (grants.access?.grants[0]) {
    await foir.raw('mutation ArtworkRevoke($id: ID!, $who: ID!) { revokeCatchArtAccess(id: $id, granteeId: $who) }',{id:job.artId,who:grants.access.grants[0].granteeId})
    return false
  }
  return true
}
/** Shows finished artwork by the one rule for catches (audience.ts): whoever
 * sees its catch sees it, unless either is held. Its bytes are public only when
 * the catch is. One dispatch; true once the art is ready. */
export async function artworkAudienceSlice(foir:QueryClient,job:ArtworkAttempt,current:()=>Promise<boolean>,wanted:Audience):Promise<boolean> {
  await privateOutput(foir,job)
  const audience=await audienceFor(foir,job.ownerId)
  const held=await publicationHeld(foir,'CatchArt',job.artId,job.outputFileId)
  await setViewers(foir,[['CatchArt',job.artId]],held?null:audience.id)
  if (!held&&wanted==='public'&&await checkedAudience(foir,'CatchArt',job.artId,wanted)==='public')
    await publishCheckedFile(foir,job.outputFileId!,'CatchArt',job.artId)
  if (!await current()||await publicationHeld(foir,'CatchArt',job.artId,job.outputFileId)) {
    await privateOutput(foir,job)
    await setViewers(foir,[['CatchArt',job.artId]],null)
    throw new Error('The artwork publication is no longer allowed.')
  }
  await patchArt(foir,job.artId,{status:'ready',art:job.outputFileId,style:job.style??'Art',tierDays:job.tierDays??1})
  return true
}
function artworkPorts(foir:QueryClient,ingress:OperationIngress):ArtworkPorts {
  const access=async(job:ArtworkJob)=>{
    const source=await canonicalCapture(foir,job.photoKey)
    const grants=await all<{_ownerId:string|null;until:string|null}>(foir,{field:'premiumGrants',where:'{ownerId: {eq: $owner}}',types:'$owner: ID',vars:{owner:job.ownerId},node:'_ownerId until'})
    const premium=grants.some(grant=>grant._ownerId===job.ownerId&&grant.until&&Date.parse(grant.until)>Date.now())
    const holds=await foir.raw<{moderationCases:{edges:unknown[]}}>(
      'query ArtworkHolds($photo: String, $source: String, $art: String, $output: String) { moderationCases(first: 1, where: {status: {eq: "hidden"}, OR: [{targetType: {eq: "CapturePhoto"}, targetId: {eq: $photo}}, {targetType: {eq: "CatchArt"}, targetId: {eq: $art}}, {fileId: {eq: $source}}, {fileId: {eq: $output}}]}) { edges { node { _id } } } }',
      {photo:job.photoKey,source:job.sourceFileId,art:job.artId,output:job.outputFileId??'__no_output__'})
    const revision=(job as Partial<ArtworkAttempt>).sourceRevision
    return {allowed:!!source&&source._ownerId===job.ownerId&&source.fileId===job.sourceFileId&&source.state==='ready'&&
      (!['reserved','generating'].includes(job.phase)||source.tagRevision===revision)&&
      holds.moderationCases.edges.length===0,premium}
  }
  return {
    load:id=>loadAttempt(foir,id),access,
    async claim(job,phase) {
      const revision=await patchAttempt(foir,job,{phase},true)
      return revision?{...job,phase,revision}:null
    },
    async keep(job,phase,outputFileId=job.outputFileId) {
      const revision=await patchAttempt(foir,job,{phase,...(outputFileId?{outputFileId}:{})},true)
      if (!revision) throw new Error('The artwork attempt changed.')
      return {...job,phase,revision,outputFileId}
    },
    async generate(job) {
      const prepared=await loadAttempt(foir,job.id)
      if (!prepared?.prompt||!prepared.modelVersion) throw new Error('The artwork instruction is unavailable.')
      const source=await readAppearancePhoto(foir,job.photoKey,job.sourceFileId,ingress.filesOrigin)
      // Input/upload policy is independent of provider output filtering. The
      // source check uses the already approved free moderation-purpose secret.
      if (!await checkSharingContent(foir,{targetType:'CapturePhoto',targetId:job.photoKey,fileId:job.sourceFileId,text:prepared.prompt}))
        throw new Error('This artwork input is waiting for review.')
      const latest=await access(job)
      if (!latest.allowed||!latest.premium) throw new Error('This artwork request is no longer eligible.')
      const shape=analysisJpeg(source)
      return draw(ingress,{source:new Uint8Array(source),prompt:prepared.prompt,model:prepared.modelVersion,quality:prepared.quality,shape})
    },
    async storePrivate(job,bytes) {
      const id=await uploadOperationImage(foir,new Uint8Array(bytes),`art-${job.photoKey}.png`,ingress.apiUrl)
      const file=(await foir.raw<{file:{id:string;visibility:string;mimeType:string}|null}>('query ArtworkStoredPrivate($id: String!) { file(id: $id) { id visibility mimeType } }',{id})).file
      if (file?.id!==id||file.visibility!=='PRIVATE'||file.mimeType!=='image/png') throw new Error('The generated output is not verified private.')
      return id
    },
    async publishSlice(job) {
      const prepared=await loadAttempt(foir,job.id)
      if (!prepared?.outputFileId) throw new Error('The private generated output is unavailable.')
      await patchArt(foir,job.artId,{art:prepared.outputFileId})
      const source=await canonicalCapture(foir,job.photoKey),preference=await chosenPrivacy(foir,job.ownerId)
      const wanted:Audience=source?.audience==='public'&&preference==='public'?'public':'private'
      return artworkAudienceSlice(foir,prepared,async()=>{
        const latest=await canonicalCapture(foir,job.photoKey)
        return !!latest&&latest.state==='ready'&&latest._ownerId===job.ownerId&&latest.fileId===job.sourceFileId&&
          latest.audience===source?.audience&&await chosenPrivacy(foir,job.ownerId)===preference
      },wanted)
    },
    narrow:job=>narrowArtwork(foir,job),
  }
}
/** Actual installed operation adapter. An ambiguous failed art row is never
 * reset to making. A native hook's saved receipt is the admission boundary. */
export async function makeArtworkHook(_input:OperationInput,envelope:DispatchEnvelope,ingress:OperationIngress):Promise<OperationResponse|Response> {
  if (envelope.operationKey!=='tilly.make-catch-art') throw new FinalizationRefusal('The native artwork operation is required.')
  const owner=ingress.userId!
  const foir=withContentSafety(createFoirClient({apiUrl:operationApi(ingress.apiUrl),dispatch:ingress.dispatch,generated}),ingress)
  const event=await finalizedRequest(foir,{...envelope,input:{...envelope.input}},ingress.userId??null,'artwork')
  const receipt=await finalizationReceipt(foir,owner,event.captureId),source=await canonicalCapture(foir,event.captureId)
  if (!receipt||receipt.phase!=='finalized'||receipt.runId!==event.sourceExecutionId||!receipt.artworkRequested||!receipt.finalizedAt||
    receipt.revision!==event.revision||!source||source._ownerId!==owner||source.fileId!==receipt.fileId) throw new FinalizationRefusal('This finalized artwork request is unavailable.')
  let job:ArtworkAttempt|null=null,cleanup=false
  if (envelope.continuation?.cursor) {
    const cursor=JSON.parse(envelope.continuation.cursor) as {v:number;jobId:string;cleanup?:boolean}
    if (cursor.v!==1||!ID.test(cursor.jobId)) throw new Error('Invalid artwork continuation.')
    job=await loadAttempt(foir,cursor.jobId);cleanup=cursor.cleanup===true
  } else {
    const jobs=await all<ArtworkStoredRow>(foir,{field:'artworkAttempts',where:'{ownerId: {eq: $owner}, photoKey: {eq: $photo}}',types:'$owner: ID, $photo: String',vars:{owner,photo:source._id},node:artworkAttemptFields})
    if (jobs.length>1) throw new Error('The artwork attempt is ambiguous.')
    job=jobs[0]?artworkAttemptValue(jobs[0]):null
    if (!job) {
      const id=await createOwned(foir,'ArtworkAttempt',{photoKey:source._id,sourceFileId:source.fileId,sourceRevision:source.tagRevision,
        sourceExecutionId:event.sourceExecutionId,phase:'reserved',jobRevision:crypto.randomUUID()},owner,`artwork-${source._id}`)
      job=await loadAttempt(foir,id)
    }
  }
  if (!job||job.ownerId!==owner||job.photoKey!==source._id||job.sourceFileId!==source.fileId||job.sourceExecutionId!==event.sourceExecutionId)
    throw new Error('The artwork attempt does not match this capture.')
  if (!job.artId) {
    if (!source.catKey) throw new Error('The capture has no current cat.')
    const artId=await createOwned(foir,'CatchArt',{photoKey:source._id,catKey:source.catKey,cat:{_ref:'record',model:'cat',id:source.catKey},status:'making'},owner,`generated-art-${source._id}`)
    if (!await patchAttempt(foir,job,{artId},true)) return advance(job.id)
    return advance(job.id)
  }
  const ports=artworkPorts(foir,ingress)
  if (cleanup) {
    if (!await ports.narrow(job)) return advance(job.id,true)
    await patchArt(foir,job.artId,{status:'failed'})
    return{status:409,body:{ok:false,error:'Artwork could not finish. Its output remains private.'}}
  }
  if (job.phase==='reserved'&&!job.prompt) {
    const access=await ports.access(job)
    if (!access.allowed||!access.premium) return{status:409,body:{ok:false,error:'This artwork request is no longer eligible.'}}
    const prepared=await prepareArtworkSlice(foir,owner,source._id,receipt.finalizedAt,receipt.timeZone,job.preparation)
    if (!await patchAttempt(foir,job,'cursor'in prepared?{preparation:prepared.cursor}:{...prepared.prepared},true)) return advance(job.id)
    return advance(job.id)
  }
  try {
    const step=await artworkStep(ports,owner,job.id)
    if (step.state==='continue') return advance(job.id)
    if (step.state==='ready') {
      await tell(foir,owner,{name:'your cat',style:job.style??'Art',catKey:source.catKey??'',artId:job.artId})
    }
    return{status:200,body:{ok:true,id:job.artId,state:step.state}}
  } catch {
    const saved=await loadAttempt(foir,job.id)
    if (saved?.outputFileId && ['stored','held','publishing','ready'].includes(saved.phase)) {
      await ports.narrow(saved)
      return{status:409,body:{ok:false,id:job.artId,state:'recovery',error:'Your artwork is saved privately. Retry recovery later.'}}
    }
    // Drain compensation in the SAME native run before failing its callback.
    // This never returns an ambiguous generation to the reserved phase.
    return advance(job.id,true)
  }
}
