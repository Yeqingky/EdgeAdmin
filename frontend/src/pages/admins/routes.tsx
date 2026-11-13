import type { AppRoute } from '../types'
import { AdminsPage } from './AdminsPage'
import { AdminCreatePage } from './AdminCreatePage'
import { AdminUpdatePage } from './AdminUpdatePage'
import { AdminDetailPage } from './AdminDetailPage'
import { AdminAccessKeysPage } from './AdminAccessKeysPage'

export const routes: AppRoute[] = [
  { path: '/admins', element: <AdminsPage /> },
  { path: '/admins/create', element: <AdminCreatePage /> },
  { path: '/admins/createPopup', element: <AdminCreatePage /> },
  { path: '/admins/update', element: <AdminUpdatePage /> },
  { path: '/admins/admin', element: <AdminDetailPage /> },
  { path: '/admins/accesskeys', element: <AdminAccessKeysPage /> },
]
