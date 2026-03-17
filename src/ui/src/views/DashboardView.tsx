import { useOutletContext } from 'react-router-dom'
import type { AppShellOutletContext } from '../layouts/AppShell'
import { TaskGraphView } from './tasks/TaskGraphView'
import { TaskListView } from './tasks/TaskListView'

export function DashboardView() {
  const { activeView } = useOutletContext<AppShellOutletContext>()

  return activeView === 'graph' ? <TaskGraphView /> : <TaskListView />
}
