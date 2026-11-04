import type {QueryClient} from './types'
import type {ArtworkJob} from './artwork-workflow'
import {canonicalCapture} from './tagged-captures'
export interface ArtworkAttempt extends ArtworkJob {
  sourceRevision:string;sourceExecutionId:string;preparation?:unknown;prompt?:string|null;
  style?:string|null;tierDays?:number|null;modelVersion?:string|null;quality?:string|null;publication?:unknown;notified?:boolean|null
}
export const artworkAttemptFields='_id _ownerId photoKey sourceFileId sourceRevision sourceExecutionId artId phase jobRevision outputFileId preparation prompt style tierDays modelVersion quality publication notified'
export type ArtworkStoredRow=Omit<ArtworkAttempt,'id'|'ownerId'|'revision'> & {_id:string;_ownerId:string;jobRevision:string}
export function artworkAttemptValue(row:ArtworkStoredRow):ArtworkAttempt {
  return {...row,id:row._id,ownerId:row._ownerId,revision:row.jobRevision,outputFileId:row.outputFileId||undefined}
}
/** Public art is trusted only through a PRIVATE operation-owned attempt. No
 * client can substitute an upload as generated output or forge this binding. */
export async function artworkProof(foir:QueryClient,owner:string,artId:string) {
  const answer=await foir.raw<{catchArt:{_id:string;_ownerId:string;photoKey:string;art:{url:string|null}|null}|null;
    artworkAttempts:{edges:{node:ArtworkStoredRow}[]}}>(
    `query ArtworkProof($owner: ID, $art: String) { catchArt(id: $art) { _id _ownerId photoKey art { url } }
      artworkAttempts(first: 2, where: {ownerId: {eq: $owner}, artId: {eq: $art}}) { edges { node { ${artworkAttemptFields} } } } }`,{owner,art:artId})
  if (!answer.catchArt || answer.catchArt._ownerId!==owner || answer.artworkAttempts.edges.length!==1) return null
  const job=artworkAttemptValue(answer.artworkAttempts.edges[0].node)
  if (job.ownerId!==owner || job.artId!==artId || job.photoKey!==answer.catchArt.photoKey ||
    !job.outputFileId || !['stored','publishing','ready','held'].includes(job.phase)) return null
  try { if (new URL(answer.catchArt.art?.url ?? '').pathname.split('/').at(-1)!==job.outputFileId) return null }
  catch { return null }
  const source=await canonicalCapture(foir,job.photoKey)
  if (!source || source._ownerId!==owner || source.state!=='ready' || source.fileId!==job.sourceFileId) return null
  return {job,art:answer.catchArt,source}
}
