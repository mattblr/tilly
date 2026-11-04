/** Provider/SDK errors stay in private runtime logs; credentials and URLs never do. */
export function billingFailureReason(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Unknown billing failure'
  const category = failureCategory(error)
  const safe = message
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[credential]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
    .replace(
      /\b(?:[prs]k_(?:test|live)_[A-Za-z0-9_]+|whsec_[A-Za-z0-9_]+)\b/g,
      '[credential]',
    )
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [credential]')
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[token]',
    )
    .slice(0, 1200)
  return category ? `${category}: ${safe}`.slice(0, 1200) : safe
}

/** Never serialize a nested cause: it may carry a request, body or credential. */
function failureCategory(error: unknown): string | undefined {
  const seen = new Set<Error>()
  let current: unknown = error
  for (let depth = 0; depth < 4 && current instanceof Error && !seen.has(current); depth++) {
    seen.add(current)
    if (/too many (?:concurrent )?subrequests/i.test(current.message)) return 'subrequest_limit'
    if (/too many (?:concurrent )?(?:api )?requests/i.test(current.message)) return 'request_limit'
    if (current.name === 'TimeoutError' || current.name === 'AbortError') return 'transport_timeout'
    current = current.cause
  }
  return undefined
}
