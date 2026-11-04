/** Tilly avatar identity v1. Keep this byte-for-byte algorithm aligned with
 * iOS AvatarIdentity; new traits have independent salts. Never seed from email. */
export function avatarIdentity(seed: string) {
  const normalized = seed
    .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
    .replace(/[A-Z]/g, (value) => value.toLowerCase())
  const trait = (name: string, count: number) => {
    let hash = 2166136261
    for (const byte of new TextEncoder().encode(
      `tilly-avatar-v1|${normalized}|${name}`,
    ))
      hash = Math.imul(hash ^ byte, 16777619) >>> 0
    return hash % count
  }
  return {
    ears: trait('ears', 3),
    head: trait('head', 3),
    marking: trait('marking', 4),
    eyes: trait('eyes', 3),
  }
}
