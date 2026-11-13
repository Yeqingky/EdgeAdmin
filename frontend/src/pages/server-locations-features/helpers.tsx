import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import type {
  LocationBaseData,
  RequestCondsConfig,
  ReverseProxyConfig,
  ReverseProxyRef,
  SizeCapacity,
  TimeDuration,
  UrlPattern,
} from './types'

export function useLocationData<T extends LocationBaseData>(path: string, queryKey: string) {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const locationId = Number(searchParams.get('locationId') || 0) || 0
  const query = useQuery({
    queryKey: [queryKey, serverId, locationId],
    queryFn: () => apiGet<T>(path, { serverId, locationId }),
    enabled: locationId > 0,
  })
  return { query, serverId, locationId }
}

export function MissingLocation() {
  return <div className="ui negative message">缺少路由规则ID，请从路由规则列表进入。</div>
}

export function defaultUrlPatterns(patterns?: UrlPattern[] | null): UrlPattern[] {
  return patterns ? patterns.map((pattern) => ({ ...pattern })) : []
}

export function defaultSizeCapacity(value: SizeCapacity | null | undefined, count: number, unit: string): SizeCapacity {
  if (!value) {
    return { count, unit }
  }
  return { count: typeof value.count === 'number' ? value.count : count, unit: value.unit || unit }
}

export function defaultTimeDuration(value: TimeDuration | null | undefined, count: number, unit = 'second'): TimeDuration {
  if (!value) {
    return { count, unit }
  }
  return { count: typeof value.count === 'number' ? value.count : count, unit: value.unit || unit }
}

export function defaultConds(conds?: RequestCondsConfig | null): RequestCondsConfig {
  if (!conds) {
    return { isOn: true, connector: 'or', groups: [] }
  }
  return {
    isOn: conds.isOn ?? true,
    connector: conds.connector || 'or',
    groups: (conds.groups || []).map((group) => ({
      ...group,
      conds: (group.conds || []).map((cond) => ({ ...cond })),
    })),
  }
}

export function defaultReverseProxyRef(ref?: ReverseProxyRef | null): ReverseProxyRef {
  return {
    isPrior: ref?.isPrior ?? false,
    isOn: ref?.isOn ?? false,
    reverseProxyId: ref?.reverseProxyId ?? 0,
  }
}

export function defaultReverseProxyConfig(config?: Partial<ReverseProxyConfig> | null): ReverseProxyConfig {
  return {
    id: config?.id ?? 0,
    isOn: config?.isOn ?? false,
    requestHostType: config?.requestHostType ?? 0,
    requestHost: config?.requestHost ?? '',
    requestHostExcludingPort: config?.requestHostExcludingPort ?? false,
    requestURI: config?.requestURI ?? '',
    stripPrefix: config?.stripPrefix ?? '',
    addHeaders: config?.addHeaders ? [...config.addHeaders] : [],
    autoFlush: config?.autoFlush ?? false,
    followRedirects: config?.followRedirects ?? false,
    retry50X: config?.retry50X ?? false,
    retry40X: config?.retry40X ?? false,
    connTimeout: defaultTimeDuration(config?.connTimeout, 0),
    readTimeout: defaultTimeDuration(config?.readTimeout, 0),
    idleTimeout: defaultTimeDuration(config?.idleTimeout, 0),
    maxConns: config?.maxConns ?? 0,
    maxIdleConns: config?.maxIdleConns ?? 0,
    proxyProtocol: {
      isOn: config?.proxyProtocol?.isOn ?? false,
      version: config?.proxyProtocol?.version ?? 1,
    },
  }
}
