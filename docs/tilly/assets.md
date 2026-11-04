# Sample artwork and licenses

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

The marketing site uses generated illustrations throughout. The iOS paywall’s
sample encounter and cubist art use the same fictional tuxedo cat. These replace
personal photographs; no user records are exported with the template.

| Asset                                                              | Use                                 |
| ------------------------------------------------------------------ | ----------------------------------- |
| `web/public/images/app/street.webp`                                | Neighbourhood and hero collage      |
| `web/public/images/app/cat.webp`                                   | Fictional cat and encounter example |
| `web/public/images/app/cubist-cat.webp`                             | The same cat in cubist art           |
| `web/public/images/app/friends.webp`                               | Collection and social story         |
| `ios/Tilly/Assets.xcassets/PaywallPhoto.imageset/PaywallPhoto.png` | Sample encounter                    |
| `ios/Tilly/Assets.xcassets/PaywallArt.imageset/PaywallArt.png`     | Sample art                          |

Original PNGs live in `assets/illustrations/`; WebP exports serve the website.
Created with the built-in OpenAI image generation tool. [Generation prompts](asset-prompts.md)
are included so an agent adapting the app can replace the set coherently. They
are marketing illustrations, not photographs or screenshots of real users.
The cat animations and branding already bundled with the app remain example
assets; replace those too when adapting the app’s identity.

Source code is MIT. Work Sans fonts retain their OFL notice under
`web/public/fonts/WorkSans-OFL.txt`. Copied shadcn components retain their
MIT notice under `web/src/features/console/SHADCN-LICENSE.md`. Dependencies retain their own licenses.

The site’s visual references are [Albo](https://albo.inc/) and
[taste-skill](https://github.com/Leonxlnx/taste-skill). Their imagery, copy and code
are not bundled. User-selected references take precedence over a randomly drawn
design direction. Keep generated examples distinct from claims about real users.

The web loading animation copies the 61 existing native RoaringCat PNG frames without modification into `web/public/images/roaring-cat/`, preserving the iOS 20fps timing. Reduced motion displays the middle frame; these assets are not user photographs.

Default neighbourhood-cat avatars use original vector geometry shared by web
and iOS in `ios/Tilly/Resources/AvatarGeometry.json`. They were drawn in code,
without image-generation calls, stock character art or user photos. Stable
user-ID seeds select ears, head shape, markings and eyes; existing profile
photos take priority. See [avatars.md](avatars.md).

## Layered app icon

`ios/Artwork/TillyCat.svg` is a hand-traced vector rendition of the existing
blue/porcelain cat-head drawing, retaining its ears, closed eye and tongue.
Icon Composer MCP created `ios/Tilly/TillyIcon.icon` from that foreground with
Tilly blue `#1558DF` and a dark `#10295F` background. The opaque 1024px marketing export is
`ios/Artwork/TillyIcon-marketing.png`. The opaque export is installed in the asset catalog as a fallback; Xcode selects
the layered icon for the app target. No additional image-generation call was used.

The current art sample is a Picasso-inspired cubist reinterpretation of the
fictional cat, generated with the built-in image tool. The original is
`assets/illustrations/cubist-cat.png` and the
same output is used for the native paywall and website. This is illustrative
sample artwork, not a measured provider-quality claim or a copied painting.
