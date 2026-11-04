import type { AppClient } from '../features/app/data'
export interface ProjectLocale {
  code: string
  displayName: string
  nativeName: string | null
  isDefault: boolean
  isRtl: boolean
}
export function parseLocales(value: unknown): ProjectLocale[] {
  if (!Array.isArray(value))
    throw new Error('The project languages could not be read.')
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('Invalid project language.')
    const row = item as Record<string, unknown>
    if (
      typeof row.code !== 'string' ||
      !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(row.code) ||
      typeof row.isDefault !== 'boolean' ||
      typeof row.isRtl !== 'boolean'
    )
      throw new Error('Invalid project language.')
    return {
      code: row.code,
      displayName:
        typeof row.displayName === 'string' ? row.displayName : row.code,
      nativeName: typeof row.nativeName === 'string' ? row.nativeName : null,
      isDefault: row.isDefault,
      isRtl: row.isRtl,
    }
  })
}
export const readLocales = async (client: AppClient) =>
  parseLocales(await client.ns.project.locales({}))
export function isSystemPath(path: string) {
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return true
  }
  return (
    /^\/(?:_foir|inbound|operations|api|assets|images|\.well-known)(?:\/|$)/i.test(
      decoded,
    ) || /\.[a-z0-9]{1,8}$/i.test(decoded)
  )
}
export function pathLocale(path: string, locales: readonly ProjectLocale[]) {
  const first = path.split('/')[1]
  return locales.find(
    (locale) => locale.code.toLowerCase() === first?.toLowerCase(),
  )?.code
}
export function stripLocale(path: string, locales: readonly ProjectLocale[]) {
  if (isSystemPath(path)) return path
  const bare = pathLocale(path, locales)
    ? path.slice(
        path.indexOf('/', 1) > -1 ? path.indexOf('/', 1) : path.length,
      ) || '/'
    : path
  return isSystemPath(bare) ? path : bare
}
export function localizedPath(
  path: string,
  locale: string | undefined,
  locales: readonly ProjectLocale[],
) {
  if (!path.startsWith('/') || path.startsWith('//') || isSystemPath(path))
    return path
  const bare = stripLocale(path, locales)
  if (isSystemPath(bare) || (pathLocale(path, locales) && bare === path))
    return path
  return locale ? `/${locale}${bare === '/' ? '' : bare}` : bare
}
export function localeRewrite(
  locales: ProjectLocale[],
  locale: string | undefined,
) {
  return {
    input: ({ url }: { url: URL }) => {
      url.pathname = stripLocale(url.pathname, locales)
      return url
    },
    output: ({ url }: { url: URL }) => {
      url.pathname = localizedPath(url.pathname, locale, locales)
      return url
    },
  }
}
