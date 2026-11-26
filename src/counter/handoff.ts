// Palm positions relative to each registered character's feet, in sprite heights.
// Body art and the actual served item use the same scale and rotation.
const palms: Record<string, readonly [number, number]> = {
  a: [-0.0036, -0.7200],
  b: [ 0.0046, -0.7163],
  c: [-0.0063, -0.6975],
  d: [ 0.0101, -0.7107],
  e: [-0.0048, -0.7005],
  f: [ 0.0023, -0.7124],
}

const liftedPalms: Record<string, readonly [number, number]> = {
  a: [-0.0037, -0.8036],
  b: [ 0.0054, -0.7895],
  c: [ 0.0050, -0.7766],
  d: [ 0.0027, -0.7960],
  e: [-0.0016, -0.7816],
  f: [ 0.0013, -0.7955],
}

export const receivingSpriteIds = Object.keys(palms).flatMap(id => [
  'guest-' + id + '-receive',
  'guest-' + id + '-sip',
])

// Rest, lift, taste, and lower. A bite is shorter than a continuous sip.
export function sipPhase(seconds:number, period:number, hold:number, drink:boolean) {
  const start=drink?.35:.43
  if(seconds<start)return 0
  const phase=(seconds-start)%period
  const rise=drink?.31:.22,stay=drink?hold:.34,fall=drink?.36:.25
  const linear=Math.max(0,Math.min(1,phase/rise,(rise+stay+fall-phase)/fall))
  return linear*linear*(3-2*linear)
}

export function handoffAnchor(look: string, x: number, feetY: number, height: number, lean = 0, raised = 0) {
  const [rx, ry] = palms[look] ?? palms.a
  const [sx, sy] = liftedPalms[look] ?? liftedPalms.a
  const dx = rx + (sx - rx) * raised
  const dy = ry + (sy - ry) * raised
  const cos = Math.cos(lean)
  const sin = Math.sin(lean)
  return {
    x: x + height * (dx * cos - dy * sin),
    y: feetY + height * (dx * sin + dy * cos),
  }
}
