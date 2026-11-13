import type { AppRoute } from '../types'
import { DbNodesPage } from './DbNodesPage'
import { DbNodeCreatePage } from './DbNodeCreatePage'
import { DbNodeUpdatePage } from './DbNodeUpdatePage'
import { DbNodeDetailPage } from './DbNodeDetailPage'
import { DbCleanPage } from './DbCleanPage'
import { DbLogsPage } from './DbLogsPage'

export const routes: AppRoute[] = [
  { path: '/db', element: <DbNodesPage /> },
  { path: '/db/create', element: <DbNodeCreatePage /> },
  { path: '/db/createPopup', element: <DbNodeCreatePage /> },
  { path: '/db/update', element: <DbNodeUpdatePage /> },
  { path: '/db/node', element: <DbNodeDetailPage /> },
  { path: '/db/clean', element: <DbCleanPage /> },
  { path: '/db/logs', element: <DbLogsPage /> },
]
