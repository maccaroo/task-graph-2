import { TaskGraph } from '../../components/TaskGraph/TaskGraph'
import styles from './TaskGraphView.module.css'

export function TaskGraphView() {
  return (
    <div className={styles.view}>
      <TaskGraph />
    </div>
  )
}
