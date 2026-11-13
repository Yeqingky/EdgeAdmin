import { Navigate } from 'react-router-dom'
import type { AppRoute } from '../types'
import { LoginSettingsPage, ProfileSettingsPage } from './settings/AccountSettingsPages'
import { DatabaseCleanPage, DatabaseCleanSettingPage, DatabasePage } from './settings/DatabasePages'
import { BackupSettingsPage, UpgradeSettingsPage, AboutQQPage } from './settings/RetiredSettingsPages'
import { SecuritySettingsPage } from './settings/SecuritySettingsPage'
import { ServerSettingsPage, UpdateHTTPPopupPage, UpdateHTTPSPopupPage } from './settings/ServerSettingsPage'
import { TransferSettingsPage } from './settings/TransferSettingsPage'
import { UpdatesSettingsPage } from './settings/UpdatesSettingsPage'
import { ApiMethodStatsPage, ApiNodesPage } from './api/ApiNodesListPage'
import {
  ApiNodeCreatePage,
  ApiNodeDetailPage,
  ApiNodeInstallPage,
  ApiNodeLogsPage,
  ApiNodeUpdatePage,
  CreateAddressPage,
  UpdateAddressPage,
} from './api/ApiNodePages'
import { UpgradeApiNodeRoutePage } from './api/ApiNodeUpgrade'
import { MessagesPage } from './messages/MessagesPage'
import { RecoverPage } from './recover/RecoverPage'
import { CreateNodeIPAddressPage, UpdateNodeIPAddressPage } from './nodes/NodeIPAddressPages'
import { SelectCountriesPage, SelectProvincesPage } from './ui/RegionPages'

export const routes: AppRoute[] = [
  { path: '/settings', element: <Navigate to="/settings/server" replace /> },
  { path: '/settings/advanced', element: <Navigate to="/settings/database" replace /> },

  { path: '/settings/server', element: <ServerSettingsPage /> },
  { path: '/settings/server/updateHTTPPopup', element: <UpdateHTTPPopupPage /> },
  { path: '/settings/server/updateHTTPSPopup', element: <UpdateHTTPSPopupPage /> },
  { path: '/settings/backup', element: <BackupSettingsPage /> },
  { path: '/settings/upgrade', element: <UpgradeSettingsPage /> },

  { path: '/settings/database', element: <DatabasePage /> },
  { path: '/settings/database/clean', element: <DatabaseCleanPage /> },
  { path: '/settings/database/cleanSetting', element: <DatabaseCleanSettingPage /> },

  { path: '/settings/login', element: <LoginSettingsPage /> },
  { path: '/settings/profile', element: <ProfileSettingsPage /> },
  { path: '/settings/security', element: <SecuritySettingsPage /> },
  { path: '/settings/transfer', element: <TransferSettingsPage /> },
  { path: '/settings/updates', element: <UpdatesSettingsPage /> },

  { path: '/settings/api', element: <ApiNodesPage /> },
  { path: '/settings/api/methodStats', element: <ApiMethodStatsPage /> },
  { path: '/settings/api/node', element: <ApiNodeDetailPage /> },
  { path: '/settings/api/node/install', element: <ApiNodeInstallPage /> },
  { path: '/settings/api/node/logs', element: <ApiNodeLogsPage /> },
  { path: '/settings/api/node/update', element: <ApiNodeUpdatePage /> },
  { path: '/settings/api/node/createPopup', element: <ApiNodeCreatePage /> },
  { path: '/settings/api/node/createAddrPopup', element: <CreateAddressPage /> },
  { path: '/settings/api/node/updateAddrPopup', element: <UpdateAddressPage /> },
  { path: '/settings/api/node/upgradePopup', element: <UpgradeApiNodeRoutePage /> },

  { path: '/messages', element: <MessagesPage /> },
  { path: '/recover', element: <RecoverPage /> },

  { path: '/nodes/ipAddresses/createPopup', element: <CreateNodeIPAddressPage /> },
  { path: '/nodes/ipAddresses/updatePopup', element: <UpdateNodeIPAddressPage /> },

  { path: '/ui/selectCountriesPopup', element: <SelectCountriesPage /> },
  { path: '/ui/selectProvincesPopup', element: <SelectProvincesPage /> },

  { path: '/about/qq', element: <AboutQQPage /> },
]
