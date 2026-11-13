import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, getCsrfToken } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, apiPostMulti, parseId } from '../shared'

interface GlobalHttpAll {
  matchDomainStrictly: boolean
  domainMismatchAction: { code: string; options: Record<string, unknown> } | null
  allowMismatchDomains: string[] | null
  allowNodeIP: boolean
  defaultDomain: string
  nodeIPShowPage: boolean
  nodeIPPageHTML: string
  domainAuditingIsOn: boolean
  domainAuditingPrompt: string
  serverName: string
  supportsLowVersionHTTP: boolean
  matchCertFromAllServers: boolean
  forceLnRequest: boolean
  lnRequestSchedulingMethod: string
  enableServerAddrVariable: boolean
  requestOriginsWithEncodings: boolean
  xffMaxAddresses: number
}

interface GlobalHttpAccessLog {
  isOn: boolean
  enableRequestHeaders: boolean
  enableResponseHeaders: boolean
  commonRequestHeadersOnly: boolean
  enableCookies: boolean
  enableServerNotFound: boolean
}

interface GlobalLog {
  recordServerError: boolean
}

interface GlobalPerformance {
  autoReadTimeout: boolean
  autoWriteTimeout: boolean
  debug: boolean
}

interface GlobalTcpAll {
  portRangeMin: number
  portRangeMax: number
  denyPorts: number[] | null
}

interface GlobalServerConfig {
  httpAll: GlobalHttpAll
  httpAccessLog: GlobalHttpAccessLog
  log: GlobalLog
  performance: GlobalPerformance
  tcpAll: GlobalTcpAll
}

interface ConfigData {
  config: GlobalServerConfig
  httpAllDomainMismatchActionCode: string
  httpAllDomainMismatchActionContentHTML: string
  httpAllDomainMismatchActionStatusCode: string
  httpAllDomainMismatchActionRedirectURL: string
}

const tabs = [
  { code: 'name-bind', name: '域名绑定' },
  { code: 'access-log', name: '访问日志' },
  { code: 'server-log', name: '运行日志' },
  { code: 'performance', name: '性能' },
  { code: 'ln', name: 'Ln节点' },
  { code: 'tcp-udp', name: 'TCP/UDP相关' },
  { code: 'others', name: '其他' },
]

export function ClusterSettingsGlobalServerConfigPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-global-server-config', clusterId],
    queryFn: () => apiGet<ConfigData>('/clusters/cluster/settings/global-server-config', { clusterId }),
    enabled: clusterId > 0,
  })
  const [config, setConfig] = useState<GlobalServerConfig | null>(null)
  const [mismatchCode, setMismatchCode] = useState('page')
  const [mismatchStatusCode, setMismatchStatusCode] = useState('404')
  const [mismatchHTML, setMismatchHTML] = useState('')
  const [mismatchURL, setMismatchURL] = useState('')
  const [allowDomains, setAllowDomains] = useState('')
  const [denyPorts, setDenyPorts] = useState('')
  const [currentTab, setCurrentTab] = useState(tabs[0].code)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setConfig(query.data.config)
      setMismatchCode(query.data.httpAllDomainMismatchActionCode)
      setMismatchStatusCode(query.data.httpAllDomainMismatchActionStatusCode)
      setMismatchHTML(query.data.httpAllDomainMismatchActionContentHTML)
      setMismatchURL(query.data.httpAllDomainMismatchActionRedirectURL)
      setAllowDomains((query.data.config.httpAll.allowMismatchDomains || []).join('\n'))
      setDenyPorts((query.data.config.tcpAll.denyPorts || []).join(','))
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !config) {
    return <div className="ui negative message">加载失败</div>
  }

  const httpAll = config.httpAll
  const updateHttpAll = (patch: Partial<GlobalHttpAll>) => setConfig({ ...config, httpAll: { ...httpAll, ...patch } })

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings/global-server-config">
      <div className="ui menu text blue second-menu">
        {tabs.map((tab) => (
          <a
            key={tab.code}
            className={`item${currentTab === tab.code ? ' active' : ''}`}
            href=""
            onClick={(event) => {
              event.preventDefault()
              setCurrentTab(tab.code)
            }}
          >
            {tab.name}
          </a>
        ))}
      </div>

      <form
        className="ui form"
        onSubmit={async (event) => {
          event.preventDefault()
          setSubmitting(true)
          try {
            const csrfToken = await getCsrfToken()
            await apiPostMulti('/clusters/cluster/settings/global-server-config', {
              clusterId: [clusterId],
              httpAllMatchDomainStrictly: [httpAll.matchDomainStrictly ? '1' : ''],
              httpAllDomainMismatchActionCode: [mismatchCode],
              httpAllDomainMismatchActionContentHTML: [mismatchHTML],
              httpAllDomainMismatchActionStatusCode: [mismatchStatusCode],
              httpAllDomainMismatchActionRedirectURL: [mismatchURL],
              httpAllAllowMismatchDomainsJSON: [
                JSON.stringify(
                  allowDomains
                    .split('\n')
                    .map((domain) => domain.trim())
                    .filter((domain) => domain.length > 0),
                ),
              ],
              httpAllAllowNodeIP: [httpAll.allowNodeIP ? '1' : ''],
              httpAllDefaultDomain: [httpAll.defaultDomain],
              httpAllNodeIPPageHTML: [httpAll.nodeIPPageHTML],
              httpAllNodeIPShowPage: [httpAll.nodeIPShowPage ? '1' : ''],
              httpAllEnableServerAddrVariable: [httpAll.enableServerAddrVariable ? '1' : ''],
              httpAllRequestOriginsWithEncodings: [httpAll.requestOriginsWithEncodings ? '1' : ''],
              httpAllXFFMaxAddresses: [String(httpAll.xffMaxAddresses)],
              httpAllDomainAuditingIsOn: [httpAll.domainAuditingIsOn ? '1' : ''],
              httpAllDomainAuditingPrompt: [httpAll.domainAuditingPrompt],
              httpAllServerName: [httpAll.serverName],
              httpAllSupportsLowVersionHTTP: [httpAll.supportsLowVersionHTTP ? '1' : ''],
              httpAllMatchCertFromAllServers: [httpAll.matchCertFromAllServers ? '1' : ''],
              httpAllForceLnRequest: [httpAll.forceLnRequest ? '1' : ''],
              httpAllLnRequestSchedulingMethod: [httpAll.lnRequestSchedulingMethod],
              httpAccessLogIsOn: [config.httpAccessLog.isOn ? '1' : ''],
              httpAccessLogEnableRequestHeaders: [config.httpAccessLog.enableRequestHeaders ? '1' : ''],
              httpAccessLogEnableResponseHeaders: [config.httpAccessLog.enableResponseHeaders ? '1' : ''],
              httpAccessLogCommonRequestHeadersOnly: [config.httpAccessLog.commonRequestHeadersOnly ? '1' : ''],
              httpAccessLogEnableCookies: [config.httpAccessLog.enableCookies ? '1' : ''],
              httpAccessLogEnableServerNotFound: [config.httpAccessLog.enableServerNotFound ? '1' : ''],
              logRecordServerError: [config.log.recordServerError ? '1' : ''],
              performanceAutoReadTimeout: [config.performance.autoReadTimeout ? '1' : ''],
              performanceAutoWriteTimeout: [config.performance.autoWriteTimeout ? '1' : ''],
              performanceDebug: [config.performance.debug ? '1' : ''],
              tcpAllPortRangeMin: [String(config.tcpAll.portRangeMin)],
              tcpAllPortRangeMax: [String(config.tcpAll.portRangeMax)],
              tcpAllDenyPorts: denyPorts
                .split(',')
                .map((port) => port.trim())
                .filter((port) => port.length > 0),
              csrfToken: [csrfToken],
            })
            toast('保存成功')
          } catch (error) {
            toast(error instanceof Error ? error.message : '保存失败', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {currentTab === 'name-bind' ? (
          <div>
            <h4>域名绑定</h4>
            <FormTable>
              <FormRow title="禁止未绑定域名访问">
                <Checkbox label="" checked={httpAll.matchDomainStrictly} onChange={(value) => updateHttpAll({ matchDomainStrictly: value })} />
                <p className="comment">选中后，表示禁止未在网站绑定的域名和IP访问。</p>
              </FormRow>
              {httpAll.matchDomainStrictly ? (
                <>
                  <FormRow title="处理未绑定域名方式">
                    <label>
                      <input type="radio" checked={mismatchCode === 'page'} onChange={() => setMismatchCode('page')} /> 显示提示页面
                    </label>{' '}
                    &nbsp;
                    <label>
                      <input type="radio" checked={mismatchCode === 'redirect'} onChange={() => setMismatchCode('redirect')} /> 跳转到网址
                    </label>{' '}
                    &nbsp;
                    <label>
                      <input type="radio" checked={mismatchCode === 'close'} onChange={() => setMismatchCode('close')} /> 关闭连接
                    </label>
                  </FormRow>
                  {mismatchCode === 'page' ? (
                    <>
                      <FormRow title="提示页面状态码">
                        <TextInput
                          type="text"
                          style={{ width: '4em' }}
                          maxLength={3}
                          value={mismatchStatusCode}
                          onChange={(event) => setMismatchStatusCode(event.target.value)}
                        />
                        <p className="comment">访问未绑定域名时的提示页面状态码，默认404。</p>
                      </FormRow>
                      <FormRow title="提示页面内容">
                        <textarea rows={5} value={mismatchHTML} onChange={(event) => setMismatchHTML(event.target.value)} />
                        <p className="comment">访问未绑定的域名时提示页面内容，可以使用HTML。</p>
                      </FormRow>
                    </>
                  ) : null}
                  {mismatchCode === 'redirect' ? (
                    <FormRow title="跳转目标网址URL *">
                      <TextInput
                        type="text"
                        placeholder="https://..."
                        value={mismatchURL}
                        onChange={(event) => setMismatchURL(event.target.value)}
                      />
                      <p className="comment">必须以http://或者https://开头，支持使用变量。</p>
                    </FormRow>
                  ) : null}
                  <FormRow title="允许例外的域名">
                    <textarea rows={3} placeholder="每行一个域名" value={allowDomains} onChange={(event) => setAllowDomains(event.target.value)} />
                    <p className="comment">允许这些域名不经过绑定就可以直接访问网站。</p>
                  </FormRow>
                  <FormRow title="默认域名">
                    <TextInput type="text" value={httpAll.defaultDomain} onChange={(event) => updateHttpAll({ defaultDomain: event.target.value })} />
                  </FormRow>
                  <FormRow title="允许使用节点IP访问">
                    <Checkbox label="" checked={httpAll.allowNodeIP} onChange={(value) => updateHttpAll({ allowNodeIP: value })} />
                  </FormRow>
                  {httpAll.allowNodeIP ? (
                    <>
                      <FormRow title="访问节点IP显示自定义内容">
                        <Checkbox label="" checked={httpAll.nodeIPShowPage} onChange={(value) => updateHttpAll({ nodeIPShowPage: value })} />
                      </FormRow>
                      {httpAll.nodeIPShowPage ? (
                        <FormRow title="访问节点IP自定义内容">
                          <textarea rows={3} value={httpAll.nodeIPPageHTML} onChange={(event) => updateHttpAll({ nodeIPPageHTML: event.target.value })} />
                        </FormRow>
                      ) : null}
                    </>
                  ) : null}
                  <FormRow title="域名变更时需要审核">
                    <Checkbox label="" checked={httpAll.domainAuditingIsOn} onChange={(value) => updateHttpAll({ domainAuditingIsOn: value })} />
                  </FormRow>
                  {httpAll.domainAuditingIsOn ? (
                    <FormRow title="审核提示">
                      <TextInput
                        type="text"
                        maxLength={200}
                        value={httpAll.domainAuditingPrompt}
                        onChange={(event) => updateHttpAll({ domainAuditingPrompt: event.target.value })}
                      />
                    </FormRow>
                  ) : null}
                </>
              ) : null}
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'access-log' ? (
          <div>
            <h4>访问日志</h4>
            <FormTable>
              <FormRow title="允许记录访问日志">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.isOn}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, isOn: value } })}
                />
              </FormRow>
              <FormRow title="记录请求报头">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.enableRequestHeaders}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, enableRequestHeaders: value } })}
                />
              </FormRow>
              <FormRow title="只记录通用请求报头">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.commonRequestHeadersOnly}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, commonRequestHeadersOnly: value } })}
                />
              </FormRow>
              <FormRow title="记录响应报头">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.enableResponseHeaders}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, enableResponseHeaders: value } })}
                />
              </FormRow>
              <FormRow title="记录Cookie">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.enableCookies}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, enableCookies: value } })}
                />
              </FormRow>
              <FormRow title="记录找不到网站日志">
                <Checkbox
                  label=""
                  checked={config.httpAccessLog.enableServerNotFound}
                  onChange={(value) => setConfig({ ...config, httpAccessLog: { ...config.httpAccessLog, enableServerNotFound: value } })}
                />
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'server-log' ? (
          <div>
            <h4>运行日志</h4>
            <FormTable>
              <FormRow title="记录网站错误">
                <Checkbox
                  label=""
                  checked={config.log.recordServerError}
                  onChange={(value) => setConfig({ ...config, log: { ...config.log, recordServerError: value } })}
                />
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'performance' ? (
          <div>
            <h4>性能</h4>
            <FormTable>
              <FormRow title="自动读数据超时">
                <Checkbox
                  label=""
                  checked={config.performance.autoReadTimeout}
                  onChange={(value) => setConfig({ ...config, performance: { ...config.performance, autoReadTimeout: value } })}
                />
              </FormRow>
              <FormRow title="自动写数据超时">
                <Checkbox
                  label=""
                  checked={config.performance.autoWriteTimeout}
                  onChange={(value) => setConfig({ ...config, performance: { ...config.performance, autoWriteTimeout: value } })}
                />
              </FormRow>
              <FormRow title="调试模式">
                <Checkbox
                  label=""
                  checked={config.performance.debug}
                  onChange={(value) => setConfig({ ...config, performance: { ...config.performance, debug: value } })}
                />
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'ln' ? (
          <div>
            <h4>Ln节点</h4>
            <FormTable>
              <FormRow title="强制Ln请求">
                <Checkbox label="" checked={httpAll.forceLnRequest} onChange={(value) => updateHttpAll({ forceLnRequest: value })} />
              </FormRow>
              <FormRow title="Ln请求负载均衡方法">
                <Select value={httpAll.lnRequestSchedulingMethod} onChange={(event) => updateHttpAll({ lnRequestSchedulingMethod: event.target.value })}>
                  <option value="urlMapping">URL映射</option>
                  <option value="random">随机</option>
                </Select>
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'tcp-udp' ? (
          <div>
            <h4>TCP/UDP相关</h4>
            <FormTable>
              <FormRow title="允许的端口范围">
                <div className="ui fields inline">
                  <div className="ui field">
                    <TextInput
                      type="text"
                      maxLength={5}
                      style={{ width: '6em' }}
                      value={String(config.tcpAll.portRangeMin)}
                      onChange={(event) => setConfig({ ...config, tcpAll: { ...config.tcpAll, portRangeMin: Number(event.target.value) || 0 } })}
                    />
                  </div>
                  <div className="ui field">-</div>
                  <div className="ui field">
                    <TextInput
                      type="text"
                      maxLength={5}
                      style={{ width: '6em' }}
                      value={String(config.tcpAll.portRangeMax)}
                      onChange={(event) => setConfig({ ...config, tcpAll: { ...config.tcpAll, portRangeMax: Number(event.target.value) || 0 } })}
                    />
                  </div>
                </div>
                <p className="comment">用户创建TCP/TLS负载均衡服务时可以随机选择的端口范围。</p>
              </FormRow>
              <FormRow title="排除的端口">
                <TextInput type="text" placeholder="端口" style={{ width: '6em' }} value={denyPorts} onChange={(event) => setDenyPorts(event.target.value)} />
                <p className="comment">多个端口使用英文逗号分隔。</p>
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        {currentTab === 'others' ? (
          <div>
            <h4>其他</h4>
            <FormTable>
              <FormRow title="服务器旗标">
                <TextInput type="text" maxLength={60} value={httpAll.serverName} onChange={(event) => updateHttpAll({ serverName: event.target.value })} />
              </FormRow>
              <FormRow title="支持低版本HTTP">
                <Checkbox
                  label=""
                  checked={httpAll.supportsLowVersionHTTP}
                  onChange={(value) => updateHttpAll({ supportsLowVersionHTTP: value })}
                />
              </FormRow>
              <FormRow title="自动匹配证书">
                <Checkbox label="" checked={httpAll.matchCertFromAllServers} onChange={(value) => updateHttpAll({ matchCertFromAllServers: value })} />
              </FormRow>
              <FormRow title="支持${serverAddr}变量">
                <Checkbox
                  label=""
                  checked={httpAll.enableServerAddrVariable}
                  onChange={(value) => updateHttpAll({ enableServerAddrVariable: value })}
                />
              </FormRow>
              <FormRow title="自动gzip回源">
                <Checkbox
                  label=""
                  checked={httpAll.requestOriginsWithEncodings}
                  onChange={(value) => updateHttpAll({ requestOriginsWithEncodings: value })}
                />
              </FormRow>
              <FormRow title="XFF中最多地址数">
                <TextInput
                  type="text"
                  value={String(httpAll.xffMaxAddresses)}
                  onChange={(event) => updateHttpAll({ xffMaxAddresses: Number(event.target.value) || 0 })}
                />
              </FormRow>
            </FormTable>
          </div>
        ) : null}

        <div className="margin" />
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}
