/** Native meter: independent from uploads and appearance analysis. */
export const artworkQuota={rules:[{points:10,duration:86400,scope:'user' as const,failClosed:true,
  message:'Artwork requests are temporarily paused. Try again later.'}]}
