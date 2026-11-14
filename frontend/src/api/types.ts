export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface MenuSubItem {
  name: string
  url?: string
  code: string
  badge?: number
  isOn?: boolean
  subItems?: MenuSubItem[]
}

export interface MenuModule {
  code: string
  module?: string
  name: string
  subtitle?: string
  icon?: string
  isOn?: boolean
  subItems?: MenuSubItem[]
}

export interface TabItem {
  name: string
  subName?: string
  url: string
  isActive?: boolean
  isDisabled?: boolean
  isRight?: boolean
  isTitle?: boolean
  icon?: string
}

export interface SessionData {
  isAuthenticated: boolean
  teaUsername: string
  teaTitle: string
  teaName: string
  teaVersion: string
  teaShowVersion: boolean
  teaLogoFileId: number
  teaTheme: string
  teaModules: MenuModule[]
  teaSubMenus: unknown[]
  teaTabbar: TabItem[]
  teaIsSuper: boolean
  teaIsPlus: boolean
  teaDemoEnabled: boolean
  teaShowFinance: boolean
  teaLang: string
  teaXFFPrompt: boolean
  teaCheckNodeTasks: boolean
  teaCheckDNSTasks: boolean
}

export interface LoginInfo {
  isConfigured: boolean
  isNewInstalled: boolean
  isDemo: boolean
  isUser: boolean
  token: string
  systemName: string
  showVersion: boolean
  version: string
}
