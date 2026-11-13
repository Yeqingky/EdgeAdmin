export interface LeftMenuItem {
  name: string
  url: string
  isActive?: boolean
  isOn?: boolean
  isOff?: boolean
  isImportant?: boolean
}

export interface LocationPatternConfig {
  id: number
  pattern: string
  name?: string
  isOn?: boolean
}

export interface LocationBaseData {
  serverId: number
  locationId: number
  locationConfig?: LocationPatternConfig | null
  tinyLeftMenuItems?: LeftMenuItem[]
  webId?: number
}

export interface UrlPattern {
  type: string
  pattern: string
}

export interface SizeCapacity {
  count: number
  unit: string
}

export interface TimeDuration {
  count: number
  unit: string
}

export interface RequestCond {
  type?: string
  isRequest?: boolean
  param: string
  operator: string
  value: string
  isReverse?: boolean
  isCaseInsensitive?: boolean
}

export interface RequestCondGroup {
  isOn?: boolean
  connector?: string
  conds: RequestCond[]
  isReverse?: boolean
  description?: string
}

export interface RequestCondsConfig {
  isOn?: boolean
  connector: string
  groups: RequestCondGroup[]
}

export interface ReverseProxyRef {
  isPrior: boolean
  isOn: boolean
  reverseProxyId: number
}

export interface ReverseProxyConfig {
  id: number
  isOn?: boolean
  requestHostType: number
  requestHost: string
  requestHostExcludingPort: boolean
  requestURI: string
  stripPrefix: string
  addHeaders: string[]
  autoFlush: boolean
  followRedirects: boolean
  retry50X: boolean
  retry40X: boolean
  connTimeout: TimeDuration
  readTimeout: TimeDuration
  idleTimeout: TimeDuration
  maxConns: number
  maxIdleConns: number
  proxyProtocol: { isOn: boolean; version: number }
}

export interface OriginSummary {
  id: number
  weight: number
  addr: string
  isOSS: boolean
  name: string
  isOn: boolean
  domains: string[]
  hasCert: boolean
  host: string
  followPort: boolean
  http2Enabled: boolean
}

export interface SchedulingType {
  code: string
  name: string
  description: string
  options?: Record<string, unknown> | null
}
