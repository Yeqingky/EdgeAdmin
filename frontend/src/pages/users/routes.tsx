import type { AppRoute } from '../types'
import { UsersPage } from './UsersPage'
import { UserCreatePage } from './UserCreatePage'
import { UserUpdatePage } from './UserUpdatePage'
import { UserDetailPage } from './UserDetailPage'
import { UserFeaturesPage } from './UserFeaturesPage'
import { UserAccessKeysPage } from './UserAccessKeysPage'

export const routes: AppRoute[] = [
  { path: '/users', element: <UsersPage /> },
  { path: '/users/create', element: <UserCreatePage /> },
  { path: '/users/createPopup', element: <UserCreatePage /> },
  { path: '/users/update', element: <UserUpdatePage /> },
  { path: '/users/user', element: <UserDetailPage /> },
  { path: '/users/features', element: <UserFeaturesPage /> },
  { path: '/users/accesskeys', element: <UserAccessKeysPage /> },
  { path: '/users/accesskeys/createPopup', element: <UserAccessKeysPage /> },
  { path: '/users/verifyPopup', element: <UserDetailPage /> },
]
