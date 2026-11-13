import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { StatusLabel } from '../../components/StatusLabel'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import {
  Comment,
  GroupConfigWarning,
  PopupPage,
  ServerSettingsShell,
  SubMenu,
  buildSettingsURL,
  useSearchInt,
  useSearchString,
} from './common'
import type { ServerFamily, TimeDuration } from './common'

interface ReverseProxyRef {
  isPrior: boolean
  isOn: boolean
  reverseProxyId: number
}

interface OriginSummary {
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

interface ReverseProxyConfig {
  id: number
  isOn: boolean
  requestHostType: number
  requestHost: string
  requestHostExcludingPort: boolean
  requestURI: string
  stripPrefix: string
  autoFlush: boolean
  addHeaders: string[]
  connTimeout: TimeDuration
  readTimeout: TimeDuration
  idleTimeout: TimeDuration
  maxConns: number
  maxIdleConns: number
  followRedirects: boolean
  retry50X: boolean
  retry40X: boolean
  proxyProtocol?: { isOn: boolean; version: number } | null
}

interface ReverseProxyIndexData {
  hasGroupConfig: boolean
  groupSettingURL: string
  reverseProxyRef: ReverseProxyRef
  reverseProxyConfig: ReverseProxyConfig
  serverType: string
  primaryOrigins: OriginSummary[]
  backupOrigins: OriginSummary[]
}

interface SchedulingConfig {
  code: string
  options?: { key?: string; type?: string; param?: string }
  name?: string
  description?: string
}

interface SchedulingData {
  reverseProxyId: number
  scheduling: SchedulingConfig
}

interface SchedulingPopupData {
  dataType: string
  serverId: number
  reverseProxyId: number
  scheduling: SchedulingConfig
  schedulingTypes: { code: string; name: string; description: string }[]
}

function familyOf(serverType: string): ServerFamily {
  if (serverType === 'tcpProxy') {
    return 'tcp'
  }
  if (serverType === 'udpProxy') {
    return 'udp'
  }
  return 'http'
}

function makeQuery(serverId: number, path: string) {
  return buildSettingsURL(path, { serverId })
}

export function ReverseProxyPage() {
  const serverId = useSearchInt('serverId')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  const query = useQuery({
    queryKey: ['server-settings-reverse-proxy', serverId],
    queryFn: () => apiGet<ReverseProxyIndexData>('/servers/server/settings/reverseProxy', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const family = familyOf(data.serverType)

  async function action(path: string, payload: Record<string, unknown>, message: string) {
    try {
      await apiPost(path, payload)
      toast(message)
      await queryClient.invalidateQueries({ queryKey: ['server-settings-reverse-proxy', serverId] })
    } catch (event) {
      toast(event instanceof Error ? event.message : '操作失败', 'error')
    }
  }

  function renderOriginTable(origins: OriginSummary[], originType: 'primary' | 'backup') {
    if (origins.length === 0) {
      return <p className="comment">暂时还没有{originType === 'primary' ? '主要' : '备用'}源站。</p>
    }
    const hasMatchedDomains = origins.some((origin) => (origin.domains || []).length > 0)
    return (
      <table className="ui table selectable">
        <thead>
          <tr>
            <th>源站地址</th>
            <th className="width5">权重</th>
            <th className="width6">状态</th>
            <th className="three op">操作</th>
          </tr>
        </thead>
        <tbody>
          {origins.map((origin) => (
            <tr key={origin.id}>
              <td className={origin.isOn ? '' : 'disabled'}>
                <a
                  href=""
                  className={origin.isOn ? '' : 'disabled'}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(
                      buildSettingsURL('/origins/updatePopup', {
                        serverId,
                        reverseProxyId: data.reverseProxyConfig.id,
                        originId: origin.id,
                        originType,
                      }),
                    )
                  }}
                >
                  {origin.addr}
                </a>
                <div style={{ marginTop: '0.3em' }}>
                  {origin.isOSS ? <span className="ui label tiny basic">对象存储</span> : null}
                  {origin.name ? <span className="ui label tiny basic">{origin.name}</span> : null}
                  {origin.hasCert ? <span className="ui label tiny basic">证书</span> : null}
                  {origin.host ? <span className="ui label tiny basic">主机名: {origin.host}</span> : null}
                  {origin.followPort ? <span className="ui label tiny basic">端口跟随</span> : null}
                  {origin.http2Enabled && origin.addr.startsWith('https://') ? (
                    <span className="ui label tiny basic">HTTP/2</span>
                  ) : null}
                  {origin.domains && origin.domains.length > 0
                    ? origin.domains.map((domain) => (
                        <span key={domain} className="ui label tiny basic">
                          匹配: {domain}
                        </span>
                      ))
                    : hasMatchedDomains
                      ? <span className="ui label tiny basic">匹配: 所有域名</span>
                      : null}
                </div>
              </td>
              <td className={origin.isOn ? '' : 'disabled'}>{origin.weight}</td>
              <td>
                <StatusLabel isOn={origin.isOn} />
              </td>
              <td>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(
                      buildSettingsURL('/origins/updatePopup', {
                        serverId,
                        reverseProxyId: data.reverseProxyConfig.id,
                        originId: origin.id,
                        originType,
                      }),
                    )
                  }}
                >
                  修改
                </a>{' '}
                &nbsp;
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    void confirm({
                      message: `确定要${origin.isOn ? '停用' : '启用'}此源站（${origin.addr}）吗？`,
                    }).then((ok) => {
                      if (ok) {
                        void action(
                          '/servers/server/settings/origins/updateIsOn',
                          { serverId, reverseProxyId: data.reverseProxyConfig.id, originId: origin.id, isOn: origin.isOn ? 0 : 1 },
                          origin.isOn ? '停用成功' : '启用成功',
                        )
                      }
                    })
                  }}
                >
                  {origin.isOn ? '停用' : <span className="red">启用</span>}
                </a>{' '}
                &nbsp;
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    void confirm({ message: `确定要删除此源站（${origin.addr}）吗？`, danger: true, confirmText: '删除' }).then(
                      (ok) => {
                        if (ok) {
                          void action(
                            '/servers/server/settings/origins/delete',
                            {
                              serverId,
                              reverseProxyId: data.reverseProxyConfig.id,
                              originId: origin.id,
                              originType,
                            },
                            '删除成功',
                          )
                        }
                      },
                    )
                  }}
                >
                  删除
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <ServerSettingsShell serverId={serverId} family={family} activePath="/reverseProxy">
      <SubMenu
        items={[
          { name: '源站列表', active: true, href: `${makeQuery(serverId, '/reverseProxy')}` },
          { name: '调度算法', href: `${makeQuery(serverId, '/reverseProxy/scheduling')}` },
          { name: '更多设置', href: `${makeQuery(serverId, '/reverseProxy/setting')}` },
        ]}
      />
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      {!data.reverseProxyRef.isOn ? (
        <div className="ui message warning" style={{ marginTop: '1em' }}>
          当前源站没有启用，可以通过点击{' '}
          <a href={`${makeQuery(serverId, '/reverseProxy/setting')}`}>[更多设置]</a> 开启 。
        </div>
      ) : null}
      <h3>
        主要源站{' '}
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            navigate(
              buildSettingsURL('/origins/addPopup', {
                serverId,
                reverseProxyId: data.reverseProxyConfig.id,
                originType: 'primary',
              }),
            )
          }}
        >
          [添加主要源站]
        </a>
      </h3>
      {renderOriginTable(data.primaryOrigins || [], 'primary')}
      <h3>
        备用源站{' '}
        <a
          href=""
          onClick={(event) => {
            event.preventDefault()
            navigate(
              buildSettingsURL('/origins/addPopup', {
                serverId,
                reverseProxyId: data.reverseProxyConfig.id,
                originType: 'backup',
              }),
            )
          }}
        >
          [添加备用源站]
        </a>
      </h3>
      {renderOriginTable(data.backupOrigins || [], 'backup')}
    </ServerSettingsShell>
  )
}

