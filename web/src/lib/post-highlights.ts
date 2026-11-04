/** A photo highlight is the badge of a challenge the photo verifiably met.
 * Its title and badge picture come from the published challenge; they are
 * data, never markup, a provider prompt or permission. */
export interface PostHighlight {
  key: string
  title: string
  /** The challenge's uploaded badge picture, when it has one. */
  badge?: string
}
