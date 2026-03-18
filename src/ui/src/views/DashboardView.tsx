import { useOutletContext } from 'react-router-dom'
import type { AppShellOutletContext } from '../layouts/AppShell'
import { TaskGraphView } from './tasks/TaskGraphView'
import { TaskListView } from './tasks/TaskListView'

export function DashboardView() {
  const { activeView, selectTaskId, clearSelectTaskId } = useOutletContext<AppShellOutletContext>()

  return activeView === 'graph'
    ? <TaskGraphView selectTaskId={selectTaskId} onTaskSelected={clearSelectTaskId} />
    : <TaskListView selectTaskId={selectTaskId} onTaskSelected={clearSelectTaskId} />
}