export function ReverseProxySchedulingPage() {
  const serverId = useSearchInt('serverId')
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(false)

  const query = useQuery({
    queryKey: ['server-settings-reverse-proxy-scheduling', serverId],
    queryFn: () => apiGet<SchedulingData>('/servers/server/settings/reverseProxy/scheduling', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data

  return (
    <ServerSettingsShell serverId={serverId} activePath="/reverseProxy">
      <SubMenu
        items={[
          { name: '源站列表', href: `${makeQuery(serverId, '/reverseProxy')}` },
          { name: '调度算法', active: true, href: `${makeQuery(serverId, '/reverseProxy/scheduling')}` },
          { name: '更多设置', href: `${makeQuery(serverId, '/reverseProxy/setting')}` },
        ]}
      />
      <div className="margin" />
      <table className="ui table selectable definition">
        <tbody>
          <FormRow title="当前正在使用的算法">
            {data.scheduling.name || data.scheduling.code} &nbsp;{' '}
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setEditing(true)
              }}
            >
              <span>[修改]</span>
            </a>
            <Comment>{data.scheduling.description}</Comment>
          </FormRow>
        </tbody>
      </table>
      {editing ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: '40em' }}>
            <div className="header">修改调度算法</div>
            <div className="content">
              <SchedulingForm
                serverId={serverId}
                reverseProxyId={data.reverseProxyId}
                onSaved={() => {
                  setEditing(false)
                  toast('保存成功')
                  void queryClient.invalidateQueries({ queryKey: ['server-settings-reverse-proxy-scheduling', serverId] })
                  void queryClient.invalidateQueries({ queryKey: ['server-settings-reverse-proxy', serverId] })
                }}
              />
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => setEditing(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ServerSettingsShell>
  )
}

function SchedulingForm({
  serverId,
  reverseProxyId,
  onSaved,
}: {
  serverId: number
  reverseProxyId: number
  onSaved: () => void
}) {
  const query = useQuery({
    queryKey: ['server-settings-reverse-proxy-scheduling-popup', serverId, reverseProxyId],
    queryFn: () =>
      apiGet<SchedulingPopupData>('/servers/server/settings/reverseProxy/updateSchedulingPopup', {
        serverId,
        reverseProxyId,
      }),
  })
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [hashKey, setHashKey] = useState<string | null>(null)
  const [stickyType, setStickyType] = useState<string | null>(null)
  const [stickyParam, setStickyParam] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const type = selectedType ?? data.scheduling.code
  const currentHashKey = hashKey ?? (data.scheduling.code === 'hash' ? data.scheduling.options?.key || '${remoteAddr}' : '${remoteAddr}')
  const currentStickyType = stickyType ?? data.scheduling.options?.type ?? 'cookie'
  const currentStickyParam = stickyParam ?? data.scheduling.options?.param ?? 'Origin'
  const description = data.schedulingTypes.find((item) => item.code === type)?.description

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/reverseProxy/updateSchedulingPopup', {
        serverId,
        reverseProxyId,
        type,
        hashKey: currentHashKey,
        stickyType: currentStickyType,
        stickyParam: currentStickyParam,
      })
      onSaved()
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="ui form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <FormTable>
        <tbody>
          <FormRow title="选择调度算法">
            <Select value={type} onChange={(event) => setSelectedType(event.target.value)}>
              {data.schedulingTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Comment>{description}</Comment>
          </FormRow>
          {type === 'hash' ? (
            <>
              <FormRow title="Key">
                <TextInput type="text" maxLength={500} value={currentHashKey} onChange={(event) => setHashKey(event.target.value)} />
                <Comment>用来计算Hash的字符串，其中可以使用变量。</Comment>
              </FormRow>
              <FormRow title="常用变量">
                <Select
                  style={{ width: '12em' }}
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      setHashKey(event.target.value)
                    }
                  }}
                >
                  <option value=""></option>
                  <option value="${remoteAddr}">客户端IP</option>
                  <option value="${host}${requestURI}">请求URL</option>
                </Select>
              </FormRow>
            </>
          ) : null}
          {type === 'sticky' ? (
            <>
              <FormRow title="参数类型">
                <Select style={{ width: '12em' }} value={currentStickyType} onChange={(event) => setStickyType(event.target.value)}>
                  <option value="cookie">Cookie</option>
                  <option value="header">HTTP Header</option>
                  <option value="argument">URL参数</option>
                </Select>
              </FormRow>
              <FormRow title="参数名">
                <TextInput
                  type="text"
                  maxLength={50}
                  value={currentStickyParam}
                  onChange={(event) => setStickyParam(event.target.value)}
                />
                <Comment>记录或指定源站的参数名，只能是英文字母和数字的组合，不允许有下划线。</Comment>
              </FormRow>
            </>
          ) : null}
        </tbody>
      </FormTable>
      {error ? <div className="ui negative message">{error}</div> : null}
      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function ReverseProxySchedulingPopupRoute() {
  const serverId = useSearchInt('serverId')
  const reverseProxyId = useSearchInt('reverseProxyId')
  const navigate = useNavigate()
  const backTo = buildSettingsURL('/reverseProxy/scheduling', { serverId })
  return (
    <PopupPage title="修改调度算法" backTo={backTo}>
      <SchedulingForm
        serverId={serverId}
        reverseProxyId={reverseProxyId}
        onSaved={() => {
          if (serverId > 0) {
            navigate(backTo)
          }
        }}
      />
    </PopupPage>
  )
}

