// Shared types for the server location (路由规则) pages.
// All keys mirror the JSON produced by the Go actions under
// internal/web/actions/default/servers/server/settings/locations.

export interface ServerInfo {
  id: number
  name: string
  clusterId: number
}

export interface MenuItem {
  name: string
  url: string
  isActive?: boolean
  isOn?: boolean
  isOff?: boolean
  isImportant?: boolean
}

export interface PatternType {
  name: string
  type: number
  description: string
}

export interface SizeCapacity {
  count: number
  unit: string
}

export interface TimeDuration {
  count: number
  unit: string
}

export interface URLPattern {
  type: string
  pattern: string
}

export interface RequestCond {
  type: string
  isRequest?: boolean
  param: string
  operator: string
  value: string
  isReverse?: boolean
  isCaseInsensitive?: boolean
}

export interface RequestCondGroup {
  isOn?: boolean
  connector: string
  conds: RequestCond[]
  isReverse?: boolean
  description?: string
}

export interface RequestCondsConfig {
  isOn: boolean
  connector: string
  groups: RequestCondGroup[]
}

export interface HeaderPolicyRef {
  isPrior: boolean
  isOn: boolean
  headerPolicyId: number
}

export interface HeaderStatus {
  always?: boolean
  codes?: number[]
  min?: number
  max?: number
}

export interface HeaderConfig {
  id: number
  isOn: boolean
  name: string
  value: string
  status?: HeaderStatus | null
  disableRedirect?: boolean
  shouldAppend?: boolean
  shouldReplace?: boolean
  replaceValues?: { pattern: string; replacement: string; isCaseInsensitive?: boolean; isRegexp?: boolean }[]
  methods?: string[]
  domains?: string[]
}

export interface CorsConfig {
  isOn: boolean
  allowMethods?: string[]
  allowOrigin?: string
  allowCredentials?: boolean
  maxAge?: number
  requestHeaders?: string[]
  exposeHeaders?: string[]
  requestMethod?: string
  optionsMethodOnly?: boolean
}

export interface HeaderPolicy {
  id: number
  name: string
  isOn: boolean
  description: string
  setHeaders?: HeaderConfig[]
  deleteHeaders?: string[]
  nonStandardHeaders?: string[]
  cors?: CorsConfig | null
}

export interface AuthPolicyParams {
  users?: unknown[]
  method?: string
  url?: string
  signParamName?: string
  timestampParamName?: string
  life?: number
  exts?: string[]
  domains?: string[]
}

export interface AuthPolicy {
  id: number
  name: string
  isOn: boolean
  type: string
  params?: AuthPolicyParams | null
}

export interface AuthPolicyRef {
  isOn: boolean
  authPolicyId: number
  authPolicy?: AuthPolicy | null
}

export interface AuthConfig {
  isPrior: boolean
  isOn: boolean
  policyRefs: AuthPolicyRef[]
}

export interface AccessLogConfig {
  isPrior: boolean
  isOn: boolean
  fields: number[]
  status1: boolean
  status2: boolean
  status3: boolean
  status4: boolean
  status5: boolean
  enableClientClosed: boolean
  firewallOnly: boolean
}

export interface AccessLogField {
  code: number
  name: string
}

export interface CacheKeyConfig {
  isOn: boolean
  scheme: string
  host: string
}

export interface CacheRef {
  id?: number
  isOn: boolean
  cachePolicyId: number
  key: string
  life: TimeDuration
  status: number[]
  minSize: SizeCapacity
  maxSize: SizeCapacity
  methods: string[]
  skipCacheControlValues?: string[]
  skipSetCookie?: boolean
  enableRequestCachePragma?: boolean
  allowChunkedEncoding?: boolean
  allowPartialContent?: boolean
  forcePartialContent?: boolean
  alwaysForwardRangeRequest?: boolean
  enableIfNoneMatch?: boolean
  enableIfModifiedSince?: boolean
  enableReadingOriginAsync?: boolean
  conds?: RequestCondsConfig | null
  simpleCond?: RequestCond | null
  isReverse: boolean
  visible?: boolean
}

export interface CacheConfig {
  isPrior: boolean
  isOn: boolean
  addStatusHeader: boolean
  addAgeHeader: boolean
  enableCacheControlMaxAge: boolean
  disablePolicyRefs: boolean
  purgeIsOn: boolean
  purgeKey: string
  key?: CacheKeyConfig | null
  cacheRefs: CacheRef[]
  stale?: unknown
}

