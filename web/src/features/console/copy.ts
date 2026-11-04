/** Translate display labels; enum values used for transport stay unchanged. */
export function stateLabel(value:string, copy:(key:string)=>string) {
  const supported=new Set(['ready','generating','reserved','recovery','failed','error','completed','running','queued','cancelled','timed_out','pending','active','unavailable','not-qualified','qualified','hidden','flagged','open','released','approved','dismissed','saved','draft'])
  const key=value.toLowerCase()
  return copy(`console.state.${supported.has(key)?key:'unknown'}`)
}

/** Unknown provider vocabulary remains data rather than becoming a missing key. */
export function qualityLabel(value:string, copy:(key:string)=>string) {
  if (!['low','medium','high','auto'].includes(value)) return value
  const key=`console.quality.${value}`,label=copy(key)
  return label===key?value:label
}
