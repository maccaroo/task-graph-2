import type { RelationshipType } from '../../services/tasks'
import type { AnchorType } from './TaskGraphItem'

export interface RelationshipResolution {
  predecessorId: string
  taskId: string
  predAnchor: AnchorType
  succAnchor: AnchorType
  relType: RelationshipType
}

/**
 * Given the two anchor endpoints of a drag (identified by task id, anchor side,
 * and canvas x-position), determine which task is the predecessor, which is the
 * successor, and what relationship type connects them.
 *
 * Returns null when the anchor combination is invalid (e.g. same task, or an
 * anchor pair that does not map to any RelationshipType).
 *
 * Rules (per spec):
 *  - Earlier anchor x-position → predecessor side.
 *  - Equal x → the task whose anchor is the *end* side becomes the predecessor.
 */
export function resolveRelationship(
  sourceId: string,
  sourceAnchor: AnchorType,
  srcAnchorX: number,
  targetId: string,
  targetAnchor: AnchorType,
  tgtAnchorX: number,
): RelationshipResolution | null {
  if (sourceId === targetId) return null

  let predecessorId: string, taskId: string
  let predAnchor: AnchorType, succAnchor: AnchorType

  if (srcAnchorX < tgtAnchorX) {
    predecessorId = sourceId; predAnchor = sourceAnchor
    taskId       = targetId;  succAnchor = targetAnchor
  } else if (tgtAnchorX < srcAnchorX) {
    predecessorId = targetId; predAnchor = targetAnchor
    taskId        = sourceId; succAnchor = sourceAnchor
  } else {
    // Equal x: end-anchor side is predecessor
    if (sourceAnchor === 'end') {
      predecessorId = sourceId; predAnchor = sourceAnchor
      taskId        = targetId; succAnchor = targetAnchor
    } else {
      predecessorId = targetId; predAnchor = targetAnchor
      taskId        = sourceId; succAnchor = sourceAnchor
    }
  }

  const relType = inferRelationshipType(predAnchor, succAnchor)
  if (!relType) return null

  return { predecessorId, taskId, predAnchor, succAnchor, relType }
}

/** Map an (predecessor-anchor, successor-anchor) pair to its RelationshipType. */
export function inferRelationshipType(
  predAnchor: AnchorType,
  succAnchor: AnchorType,
): RelationshipType | null {
  if (predAnchor === 'end'   && succAnchor === 'start') return 'Exclusive'
  if (predAnchor === 'start' && succAnchor === 'start') return 'HaveStarted'
  if (predAnchor === 'end'   && succAnchor === 'end')   return 'HaveCompleted'
  if (predAnchor === 'start' && succAnchor === 'end')   return 'HandOff'
  return null
}