export interface CachePolicy {
  id: number
  name: string
  isOn: boolean
  maxBytes?: SizeCapacity | null
}

export interface CharsetConfig {
  isPrior: boolean
  isOn: boolean
  charset: string
  isUpper: boolean
  force: boolean
}

export interface CharsetItem {
  charset: string
  name: string
}

export interface CompressionRef {
  id: number
  isOn: boolean
  isPrior?: boolean
}

export interface CompressionConfig {
  isPrior: boolean
  isOn: boolean
  useDefaultTypes: boolean
  types: string[]
  level: number
  decompressData: boolean
  gzipRef?: CompressionRef | null
  deflateRef?: CompressionRef | null
  brotliRef?: CompressionRef | null
  gzip?: unknown
  deflate?: unknown
  brotli?: unknown
  minLength?: SizeCapacity | null
  maxLength?: SizeCapacity | null
  mimeTypes: string[]
  extensions: string[]
  exceptExtensions: string[]
  conds?: RequestCondsConfig | null
  enablePartialContent: boolean
  onlyURLPatterns: URLPattern[]
  exceptURLPatterns: URLPattern[]
}

export interface FastcgiRef {
  isPrior: boolean
  isOn: boolean
  fastcgiIds: number[]
}

export interface FastcgiConfig {
  id: number
  isOn: boolean
  address: string
  params?: Record<string, string> | null
  readTimeout?: TimeDuration | null
  poolSize?: number
  pathInfoPattern?: string
}

export interface RedirectToHttpsConfig {
  isPrior: boolean
  isOn: boolean
  host: string
  port: number
  status: number
  onlyDomains?: string[] | null
  exceptDomains?: string[] | null
}

export interface LocationWebConfig {
  id?: number
  accessLog?: AccessLogConfig | null
  cache?: CacheConfig | null
  charset?: CharsetConfig | null
  compression?: CompressionConfig | null
  fastcgiRef?: FastcgiRef | null
  redirectToHTTPS?: RedirectToHttpsConfig | null
  requestHeaderPolicyRef?: HeaderPolicyRef | null
  requestHeaderPolicy?: HeaderPolicy | null
  responseHeaderPolicyRef?: HeaderPolicyRef | null
  responseHeaderPolicy?: HeaderPolicy | null
  websocketRef?: { isPrior: boolean; isOn: boolean } | null
  websocket?: { isOn: boolean } | null
  root?: { isPrior: boolean; isOn: boolean } | null
  pages?: { id: number; status: number[]; url: string }[] | null
  shutdown?: { isPrior: boolean; isOn: boolean } | null
  rewriteRules?: { pattern: string; replace: string }[] | null
  remoteAddr?: { isPrior: boolean; isOn: boolean } | null
  requestLimit?: { isPrior: boolean; isOn: boolean } | null
  uam?: { isPrior: boolean; isOn: boolean } | null
  cc?: { isPrior: boolean; isOn: boolean } | null
  statRef?: { isPrior: boolean; isOn: boolean } | null
  requestScripts?: {
    initGroup?: { isPrior: boolean } | null
    requestGroup?: { isPrior: boolean } | null
  } | null
  gzipRef?: CompressionRef | null
  gzip?: { level: number } | null
}

export interface LocationConfig {
  id: number
  isOn: boolean
  pattern: string
  name: string
  description: string
  isBreak: boolean
  domains?: string[] | null
  conds?: RequestCondsConfig | null
  web?: LocationWebConfig | null
  reverseProxyRef?: { isPrior: boolean; isOn: boolean } | null
  reverseProxy?: { isOn: boolean } | null
}

export interface LocationListItem extends LocationConfig {
  patternTypeName: string
}

export interface LocationPageBase {
  serverId?: number
  server?: ServerInfo
  webId: number
  locationId?: number
  locationConfig?: LocationConfig | null
  leftMenuItems?: MenuItem[]
  tinyLeftMenuItems?: MenuItem[]
  leftMenuItemIsDisabled?: boolean
}

export interface LeftMenuData {
  server?: ServerInfo
  leftMenuItems?: MenuItem[]
  leftMenuItemIsDisabled?: boolean
}

export function spaLink(url: string): string {
  return `#${url}`
}
