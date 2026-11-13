import type { AppRoute } from '../types'
import { MessagesPage } from './MessagesPage'

export const routes: AppRoute[] = [{ path: '/messages', element: <MessagesPage /> }]
