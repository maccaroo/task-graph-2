import { TaskGraph } from '../../components/TaskGraph/TaskGraph'
import styles from './TaskGraphView.module.css'

interface TaskGraphViewProps {
  selectTaskId?: string | null
  onTaskSelected?: () => void
}

export function TaskGraphView({ selectTaskId, onTaskSelected }: TaskGraphViewProps) {
  return (
    <div className={styles.view}>
      <TaskGraph selectTaskId={selectTaskId} onTaskSelected={onTaskSelected} />
    </div>
  )
}
