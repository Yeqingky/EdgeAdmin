import type { AppRoute } from '../types'
import { LogListPage } from './LogListPage'
import { LogSettingsPage } from './LogSettingsPage'
import { LogCleanPage } from './LogCleanPage'

export const routes: AppRoute[] = [
  { path: '/log', element: <LogListPage /> },
  { path: '/log/settings', element: <LogSettingsPage /> },
  { path: '/log/clean', element: <LogCleanPage /> },
]
