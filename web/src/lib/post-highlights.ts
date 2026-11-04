/** A photo highlight is the badge of a challenge the photo verifiably met.
 * Its title and icon come from the published challenge; they are data, never
 * markup, a provider prompt or permission. */
export const highlightIcons = ['selfie', 'camera', 'postbox', 'sparkles'] as const
export type HighlightIcon = typeof highlightIcons[number]
export interface PostHighlight {
  key: string
  title: string
  icon: HighlightIcon
}
