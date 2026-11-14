import type { AppRoute } from '../types'
import { TunnelNodesPage } from './TunnelNodesPage'
import { CreateTunnelNodePage } from './CreateTunnelNodePage'
import { TunnelLogsPage } from './TunnelLogsPage'

export const routes: AppRoute[] = [
  { path: '/tunnels/nodes', element: <TunnelNodesPage /> },
  { path: '/tunnels/nodes/create', element: <CreateTunnelNodePage /> },
  { path: '/tunnels/logs', element: <TunnelLogsPage /> },
]
