import type { QueryClient } from './types'
import type { AnnouncementStore, AnnouncementPage, AnnouncementRecipient } from './challenge-announcements'
import type { PhotoChallenge } from './challenge-contract'
const rules = '_naturalKey title description icon enabled startsAt endsAt criteriaVersion criteria highlightKey targetCount modelVersion'
const settingsFields = '_id _ownerId communityUpdates'
/** Construct only from the verified operation dispatch client. No provider key. */
export function challengeAnnouncementStore(foir: QueryClient, options: { testRecipient?: string } = {}): AnnouncementStore {
  const testRecipient = options.testRecipient
  if (testRecipient !== undefined && !/^[a-z0-9]{10,40}$/.test(testRecipient)) throw new Error('Invalid isolated challenge notification recipient.')
  return {
    audienceScope: testRecipient ? `test:${testRecipient}` : 'all-opted-in',
    async challenges(after) {
      const result = await foir.raw<{ photoChallenges: AnnouncementPage<PhotoChallenge> }>(
        `query AnnouncementChallenges($after: String) { photoChallenges(first: 1, after: $after) { edges { node { ${rules} } } pageInfo { hasNextPage endCursor } } }`, { after })
      return result.photoChallenges
    },
    async challenge(key) {
      return (await foir.raw<{ photoChallenge: PhotoChallenge | null }>(
        `query AnnouncementChallenge($key: String) { photoChallenge(naturalKey: $key) { ${rules} } }`, { key })).photoChallenge
    },
    async settings(after) {
      return (await foir.raw<{ notificationSettingss: AnnouncementPage<AnnouncementRecipient> }>(
        `query AnnouncementSettings($after: String${testRecipient ? ", $owner: ID" : ""}) { notificationSettingss(first: 1, after: $after${testRecipient ? ", where: {ownerId: {eq: $owner}}" : ""}) { edges { node { ${settingsFields} } } pageInfo { hasNextPage endCursor } } }`, { after, owner: testRecipient })).notificationSettingss
    },
    async ownSettings(owner) {
      if (testRecipient && owner !== testRecipient) throw new Error('The recipient is outside this isolated notification verification.')
      const page = (await foir.raw<{ notificationSettingss: AnnouncementPage<AnnouncementRecipient> }>(
        `query AnnouncementIntent($owner: ID) { notificationSettingss(first: 2, where: {ownerId: {eq: $owner}}) { edges { node { ${settingsFields} } } pageInfo { hasNextPage endCursor } } }`, { owner })).notificationSettingss
      if (!page || !Array.isArray(page.edges) || !page.pageInfo || page.edges.length > 1 || page.pageInfo.hasNextPage) throw new Error('Challenge recipient preference must be unique.')
      return page.edges[0]?.node ?? null
    },
    async send(input) {
      if (!testRecipient || input.userId !== testRecipient) throw new Error('Only the configured disposable challenge recipient may be notified during verification.')
      // Integration in progress: lifecycle named sends have remained bound to
      // their firing actor. Actorless scheduled sends are unproven. Keep this
      // operation and schedule disabled until an isolated named-recipient send
      // is verified. Use Fóir native delivery; no broader key or second queue.
      const result = await foir.raw<{ sendNotification: boolean }>(
        'mutation ChallengeStartNotice($input: SendNotificationInput!) { sendNotification(input: $input) }', { input })
      if (result.sendNotification !== true) throw new Error('The challenge invitation was not accepted.')
    },
  }
}
