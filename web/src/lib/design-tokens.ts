import defaults from '../../../ios/Tilly/Resources/DesignTokens.json'
type Token = { name: string; value: string }
export type DesignTokens = { colors: readonly Token[]; spacings: readonly Token[]; radii: readonly Token[] }
const colorSlots = { Bg: 'bg', Surface: 'surface', Ink: 'text', Muted: 'text-secondary', Rule: 'border', Signal: 'accent', OnSignal: 'on-signal' } as const
const spacingSlots: Record<string, string> = { pageGutter: 'page-gutter', pageGutterMd: 'page-gutter-md', pageWidth: 'page-width', gapSm: 'gap-sm', gapMd: 'gap-md', gapLg: 'gap-lg', sectionSm: 'section-sm', sectionMd: 'section-md' }
/** Root, web and iOS share one defaults document; published values override it. */
export function designTokenStyle(tokens?: DesignTokens | null) {
  const colors = new Map(Object.entries(defaults.color).filter(([key]) => key !== '$type').map(([name, token]) => [name, (token as { $value: string }).$value]))
  for (const token of tokens?.colors ?? []) if (/^#[0-9a-f]{6}$/i.test(token.value) && colors.has(token.name)) colors.set(token.name, token.value)
  const mode = (name: 'light' | 'dark') => Object.entries(colorSlots).map(([suffix, variable]) => `--color-tilly-${variable}:${colors.get(name + suffix)}`).join(';')
  const spaces = new Map(Object.entries(defaults.spacing).filter(([key]) => key !== '$type').map(([name, token]) => [name, (token as { $value: string }).$value]))
  for (const token of tokens?.spacings ?? []) if (/^(?:\d*\.)?\d+(?:px|rem|em)$/.test(token.value) && spaces.has(token.name)) spaces.set(token.name, token.value)
  const spacing = [...spaces].map(([name, value]) => `--${spacingSlots[name]}:${value}`).join(';')
  const radius = tokens?.radii.find(token => token.name === 'photo')?.value
  const photo = radius && /^(?:\d*\.)?\d+(?:px|rem)$/.test(radius) ? radius : defaults.radius.photo.$value
  return `:root{${mode('dark')};${spacing};--color-tilly-brand:${colors.get('brand')};--app-photo-radius:${photo}}html.light{${mode('light')}}`
}
