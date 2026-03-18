import { TaskList } from '../../components/TaskList/TaskList'
import styles from './TaskListView.module.css'

interface TaskListViewProps {
  selectTaskId?: string | null
  onTaskSelected?: () => void
}

export function TaskListView({ selectTaskId, onTaskSelected }: TaskListViewProps) {
  return (
    <div className={styles.view}>
      <TaskList selectTaskId={selectTaskId} onTaskSelected={onTaskSelected} />
    </div>
  )
}
