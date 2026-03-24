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

function toPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function polylineMidpoint(points: Point[]): { x: number; y: number } {
  if (points.length < 2) return { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0 }

  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }

  if (total <= 0) return { x: points[0].x, y: points[0].y }

  let walked = 0
  const target = total / 2
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (walked + seg >= target) {
      const t = (target - walked) / seg
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    walked += seg
  }

  const end = points[points.length - 1]
  return { x: end.x, y: end.y }
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
  const points: Point[] = [{ x: fromX, y: fromY }]
  const forwardGap = toX - fromX

  if (forwardGap >= MIN_FORWARD_GAP) {
    if (Math.abs(toY - fromY) > 1) {
      const midX = (fromX + toX) / 2
      points.push({ x: midX, y: fromY }, { x: midX, y: toY })
    }
    points.push({ x: toX, y: toY })
  } else {
    const detourY = chooseDetourMinor(fromRect, toRect, fromY, toY)

    const leftmostAnchor = Math.min(fromX, toX)
    const sideX = leftmostAnchor - DETOUR_MAJOR_GAP
    const preTargetX = toX - MIN_FORWARD_GAP

    points.push(
      { x: sideX, y: fromY },
      { x: sideX, y: detourY },
      { x: preTargetX, y: detourY },
      { x: preTargetX, y: toY },
      { x: toX, y: toY },
    )
  }

  const mid = polylineMidpoint(points)
  return { d: toPath(points), midX: mid.x, midY: mid.y }
}

export function buildVerticalArrowRoute(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromRect: ArrowRect,
  toRect: ArrowRect,
): ArrowRoute {
  const points: Point[] = [{ x: fromX, y: fromY }]
  const forwardGap = toY - fromY

  if (forwardGap >= MIN_FORWARD_GAP) {
    if (Math.abs(toX - fromX) > 1) {
      const midY = (fromY + toY) / 2
      points.push({ x: fromX, y: midY }, { x: toX, y: midY })
    }
    points.push({ x: toX, y: toY })
  } else {
    const left = Math.min(fromRect.x, toRect.x) - DETOUR_CLEARANCE
    const right = Math.max(fromRect.x + fromRect.width, toRect.x + toRect.width) + DETOUR_CLEARANCE
    const leftCost = Math.abs(fromX - left) + Math.abs(toX - left)
    const rightCost = Math.abs(fromX - right) + Math.abs(toX - right)
    const detourX = leftCost <= rightCost ? left : right

    const topAnchor = Math.min(fromY, toY)
    const sideY = topAnchor - DETOUR_MAJOR_GAP
    const preTargetY = toY - MIN_FORWARD_GAP

    points.push(
      { x: fromX, y: sideY },
      { x: detourX, y: sideY },
      { x: detourX, y: preTargetY },
      { x: toX, y: preTargetY },
      { x: toX, y: toY },
    )
  }

  const mid = polylineMidpoint(points)
  return { d: toPath(points), midX: mid.x, midY: mid.y }
}
