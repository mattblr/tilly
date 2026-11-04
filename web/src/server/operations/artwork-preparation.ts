import {localClock,previousDay,validTimeZone} from '../../lib/streak-calendar'
import type {QueryClient} from './types'
type Stream={field:'myCapturePhotos';items:string[];done:boolean;after?:string;oldest?:string}
export type ArtworkPreparation={v:1;now:string;zone:string;maxDays:number;streams:[Stream];current:number;lastDay?:string;finished?:boolean}
export interface PreparedArtwork {prompt:string;style:string;tierDays:number;modelVersion:string;quality:string}
/** Walk the user's creation-ordered capture history, at most one page per slice.
 * Only the current run is needed; stop at its first gap or highest style tier.
 * Memory stays at one page rather than growing with the user's history. */
export async function prepareArtworkSlice(foir:QueryClient,owner:string,photo:string,now:string,zone:string,previous?:unknown):Promise<{cursor:ArtworkPreparation}|{prepared:PreparedArtwork}> {
  if (!validTimeZone(zone)||!Number.isFinite(Date.parse(now))) throw new Error('The artwork clock is unavailable.')
  let state:ArtworkPreparation
  if (!previous) {
    const answer=await foir.raw<{streakTiers:{edges:{node:{days:number|null}}[]}}>(
      'query HighestArtTier { streakTiers(first: 1, orderBy: [{days: DESC}, {id: DESC}], where: {days: {gte: 1}}) { edges { node { days } } } }')
    const maxDays=answer.streakTiers.edges[0]?.node.days??1
    if (!Number.isSafeInteger(maxDays)||maxDays<1) throw new Error('The artwork tiers are unavailable.')
    state={v:1,now,zone,maxDays,current:0,streams:[{field:'myCapturePhotos',items:[],done:false}]}
    return{cursor:state}
  }
  state=structuredClone(previous) as ArtworkPreparation
  if (state.v!==1||state.now!==now||state.zone!==zone||!Number.isSafeInteger(state.maxDays)||state.maxDays<1||
    !Number.isSafeInteger(state.current)||state.current<0||state.current>state.maxDays||state.streams?.length!==1||
    state.streams[0].field!=='myCapturePhotos'||
    state.streams.some(stream=>!Array.isArray(stream.items)||stream.items.length>100||stream.items.some(date=>!Number.isFinite(Date.parse(date)))))
    throw new Error('Invalid artwork preparation.')
  if (!state.finished) {
    const stream=state.streams.find(stream=>!stream.done&&stream.items.length===0)
    if (stream) {
      const answer=await foir.raw<{page:{edges:{node:{_createdAt:string}}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}>(
        `query ArtStreakPage($now: DateTime, $after: String) { page: ${stream.field}(first: 100, after: $after, orderBy: [{createdAt: DESC}, {id: DESC}], where: {createdAt: {lte: $now}, state: {eq: "ready"}}) { edges { node { _createdAt } } pageInfo { hasNextPage endCursor } } }`,
        {now,after:stream.after})
      const page=answer.page.pageInfo
      if (answer.page.edges.length>100 || (page.hasNextPage&&(!answer.page.edges.length||!page.endCursor||page.endCursor===stream.after))) throw new Error('The artwork history did not advance.')
      stream.items=answer.page.edges.map(({node})=>node._createdAt)
      if (stream.items.some(date=>!Number.isFinite(Date.parse(date))||Date.parse(date)>Date.parse(now))) throw new Error('The artwork history has an invalid date.')
      if (stream.items.some((date,index)=>Date.parse(date)>Date.parse(index?stream.items[index-1]:stream.oldest??now)))
        throw new Error('The artwork history is not ordered.')
      stream.oldest=stream.items.at(-1)??stream.oldest
      stream.done=!page.hasNextPage;stream.after=page.endCursor??undefined
      return{cursor:state}
    }
    const today=localClock(new Date(now),zone).day,yesterday=previousDay(today)
    for(let n=0;n<200;n++) {
      if (state.streams.some(stream=>!stream.done&&!stream.items.length)) break
      const available=state.streams.filter(stream=>stream.items.length)
      if (!available.length) {state.finished=true;break}
      const selected=available.sort((a,b)=>Date.parse(b.items[0])-Date.parse(a.items[0]))[0]
      const day=localClock(new Date(selected.items.shift()!),zone).day
      if (day===state.lastDay) continue
      if (!state.lastDay) {
        if (day!==today&&day!==yesterday) {state.finished=true;break}
      } else if (day!==previousDay(state.lastDay)) {state.finished=true;break}
      state.lastDay=day;state.current++
      if (state.current>=state.maxDays) {state.finished=true;break}
    }
    return{cursor:state}
  }
  const tier=await foir.raw<{streakTiers:{edges:{node:{days:number|null;name:string|null;stylePrompt:string|null}}[]}}>(
    'query ChosenArtTier($days: Int) { streakTiers(first: 1, orderBy: [{days: DESC}, {id: DESC}], where: {days: {gte: 1, lte: $days}}) { edges { node { days name stylePrompt } } } }',
    {days:Math.max(state.current,1)})
  const chosen=tier.streakTiers.edges[0]?.node
  const notes=await foir.raw<{fieldNotes:{edges:{node:{text:string|null;tags:string[]|null}}[]}}>(
    'query ArtworkFinalizedNote($owner: ID, $photo: String, $now: DateTime) { fieldNotes(first: 1, orderBy: [{createdAt: DESC}, {id: DESC}], where: {ownerId: {eq: $owner}, photoKey: {eq: $photo}, createdAt: {lte: $now}}) { edges { node { text tags } } } }',
    {owner,photo,now})
  const note=notes.fieldNotes.edges[0]?.node,words=note?.text??'',tags=note?.tags??[]
  if (words.length>1000||tags.length>16||tags.some(tag=>typeof tag!=='string'||tag.length>80)||(chosen?.stylePrompt?.length??0)>4000)
    throw new Error('The artwork instruction exceeds its limit.')
  const settings=(await foir.raw<{appSettings:{artModel:string|null;artQuality:string|null}|null}>(
    'query PreparedArtSettings { appSettings(naturalKey: "app") { artModel artQuality } }')).appSettings
  const prompt=[chosen?.stylePrompt||'Redraw this photo as a charming illustration, keeping the same cat, pose and place.',
    words?`The catcher noticed: “${words}”.`:'',tags.length?`Its mood: ${tags.join(', ')}.`:'',
    'Keep it gentle and friendly. No words or lettering in the picture.'].filter(Boolean).join(' ')
  return{prepared:{prompt,style:chosen?.name??'Art',tierDays:chosen?.days??1,modelVersion:settings?.artModel||'gpt-image-1-mini',
    quality:['low','medium','high'].includes(settings?.artQuality??'')?settings!.artQuality!:'low'}}
}
