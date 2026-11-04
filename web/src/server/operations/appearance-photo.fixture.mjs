// Framing fixture for sanitizer/transport tests; pixel decoding is separately
// verified against the real platform's emitted JPEG variant.
export const segment = (marker, bytes) => [255,marker,(bytes.length+2)>>8,(bytes.length+2)&255,...bytes]
export function framedJpeg(metadata = [], width = 3, height = 2) {
  return new Uint8Array([255,216,...metadata,
    ...segment(192,[8,height>>8,height&255,width>>8,width&255,3,1,17,0,2,17,0,3,17,0]),
    ...segment(218,[3,1,0,2,0,3,0,0,63,0]),1,2,255,0,3,255,217])
}
