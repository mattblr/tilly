/** Tilly Premium's artwork allowance: one artwork per user in any rolling 24
 * hours, with no rollover. Fóir's native meter on the operation enforces it;
 * the app keeps no counter of its own. Change the plan here, then run
 * `pnpm configure:operations --apply`. */
export const artworkQuota={rules:[{points:1,duration:86400,scope:'user' as const,failClosed:true,
  message:'You’ve had today’s artwork. Your next one can start 24 hours after the last.'}]}
