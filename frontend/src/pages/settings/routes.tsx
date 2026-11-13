import type { AppRoute } from '../types'
import { SettingsUIPage } from './SettingsUIPage'

export const routes: AppRoute[] = [{ path: '/settings/ui', element: <SettingsUIPage /> }]
