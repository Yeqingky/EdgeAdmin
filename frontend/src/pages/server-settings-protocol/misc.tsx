import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import {
  Comment,
  GroupConfigWarning,
  NetworkAddressesEditor,
  ServerSettingsShell,
  URLPatternsEditor,
  useSearchInt,
} from './common'
import type { NetworkAddress, ServerFamily, URLPattern } from './common'

interface StatConfig {
  isPrior: boolean
  isOn: boolean
}

interface StatData {
  hasGroupConfig: boolean
  groupSettingURL: string
  webId: number
  statConfig: StatConfig | null
}

export function StatPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [config, setConfig] = useState<StatConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-stat', serverId],
    queryFn: () => apiGet<StatData>('/servers/server/settings/stat', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: StatConfig = config ?? { isPrior: false, isOn: false, ...(data.statConfig || {}) }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost('/servers/server/settings/stat', { webId: data.webId, statJSON: JSON.stringify(current) })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/stat">
      <GroupConfigWarning url={data.hasGroupConfig ? data.groupSettingURL : ''} />
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用统计">
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  checked={current.isOn}
                  onChange={(event) => setConfig({ ...current, isOn: event.target.checked })}
                />
                <label></label>
              </div>
            </FormRow>
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

interface ProtocolData {
  serverType: string
  tcpConfig?: { isOn?: boolean; listen: NetworkAddress[] | null }
  udpConfig?: { isOn?: boolean; listen: NetworkAddress[] | null }
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

function ProtocolPage({ protocol }: { protocol: 'tcp' | 'udp' }) {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const [addresses, setAddresses] = useState<NetworkAddress[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: [`server-settings-${protocol}`, serverId],
    queryFn: () => apiGet<ProtocolData>(`/servers/server/settings/${protocol}`, { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const config = protocol === 'tcp' ? data.tcpConfig : data.udpConfig
  const current = addresses ?? config?.listen ?? []

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      await apiPost(`/servers/server/settings/${protocol}`, {
        serverId,
        serverType: data.serverType,
        addresses: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} family={familyOf(data.serverType)} activePath={`/${protocol}`}>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="绑定端口 *">
              <NetworkAddressesEditor protocol={protocol} addresses={current} onChange={setAddresses} />
            </FormRow>
          </tbody>
        </FormTable>
        {error ? <div className="ui negative message">{error}</div> : null}
        <SubmitButton submitting={submitting} />
      </form>
    </ServerSettingsShell>
  )
}

export function TcpPage() {
  return <ProtocolPage protocol="tcp" />
}

export function UdpPage() {
  return <ProtocolPage protocol="udp" />
}

export function UnixPage() {
  const serverId = useSearchInt('serverId')
  return (
    <ServerSettingsShell serverId={serverId} family="unix" activePath="/unix">
      <p className="ui message">此功能暂未开放,敬请期待.</p>
    </ServerSettingsShell>
  )
}

interface UserAgentFilter {
  keywords: string[]
  action: string
}

interface UserAgentConfig {
  isPrior: boolean
  isOn: boolean
  filters: UserAgentFilter[]
  onlyURLPatterns?: URLPattern[]
  exceptURLPatterns?: URLPattern[]
}

interface UserAgentData {
  serverId: number
  webId: number
  userAgentConfig: UserAgentConfig | null
}

export function UserAgentPage() {
  const serverId = useSearchInt('serverId')
  const toast = useToast()
  const confirm = useConfirm()
  const [config, setConfig] = useState<UserAgentConfig | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)
  const [adding, setAdding] = useState(false)
  const [keywords, setKeywords] = useState('')
  const [action, setAction] = useState('deny')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['server-settings-user-agent', serverId],
    queryFn: () => apiGet<UserAgentData>('/servers/server/settings/userAgent', { serverId }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const current: UserAgentConfig = config ?? {
    isPrior: false,
    isOn: false,
    ...(data.userAgentConfig || {}),
    filters: data.userAgentConfig?.filters || [],
    onlyURLPatterns: data.userAgentConfig?.onlyURLPatterns || [],
    exceptURLPatterns: data.userAgentConfig?.exceptURLPatterns || [],
    ...(config || {}),
  }

  function update<K extends keyof UserAgentConfig>(key: K, value: UserAgentConfig[K]) {
    setConfig({ ...current, [key]: value })
  }

  function addFilter() {
    const list = keywords
      .split(/\n/)
      .map((keyword) => keyword.trim())
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index)
    if (list.length === 0) {
      return
    }
    const filters = [...current.filters]
    if (action === 'allow') {
      const index = filters.map((filter) => filter.action).lastIndexOf('allow')
      if (index < 0) {
        filters.unshift({ keywords: list, action })
      } else {
        filters.splice(index + 1, 0, { keywords: list, action })
      }
    } else {
      filters.push({ keywords: list, action })
    }
    update('filters', filters)
    setKeywords('')
    setAdding(false)
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const csrfToken = await getCsrfToken()
      await apiPost('/servers/server/settings/userAgent', {
        csrfToken,
        webId: data.webId,
        userAgentJSON: JSON.stringify(current),
      })
      toast('保存成功')
    } catch (event) {
      setError(event instanceof Error ? event.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ServerSettingsShell serverId={serverId} activePath="/userAgent">
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormTable>
          <tbody>
            <FormRow title="启用UA名单">
              <div className="ui checkbox">
                <input type="checkbox" checked={current.isOn} onChange={(event) => update('isOn', event.target.checked)} />
                <label></label>
              </div>
              <Comment>选中后表示开启UserAgent名单.</Comment>
            </FormRow>
            {current.isOn ? (
              <FormRow title="UA名单">
                {current.filters.length > 0 ? (
                  <table className="ui table celled">
                    <thead>
                      <tr>
                        <th>UA关键词</th>
                        <th className="two wide">动作</th>
                        <th className="one op">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.filters.map((filter, index) => (
                        <tr key={index}>
                          <td style={{ background: 'white' }}>
                            {filter.keywords.map((keyword, i) => (
                              <span className="ui label basic tiny" key={i}>
                                {keyword.length > 0 ? keyword : <span className="disabled">[空]</span>}
                              </span>
                            ))}
                          </td>
                          <td>
                            {filter.action === 'allow' ? <span className="green">允许</span> : <span className="red">不允许</span>}
                          </td>
                          <td>
                            <a
                              href=""
                              onClick={(event) => {
                                event.preventDefault()
                                void confirm({ message: '确定要删除此名单吗?' }).then((ok) => {
                                  if (ok) {
                                    update(
                                      'filters',
                                      current.filters.filter((_, i) => i !== index),
                                    )
                                  }
                                })
                              }}
                            >
                              删除
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {adding ? (
                  <table className="ui table definition">
                    <tbody>
                      <FormRow title="UA关键词">
                        <textarea
                          value={keywords}
                          onChange={(event) => setKeywords(event.target.value)}
                          style={{ width: '20em' }}
                          placeholder="*浏览器标识*"
                        />
                        <Comment>
                          每行一个关键词;不区分大小写,比如 Chrome;支持 * 通配符;也支持空行关键词,表示空UserAgent.
                        </Comment>
                      </FormRow>
                      <FormRow title="动作">
                        <Select value={action} onChange={(event) => setAction(event.target.value)}>
                          <option value="deny">不允许</option>
                          <option value="allow">允许</option>
                        </Select>
                      </FormRow>
                    </tbody>
                  </table>
                ) : null}
                {adding ? (
                  <div style={{ marginTop: '0.5em' }}>
                    <button className="ui button tiny" type="button" onClick={addFilter}>
                      保存
                    </button>{' '}
                    &nbsp;{' '}
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setAdding(false)
                        setKeywords('')
                      }}
                    >
                      取消
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5em' }}>
                    <button
                      className="ui button tiny"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        setAdding(true)
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </FormRow>
            ) : null}
            {current.isOn ? (
              <tr>
                <td colSpan={2}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      setMoreOptions(!moreOptions)
                    }}
                  >
                    [{moreOptions ? '收起更多选项' : '更多选项'}]
                  </a>
                </td>
              </tr>
            ) : null}
          </tbody>
          {moreOptions && current.isOn ? (
            <tbody>
              <FormRow title="例外URL">
                <URLPatternsEditor patterns={current.exceptURLPatterns || []} onChange={(values) => update('exceptURLPatterns', values)} />
                <Comment>如果填写了例外URL,表示这些URL跳过不做处理.</Comment>
              </FormRow>
              <FormRow title="限制URL">
                <URLPatternsEditor patterns={current.onlyURLPatterns || []} onChange={(values) => update('onlyURLPatterns', values)} />
                <Comment>如果填写了限制URL,表示只对这些URL进行处理;如果不填则表示支持所有的URL.</Comment>
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
