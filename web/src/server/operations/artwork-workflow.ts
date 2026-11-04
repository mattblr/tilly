/** Bounded artwork phases. The production adapter must implement the persisted
 * compare-and-set and verified Fóir dispatch contract described in docs/tilly/artwork.md.
 * The installed operation adapter supplies these ports from verified dispatch.
 */
export type ArtworkPhase = 'reserved' | 'generating' | 'stored' | 'held' | 'publishing' | 'ready' | 'recovery'
export interface ArtworkJob {
  id: string
  ownerId: string
  photoKey: string
  sourceFileId: string
  artId: string
  phase: ArtworkPhase
  revision: string
  outputFileId?: string
}
export interface ArtworkAccess {
  /** Current ownership/source identity, readable source, and holds on source/art. */
  allowed: boolean
  /** Active provider-neutral Premium, checked before a new provider request. */
  premium: boolean
}
export interface ArtworkPorts {
  load(id: string): Promise<ArtworkJob | null>
  access(job: ArtworkJob): Promise<ArtworkAccess>
  /** Atomic persisted phase/revision claim. Null means another slice won. */
  claim(job: ArtworkJob, phase: ArtworkPhase): Promise<ArtworkJob | null>
  /** Atomic persisted update conditional on the claimed revision/phase. */
  keep(job: ArtworkJob, phase: ArtworkPhase, fileId?: string): Promise<ArtworkJob>
  generate(job: ArtworkJob): Promise<Uint8Array>
  /** Await Fóir upload/PUT/landing and verify PRIVATE before returning its ID. */
  storePrivate(job: ArtworkJob, bytes: Uint8Array): Promise<string>
  /** At most one bounded audience/file stage. Revalidate source/art holds
   * around widening and compensate on refusal. False means another slice. */
  publishSlice(job: ArtworkJob): Promise<boolean>
  /** Narrow the art record/file and drain old grants through bounded work. */
  narrow(job: ArtworkJob): Promise<boolean | void>
}
export type ArtworkStep = { state: 'continue' | 'pending' | 'held' | 'ready' | 'recovery'; jobId: string; artId: string }
export class ArtworkRefusal extends Error {}
const ID = /^[a-z0-9]{10,40}$/
function validJob(job: ArtworkJob, actor: string) {
  if (job.ownerId !== actor || ![job.id, job.artId, job.ownerId, job.photoKey, job.sourceFileId].every(id => ID.test(id)) ||
    !job.revision || !['reserved', 'generating', 'stored', 'held', 'publishing', 'ready', 'recovery'].includes(job.phase) ||
    (job.outputFileId !== undefined && !ID.test(job.outputFileId)) ||
    (['stored', 'held', 'publishing', 'ready'].includes(job.phase) && !job.outputFileId))
    throw new ArtworkRefusal('The artwork attempt is unavailable.')
}
function unchanged(before: ArtworkJob, after: ArtworkJob, phase: ArtworkPhase, outputFileId = before.outputFileId) {
  if (before.id !== after.id || before.ownerId !== after.ownerId || before.photoKey !== after.photoKey ||
    before.sourceFileId !== after.sourceFileId || before.artId !== after.artId || after.phase !== phase ||
    after.outputFileId !== outputFileId || !after.revision || after.revision === before.revision)
    throw new ArtworkRefusal('The artwork attempt changed unexpectedly.')
}
/** Each call is one phase, and awaits every side effect. The only provider call
 * follows a persisted generation claim and never appears in a retry phase. Generation must use
 * the provider's standard filtering; the adapter never accepts uploaded output
 * or a caller-selected moderation level as trusted generated artwork.
 * Job identity comes from a cursor; authority always comes from verified ingress.
 */
export async function artworkStep(ports: ArtworkPorts, actor: string | null, jobId: string): Promise<ArtworkStep> {
  if (!actor || !ID.test(actor) || !ID.test(jobId)) throw new ArtworkRefusal('Sign in to continue this artwork.')
  let job = await ports.load(jobId)
  if (!job) throw new ArtworkRefusal('The artwork attempt is unavailable.')
  validJob(job, actor)
  const reply = (state: ArtworkStep['state']): ArtworkStep => ({ state, jobId: job!.id, artId: job!.artId })
  const access = await ports.access(job)
  if (!access.allowed) {
    const narrowed = await ports.narrow(job)
    return reply(narrowed === false ? 'continue' : 'held')
  }
  if (job.phase === 'ready') return reply('ready')
  // Another execution must not restart an in-flight/ambiguous paid request.
  // Recovery is an explicit separate decision, never a client Retry button.
  if (job.phase === 'generating') return reply('pending')
  if (job.phase === 'recovery') return reply('recovery')
  if (job.phase === 'reserved') {
    if (!access.premium) throw new ArtworkRefusal('Artwork comes with Tilly Premium.')
    // This is the product's one-output-per-capture claim. Fóir owns execution
    // quotas; this state binds a trusted output to its exact source photograph.
    const claimed = await ports.claim(job, 'generating')
    if (!claimed) return reply('pending')
    unchanged(job, claimed, 'generating')
    job = claimed
    try {
      const latest = await ports.access(job)
      if (!latest.allowed || !latest.premium) {
        const narrowed = await ports.narrow(job)
        job = await transition(ports, job, 'recovery')
        return reply(narrowed === false ? 'continue' : 'recovery')
      }
      const bytes = await ports.generate(job)
      if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > 25 * 1024 * 1024)
        throw new ArtworkRefusal('The image provider returned no usable artwork.')
      const fileId = await ports.storePrivate(job, bytes)
      if (!ID.test(fileId)) throw new ArtworkRefusal('The private output was not stored.')
      job = await transition(ports, job, 'stored', fileId)
      return reply('continue')
    } catch (error) {
      // If output persistence was ambiguous, keep the paid request stopped.
      // Never reset to reserved/failed and accidentally generate another image.
      // A conditional output commit can succeed even if its response is lost.
      // Re-read before terminal cleanup; no second draw.
      const saved = await ports.load(job.id)
      if (saved?.outputFileId && ['stored','held','publishing','ready'].includes(saved.phase)) {
        validJob(saved, actor)
        if (saved.ownerId !== job.ownerId || saved.photoKey !== job.photoKey || saved.sourceFileId !== job.sourceFileId || saved.artId !== job.artId)
          throw new ArtworkRefusal('The stored artwork identity changed.')
        return reply('continue')
      }
      await ports.keep(job, 'recovery').catch(() => {})
      throw error
    }
  }
  if (job.phase === 'stored' || job.phase === 'held') {
    if (!(await ports.access(job)).allowed) {
      if (await ports.narrow(job) === false) return reply('continue')
      job = await transition(ports, job, 'held')
      return reply('held')
    }
    job = await transition(ports, job, 'publishing')
    return reply('continue')
  }
  try {
    // Generation uses OpenAI's standard filtering. Publication still checks
    // current source/art holds; there is no separate output-moderation call.
    if (!await ports.publishSlice(job)) return reply('continue')
    if (!(await ports.access(job)).allowed) {
      if (await ports.narrow(job) === false) return reply('continue')
      job = await transition(ports, job, 'held')
      return reply('held')
    }
    job = await transition(ports, job, 'ready')
    return reply('ready')
  } catch (error) {
    await ports.narrow(job)
    throw error
  }
}
async function transition(ports: ArtworkPorts, before: ArtworkJob, phase: ArtworkPhase, outputFileId = before.outputFileId) {
  const after = await ports.keep(before, phase, outputFileId)
  unchanged(before, after, phase, outputFileId)
  return after
}
