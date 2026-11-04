/** Hosted by Fóir in the same pool; visual references use this app's published tokens. */
export const tillyLoginPage = (siteOrigin: string) => ({
  layout: {
    fullBleed: {
      card: 'right' as const,
      scrim: 'medium' as const,
    },
  },
  pageColour: { light: 'color.lightBg', dark: 'color.darkBg' },
  radius: 'radius.photo',
  media: {
    colour: { light: 'color.lightSurface', dark: 'color.darkSurface' },
    image: {
      url: `${siteOrigin}/images/app/cat.webp`,
      alt: { 'en-GB': 'A familiar face from Tilly' },
    },
  },
  content: [
    { heading: { 'en-GB': 'Login to Tilly' } },
    {
      text: {
        'en-GB': 'Share your cat, or any you come across!',
      },
    },
  ],
})
