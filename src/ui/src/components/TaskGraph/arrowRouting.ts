export interface ArrowRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ArrowRoute {
  d: string
  midX: number
  midY: number
}

interface Point {
  x: number
  y: number
}

const MIN_FORWARD_GAP = 16
const DETOUR_CLEARANCE = 14
const DETOUR_MAJOR_GAP = 24

function cubicMidpoint(p0: Point, p1: Point, p2: Point, p3: Point): Point {
  // Cubic Bezier at t=0.5: (p0 + 3p1 + 3p2 + p3) / 8
  return {
    x: (p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8,
    y: (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8,
  }
}

function chooseDetourMinor(fromRect: ArrowRect, toRect: ArrowRect, n1: number, n2: number): number {
  const top = Math.min(fromRect.y, toRect.y) - DETOUR_CLEARANCE
  const bottom = Math.max(fromRect.y + fromRect.height, toRect.y + toRect.height) + DETOUR_CLEARANCE
  const topCost = Math.abs(n1 - top) + Math.abs(n2 - top)
  const bottomCost = Math.abs(n1 - bottom) + Math.abs(n2 - bottom)
  return topCost <= bottomCost ? top : bottom
}

export function buildHorizontalArrowRoute(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromRect: ArrowRect,
  toRect: ArrowRect,
): ArrowRoute {
  const forwardGap = toX - fromX
  const p0 = { x: fromX, y: fromY }
  const p3 = { x: toX, y: toY }

  let p1: Point
  let p2: Point

  if (forwardGap >= MIN_FORWARD_GAP) {
    const cx = (fromX + toX) / 2
    p1 = { x: cx, y: fromY }
    p2 = { x: cx, y: toY }
  } else {
    const leftmostAnchor = Math.min(fromX, toX)
    const sideX = leftmostAnchor - DETOUR_MAJOR_GAP
    // Keep curves smooth while nudging around the nearest edge side.
    const detourY = chooseDetourMinor(fromRect, toRect, fromY, toY)
    const yBlend = (detourY + toY) / 2
    p1 = { x: sideX, y: fromY }
    p2 = { x: sideX, y: yBlend }
  }

  const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
  const mid = cubicMidpoint(p0, p1, p2, p3)
  return { d, midX: mid.x, midY: mid.y }
}

export function buildVerticalArrowRoute(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromRect: ArrowRect,
  toRect: ArrowRect,
): ArrowRoute {
  const forwardGap = toY - fromY
  const p0 = { x: fromX, y: fromY }
  const p3 = { x: toX, y: toY }

  let p1: Point
  let p2: Point

  if (forwardGap >= MIN_FORWARD_GAP) {
    const cy = (fromY + toY) / 2
    p1 = { x: fromX, y: cy }
    p2 = { x: toX, y: cy }
  } else {
    const topAnchor = Math.min(fromY, toY)
    const sideY = topAnchor - DETOUR_MAJOR_GAP

    const left = Math.min(fromRect.x, toRect.x) - DETOUR_CLEARANCE
    const right = Math.max(fromRect.x + fromRect.width, toRect.x + toRect.width) + DETOUR_CLEARANCE
    const leftCost = Math.abs(fromX - left) + Math.abs(toX - left)
    const rightCost = Math.abs(fromX - right) + Math.abs(toX - right)
    const detourX = leftCost <= rightCost ? left : right
    const xBlend = (detourX + toX) / 2

    p1 = { x: fromX, y: sideY }
    p2 = { x: xBlend, y: sideY }
  }

  const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
  const mid = cubicMidpoint(p0, p1, p2, p3)
  return { d, midX: mid.x, midY: mid.y }
}
