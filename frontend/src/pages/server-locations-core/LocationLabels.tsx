import type { ReactNode } from 'react'
import { spaLink, type LocationConfig, type LocationListItem } from './types'

function Label({ href, children, tone }: { href: string; children: ReactNode; tone?: string }) {
  return (
    <a
      href={spaLink(href)}
      className={`ui label tiny basic${tone ? ` ${tone}` : ''}`}
      style={{ fontSize: '0.7em', padding: 4, marginTop: '0.3em', marginBottom: '0.3em' }}
    >
      {children}
    </a>
  )
}

function configIsOn(config?: { isPrior: boolean; isOn: boolean } | null): boolean {
  return config != null && config.isPrior && config.isOn
}

function refIsOn(ref?: { isPrior: boolean; isOn: boolean } | null, config?: { isOn: boolean } | null): boolean {
  return configIsOn(ref) && config != null && config.isOn
}

// 路由规则标签(对应 legacy http-location-labels)
export function LocationLabels({ location, serverId }: { location: LocationConfig | LocationListItem; serverId: string }) {
  const web = location.web || undefined
  const locationId = String(location.id)
  const url = (path: string) => `/servers/server/settings/locations${path}?serverId=${serverId}&locationId=${locationId}`
  const domains = location.domains || []

  const hasRequestHeaders =
    (web?.requestHeaderPolicy?.setHeaders?.length || 0) > 0 ||
    (web?.requestHeaderPolicy?.deleteHeaders?.length || 0) > 0
  const hasResponseHeaders =
    (web?.responseHeaderPolicy?.setHeaders?.length || 0) > 0 ||
    (web?.responseHeaderPolicy?.deleteHeaders?.length || 0) > 0

  return (
    <div className="labels-box">
      {location.name ? <Label href={url('/location')} tone="olive">{location.name}</Label> : null}

      {domains.length > 0 ? (
        <div>
          {domains.map((domain) => (
            <span key={domain} className="ui label tiny basic" style={{ fontSize: '0.7em' }}>{domain}</span>
          ))}
        </div>
      ) : null}

      {location.isBreak ? <Label href={url('/location')}>BREAK</Label> : null}

      {configIsOn(web?.redirectToHTTPS) ? <Label href={url('/http')}>自动跳转HTTPS</Label> : null}
      {configIsOn(web?.root) ? <Label href={url('/web')}>文档根目录</Label> : null}
      {refIsOn(location.reverseProxyRef, location.reverseProxy) ? <Label href={url('/reverseProxy')}>源站</Label> : null}

      {web?.uam?.isPrior ? (
        <Label href={url('/waf')}>
          <span className={web.uam.isOn ? 'red' : 'disabled'}>5秒盾</span>
        </Label>
      ) : null}
      {web?.cc?.isPrior ? (
        <Label href={url('/waf')}>
          <span className={web.cc.isOn ? 'red' : 'disabled'}>CC防护</span>
        </Label>
      ) : null}

      {configIsOn(web?.cache) ? <Label href={url('/cache')}>CACHE</Label> : null}
      {configIsOn(web?.charset) && web?.charset?.charset ? (
        <Label href={url('/charset')}>{web.charset.charset}</Label>
      ) : null}
      {web?.gzipRef?.isPrior && web.gzipRef.isOn && (web.gzip?.level || 0) > 0 ? (
        <Label href={url('/compression')}>Gzip:{web.gzip?.level}</Label>
      ) : null}
      {refIsOn(web?.requestHeaderPolicyRef, web?.requestHeaderPolicy) && hasRequestHeaders ? (
        <Label href={url('/headers')}>请求Header</Label>
      ) : null}
      {refIsOn(web?.responseHeaderPolicyRef, web?.responseHeaderPolicy) && hasResponseHeaders ? (
        <Label href={url('/headers')}>响应Header</Label>
      ) : null}
      {refIsOn(web?.websocketRef, web?.websocket) ? <Label href={url('/websocket')}>Websocket</Label> : null}
      {web?.requestScripts?.initGroup?.isPrior || web?.requestScripts?.requestGroup?.isPrior ? (
        <Label href={url('/requestScripts')}>请求脚本</Label>
      ) : null}

      {web?.remoteAddr?.isPrior ? (
        <Label href={url('/remoteAddr')}>
          <span className={web.remoteAddr.isOn ? undefined : 'disabled'}>访客IP地址</span>
        </Label>
      ) : null}
      {web?.requestLimit?.isPrior ? (
        <Label href={url('/requestLimit')}>
          <span className={web.requestLimit.isOn ? undefined : 'disabled'}>请求限制</span>
        </Label>
      ) : null}

      {(web?.pages || []).map((page) => (
        <div key={page.id}>
          <Label href={url('/pages')}>PAGE [状态码{(page.status || [])[0]}] -&gt; {page.url}</Label>
        </div>
      ))}
      {configIsOn(web?.shutdown) ? <Label href={url('/pages')} tone="red">临时关闭</Label> : null}

      {(web?.rewriteRules || []).map((rule, index) => (
        <div key={index}>
          <Label href={url('/rewrite')}>REWRITE {rule.pattern} -&gt; {rule.replace}</Label>
        </div>
      ))}
    </div>
  )
}
