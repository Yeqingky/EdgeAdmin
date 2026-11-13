import type { AppRoute } from '../types'
import { DashboardPage } from './DashboardPage'

export const routes: AppRoute[] = [{ path: '/dashboard', element: <DashboardPage /> }]
