import type { QueryClient } from './types'
import type { AnnouncementStore, AnnouncementPage, AnnouncementRecipient } from './challenge-announcements'
import type { PhotoChallenge } from './challenge-contract'
const rules = '_naturalKey title description icon enabled startsAt endsAt criteriaVersion criteria highlightKey targetCount modelVersion'
const settingsFields = '_id _ownerId communityUpdates'
/** Construct only from the verified operation dispatch client. No provider key. */
export function challengeAnnouncementStore(foir: QueryClient): AnnouncementStore {
  return {
    audienceScope: 'all-opted-in',
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
        `query AnnouncementSettings($after: String) { notificationSettingss(first: 1, after: $after) { edges { node { ${settingsFields} } } pageInfo { hasNextPage endCursor } } }`, { after })).notificationSettingss
    },
    async ownSettings(owner) {
      const page = (await foir.raw<{ notificationSettingss: AnnouncementPage<AnnouncementRecipient> }>(
        `query AnnouncementIntent($owner: ID) { notificationSettingss(first: 2, where: {ownerId: {eq: $owner}}) { edges { node { ${settingsFields} } } pageInfo { hasNextPage endCursor } } }`, { owner })).notificationSettingss
      if (!page || !Array.isArray(page.edges) || !page.pageInfo || page.edges.length > 1 || page.pageInfo.hasNextPage) throw new Error('Challenge recipient preference must be unique.')
      return page.edges[0]?.node ?? null
    },
    async send(input) {
      const result = await foir.raw<{ sendNotification: boolean }>(
        'mutation ChallengeStartNotice($input: SendNotificationInput!) { sendNotification(input: $input) }', { input })
      if (result.sendNotification !== true) throw new Error('The challenge invitation was not accepted.')
    },
  }
}
