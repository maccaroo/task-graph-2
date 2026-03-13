import { TaskList } from '../../components/TaskList/TaskList'
import styles from './TaskListView.module.css'

export function TaskListView() {
  return (
    <div className={styles.view}>
      <TaskList />
    </div>
  )
}
