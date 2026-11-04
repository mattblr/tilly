# Published app appearance

The root configuration, web runtime and native app share one W3C defaults
document: `ios/Tilly/Resources/DesignTokens.json`. It is bundled into iOS so
offline launch does not need Fóir. The root publishes that same document;
the website imports it for its initial CSS variables. Do not maintain another
native palette with independently copied defaults.

iOS reads resolved published `colors`, `spacings` and `radii` through its normal
Apollo client. `AppConfig` refreshes on launch, foreground and locale selection,
using generation guards before applying results. A successful token read starts
from defaults, so removing an override restores its default. A failed read keeps
the previous values. Cached values live in the existing environment/locale
configuration file and are validated before use. Old caches without tokens still
decode. SwiftUI observes the theme snapshot; changing it does not replace the
root view, clear navigation or discard an active capture.

The native semantic palette consumes the light/dark background, surface, ink,
muted, rule, signal and on-signal colours, plus brand blue. Page gutter and photo
radius map CSS pixels to native points; rem values use the web's default 16-unit
scale. Native gutter/radius overrides are bounded to usable layout dimensions.
Unknown names, malformed colours, expressions and unsupported units are ignored.
System control dimensions, camera contrast and illustration pigments are separate
from semantic app tokens. Typography and system controls have their own layout requirements.

Both native and website keys need `designtokens:read` for published tokens.
Apply/release reviewed token edits through Fóir and retain offline defaults.
`pnpm check:ios-theme` checks the native token parser/cache contract; inspect
actual layouts separately when changing the design.
