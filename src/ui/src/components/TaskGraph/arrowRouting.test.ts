import { describe, expect, it } from 'vitest'
import { buildHorizontalArrowRoute, buildVerticalArrowRoute, type ArrowRect } from './arrowRouting'

function rect(x: number, y: number, width: number, height: number): ArrowRect {
  return { x, y, width, height }
}

describe('buildHorizontalArrowRoute', () => {
  it('uses a direct path when anchors are forward with room', () => {
    const route = buildHorizontalArrowRoute(
      100,
      200,
      320,
      220,
      rect(80, 174, 180, 52),
      rect(320, 194, 180, 52),
    )

    expect(route.d).toContain('M 100 200')
    expect(route.d).toContain('L 320 220')
    expect(route.d).not.toContain('L 76 200')
  })

  it('uses a short left detour for backward/nearby anchors (no wide loop)', () => {
    const route = buildHorizontalArrowRoute(
      250,
      210,
      240,
      210,
      rect(180, 184, 180, 52),
      rect(200, 184, 180, 52),
    )

    // nearest-left bypass should stay close to anchors: min(250,240) - 24 = 216
    expect(route.d).toContain('L 216 210')
    expect(route.d).not.toContain('L 150 210')
  })
})

describe('buildVerticalArrowRoute', () => {
  it('uses a direct path when anchors are forward with room', () => {
    const route = buildVerticalArrowRoute(
      120,
      100,
      160,
      320,
      rect(80, 80, 104, 180),
      rect(120, 320, 104, 180),
    )

    expect(route.d).toContain('M 120 100')
    expect(route.d).toContain('L 160 320')
    expect(route.d).not.toContain('L 120 76')
  })

  it('uses a short upward detour for backward/nearby anchors (no deep loop)', () => {
    const route = buildVerticalArrowRoute(
      160,
      260,
      160,
      250,
      rect(120, 180, 104, 180),
      rect(120, 200, 104, 180),
    )

    // nearest-up bypass should stay close to anchors: min(260,250) - 24 = 226
    expect(route.d).toContain('L 160 226')
    expect(route.d).not.toContain('L 160 150')
  })
})