interface ReverseProxySettingData {
  reverseProxyRef: ReverseProxyRef
  reverseProxyConfig: ReverseProxyConfig
}

const FORWARD_HEADERS = ['X-Real-IP', 'X-Forwarded-For', 'X-Forwarded-By', 'X-Forwarded-Host', 'X-Forwarded-Proto']

export function ReverseProxySettingPage() {
  const serverId = useSearchInt('serverId')
  const family = useSearchString('family', 'http') as ServerFamily
  const toast = useToast()
  const [config, setConfig] = useState<ReverseProxyConfig | null>(null)
  const [ref, setRef] = useState<ReverseProxyRef | null>(null)
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-reverse-proxy-setting', serverId],
    queryFn: () => apiGet<ReverseProxySettingData>('/servers/server/settings/reverseProxy/setting', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const currentRef = ref ?? data.reverseProxyRef
  const raw = config ?? data.reverseProxyConfig
  const current: ReverseProxyConfig = {
    ...raw,
    addHeaders: raw.addHeaders || [],
    connTimeout: raw.connTimeout || { count: 0, unit: 'second' },
    readTimeout: raw.readTimeout || { count: 0, unit: 'second' },
    idleTimeout: raw.idleTimeout || { count: 0, unit: 'second' },
    proxyProtocol: raw.proxyProtocol || { isOn: false, version: 1 },
  }

  function update<K extends keyof ReverseProxyConfig>(key: K, value: ReverseProxyConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  function updateTimeout(key: 'connTimeout' | 'readTimeout' | 'idleTimeout', count: number) {
    update(key, { ...current[key], count })
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/reverseProxy/setting', {
        serverId,
        reverseProxyRefJSON: JSON.stringify(currentRef),
        reverseProxyJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} family={family} activePath="/reverseProxy">
      <SubMenu
        items={[
          { name: '源站列表', href: `${makeQuery(serverId, '/reverseProxy')}` },
          { name: '调度算法', href: `${makeQuery(serverId, '/reverseProxy/scheduling')}` },
          { name: '更多设置', active: true, href: `${makeQuery(serverId, '/reverseProxy/setting')}` },
        ]}
      />
      <div className="margin" />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用源站">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={currentRef.isOn}
                  onChange={(event) => setRef({ ...currentRef, isOn: event.target.checked })}
                />
                <label></label>
              </div>
              <Comment>选中后，所有源站设置才会生效。</Comment>
            </FormRow>
            {family === 'http' || family === 'unix' ? (
              <>
                <FormRow title="回源主机名（Host）">
                  <label style={{ marginRight: '1em' }}>
                    <input
                      type="radio"
                      checked={current.requestHostType === 0}
                      onChange={() => update('requestHostType', 0)}
                    />{' '}
                    跟随CDN域名
                  </label>
                  <label style={{ marginRight: '1em' }}>
                    <input type="radio" checked={current.requestHostType === 1} onChange={() => update('requestHostType', 1)} />{' '}
                    跟随源站
                  </label>
                  <label>
                    <input type="radio" checked={current.requestHostType === 2} onChange={() => update('requestHostType', 2)} /> 自定义
                  </label>
                  {current.requestHostType === 2 ? (
                    <div style={{ marginTop: '0.8em' }}>
                      <TextInput
                        type="text"
                        placeholder="比如example.com"
                        value={current.requestHost}
                        onChange={(event) => update('requestHost', event.target.value)}
                      />
                    </div>
                  ) : null}
                  <Comment>
                    请求源站时的主机名（Host），用于修改源站接收到的域名
                    {current.requestHostType === 0 ? '，"跟随CDN域名"是指源站接收到的域名和当前CDN访问域名保持一致' : null}
                    {current.requestHostType === 1 ? '，"跟随源站"是指源站接收到的域名仍然是填写的源站地址中的信息' : null}
                    {current.requestHostType === 2 ? '，自定义Host内容中支持请求变量' : null}。
                  </Comment>
                </FormRow>
                <FormRow title="回源主机名移除端口">
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={current.requestHostExcludingPort}
                      onChange={(event) => update('requestHostExcludingPort', event.target.checked)}
                    />
                    <label></label>
                  </div>
                  <Comment>选中后表示移除回源主机名中的端口部分。</Comment>
                </FormRow>
              </>
            ) : null}
            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setAdvancedVisible(!advancedVisible)
                  }}
                >
                  [{advancedVisible ? '收起更多选项' : '更多选项'}]
                </a>
              </td>
            </tr>
          </tbody>
          {advancedVisible ? (
            <tbody>
              {family === 'http' || family === 'unix' ? (
                <>
                  <FormRow title="回源跟随">
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={current.followRedirects}
                        onChange={(event) => update('followRedirects', event.target.checked)}
                      />
                      <label></label>
                    </div>
                    <Comment>选中后，自动读取源站跳转后的网页内容。</Comment>
                  </FormRow>
                  <FormRow title="自动添加报头">
                    <div>
                      {FORWARD_HEADERS.map((header) => (
                        <div style={{ width: '14em', float: 'left', marginBottom: '1em' }} key={header}>
                          <label>
                            <input
                              type="checkbox"
                              checked={current.addHeaders.includes(header)}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...current.addHeaders.filter((item) => item !== header), header]
                                  : current.addHeaders.filter((item) => item !== header)
                                update('addHeaders', next)
                              }}
                            />{' '}
                            {header}
                          </label>
                        </div>
                      ))}
                      <div style={{ clear: 'both' }} />
                    </div>
                    <Comment>选中后，会自动向源站请求添加这些报头，以便于源站获取客户端信息。</Comment>
                  </FormRow>
                  <FormRow title="请求URI（RequestURI）">
                    <TextInput
                      type="text"
                      placeholder="${requestURI}"
                      value={current.requestURI}
                      onChange={(event) => update('requestURI', event.target.value)}
                    />
                    <Comment>${'{requestURI}'}为完整的请求URI，可以添加自定义参数。</Comment>
                  </FormRow>
                  <FormRow title="去除URL前缀（StripPrefix）">
                    <TextInput
                      type="text"
                      placeholder="/PREFIX"
                      value={current.stripPrefix}
                      onChange={(event) => update('stripPrefix', event.target.value)}
                    />
                    <Comment>可以把请求的路径部分前缀去除后再查找文件。</Comment>
                  </FormRow>
                  <FormRow title="自动刷新缓存区（AutoFlush）">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={current.autoFlush} onChange={(event) => update('autoFlush', event.target.checked)} />
                      <label></label>
                    </div>
                    <Comment>开启后将自动刷新缓冲区数据到客户端，在类似于SSE等场景下很有用。</Comment>
                  </FormRow>
                  <FormRow title="自动重试50X">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={current.retry50X} onChange={(event) => update('retry50X', event.target.checked)} />
                      <label></label>
                    </div>
                    <Comment>选中后，表示当源站返回状态码为50X时，自动重试其他源站。</Comment>
                  </FormRow>
                  <FormRow title="自动重试40X">
                    <div className="ui checkbox">
                      <input type="checkbox" checked={current.retry40X} onChange={(event) => update('retry40X', event.target.checked)} />
                      <label></label>
                    </div>
                    <Comment>选中后，表示当源站返回状态码为40X（403或404）时，自动重试其他源站。</Comment>
                  </FormRow>
                </>
              ) : null}
              {family !== 'unix' ? (
                <FormRow title="PROXY Protocol">
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={current.proxyProtocol?.isOn || false}
                      onChange={(event) =>
                        update('proxyProtocol', { ...(current.proxyProtocol || { version: 1 }), isOn: event.target.checked })
                      }
                    />
                    <label></label>
                  </div>
                  <Comment>选中后表示启用PROXY Protocol，每次连接源站时都会在头部写入客户端地址信息。</Comment>
                </FormRow>
              ) : null}
              {family !== 'unix' && current.proxyProtocol?.isOn ? (
                <FormRow title="PROXY Protocol版本">
                  <Select
                    value={String(current.proxyProtocol?.version || 1)}
                    onChange={(event) =>
                      update('proxyProtocol', { ...(current.proxyProtocol || { isOn: true }), version: Number(event.target.value) })
                    }
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </Select>
                </FormRow>
              ) : null}
              <FormRow title="源站连接失败超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      size={6}
                      value={String(current.connTimeout.count)}
                      onChange={(event) => updateTimeout('connTimeout', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <Comment>连接源站失败的最大超时时间，0表示不限制。</Comment>
              </FormRow>
              <FormRow title="源站读取超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      size={6}
                      value={String(current.readTimeout.count)}
                      onChange={(event) => updateTimeout('readTimeout', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <Comment>读取内容时的最大超时时间，0表示不限制。</Comment>
              </FormRow>
              <FormRow title="源站最大并发连接数">
                <TextInput
                  type="text"
                  size={6}
                  maxLength={10}
                  value={String(current.maxConns)}
                  onChange={(event) => update('maxConns', Number(event.target.value) || 0)}
                />
                <Comment>源站可以接受到的最大并发连接数，0表示使用系统默认。</Comment>
              </FormRow>
              <FormRow title="源站最大空闲连接数">
                <TextInput
                  type="text"
                  size={6}
                  maxLength={10}
                  value={String(current.maxIdleConns)}
                  onChange={(event) => update('maxIdleConns', Number(event.target.value) || 0)}
                />
                <Comment>当没有请求时，源站保持等待的最大空闲连接数量，0表示使用系统默认。</Comment>
              </FormRow>
              <FormRow title="源站最大空闲超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      size={6}
                      value={String(current.idleTimeout.count)}
                      onChange={(event) => updateTimeout('idleTimeout', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <Comment>源站保持等待的空闲超时时间，0表示使用默认时间。</Comment>
              </FormRow>
            </tbody>
          ) : null}
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

export function ReverseProxyLink({ serverId }: { serverId: number }) {
  return <Link to={buildSettingsURL('/reverseProxy', { serverId })}>返回源站</Link>
}
