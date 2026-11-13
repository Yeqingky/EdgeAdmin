import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { FormRow, FormTable } from '../../../components/form'
import {
  PageHeader,
  SettingsTabs,
  formatAddress,
  formatUnixDay,
  type NetworkAddress,
  type SSLCertSummary,
} from '../common'
import { ApiNodeForm, type ApiNodeData } from './ApiNodeForm'

interface ApiNodeStatusDetail {
  isActive: boolean
  updatedAt: number
  hostname: string
  cpuUsage: number
  cpuUsageText: string
  cpuPhysicalCount: number
  cpuLogicalCount: number
  memUsage: number
  memUsageText: string
  buildVersion: string
  exePath: string
}

interface ApiNodeDetail {
  id: number
  name: string
  description: string
  isOn: boolean
  listens: NetworkAddress[]
  accessAddrs: NetworkAddress[]
  restIsOn: boolean
  restAccessAddrs: NetworkAddress[]
  hasHTTPS: boolean
  certs: SSLCertSummary[]
  isPrimary: boolean
  statusIsValid: boolean
  status: ApiNodeStatusDetail
}

interface ApiNodeDetailData {
  node: ApiNodeDetail
  newVersion: string
}

function NodeMenu({ nodeId, nodeName, active }: { nodeId: number; nodeName: string; active: string }) {
  return (
    <PageHeader
      items={[
        { name: '节点列表', href: '/settings/api' },
        { name: `"${nodeName}"详情`, href: `/settings/api/node?nodeId=${nodeId}`, active: active === 'index' },
        { name: '运行日志', href: `/settings/api/node/logs?nodeId=${nodeId}`, active: active === 'log' },
        { name: '安装节点', href: `/settings/api/node/install?nodeId=${nodeId}`, active: active === 'install' },
        { name: '修改节点', href: `/settings/api/node/update?nodeId=${nodeId}`, active: active === 'update' },
      ]}
    />
  )
}

export function ApiNodeDetailPage() {
  const [searchParams] = useSearchParams()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const query = useQuery({
    queryKey: ['settings-api-node', nodeId],
    queryFn: () => apiGet<ApiNodeDetailData>('/settings/api/node', { nodeId }),
    enabled: nodeId > 0,
  })

  if (nodeId <= 0) {
    return <div className="ui negative message">缺少节点ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const node = query.data.node

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <NodeMenu nodeId={node.id} nodeName={node.name} active="index" />
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">节点名称</td>
            <td>{node.name}</td>
          </tr>
          <tr>
            <td>状态</td>
            <td>{node.isOn ? <span className="green">已启用</span> : <span className="red">已停用</span>}</td>
          </tr>
          <tr>
            <td>GRPC监听端口</td>
            <td>
              {node.listens.length > 0 ? (
                node.listens.map((address, index) => (
                  <div key={index}>
                    <span className="ui label small basic">
                      {address.protocol}://{address.host.length > 0 ? address.host : '*'}:{address.portRange}
                    </span>
                  </div>
                ))
              ) : (
                <span className="disabled">-</span>
              )}
              <p className="comment">API节点进程监听的网络端口.</p>
            </td>
          </tr>
          {node.hasHTTPS ? (
            <tr>
              <td>HTTPS证书</td>
              <td>
                {node.certs && node.certs.length > 0 ? (
                  node.certs.map((cert) => (
                    <div key={cert.id}>
                      <span className="ui label small basic">
                        {cert.name}
                        {cert.dnsNames && cert.dnsNames.length > 0 ? ` / ${cert.dnsNames.join(',')}` : ''} / 有效至
                        {formatUnixDay(cert.timeEndAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="red">还没有设置证书,可能会导致HTTPS相关服务不可用.</span>
                )}
              </td>
            </tr>
          ) : null}
          <tr>
            <td>GRPC外部访问地址</td>
            <td>
              {node.accessAddrs.length > 0 ? (
                node.accessAddrs.map((address, index) => (
                  <div key={index}>
                    <span className="ui label small basic">{formatAddress(address)}</span>
                  </div>
                ))
              ) : (
                <span className="disabled">-</span>
              )}
              <p className="comment">通过GRPC访问API节点的网络地址.</p>
            </td>
          </tr>
          {node.restIsOn ? (
            <tr>
              <td>HTTP外部访问地址</td>
              <td>
                {node.restAccessAddrs.length > 0 ? (
                  node.restAccessAddrs.map((address, index) => (
                    <div key={index}>
                      <span className="ui label small basic">{formatAddress(address)}</span>
                    </div>
                  ))
                ) : (
                  <span className="disabled">-</span>
                )}
                <p className="comment">通过HTTP访问API节点的网络地址.</p>
              </td>
            </tr>
          ) : null}
          {node.statusIsValid ? (
            <>
              <tr>
                <td>CPU用量</td>
                <td>
                  {node.status.cpuUsageText} &nbsp;{' '}
                  {node.status.cpuPhysicalCount > 0 ? (
                    <span className="small grey">
                      ({node.status.cpuPhysicalCount}核心/{node.status.cpuLogicalCount}线程)
                    </span>
                  ) : null}
                </td>
              </tr>
              <tr>
                <td>内存用量</td>
                <td>{node.status.memUsageText}</td>
              </tr>
              <tr>
                <td>版本</td>
                <td>
                  v{node.status.buildVersion}
                  {query.data.newVersion.length > 0 ? (
                    <span className="red"> &nbsp; 需要升级到新版本v{query.data.newVersion}</span>
                  ) : null}
                </td>
              </tr>
              <tr>
                <td>主程序位置</td>
                <td>{node.status.exePath}</td>
              </tr>
            </>
          ) : null}
          <tr>
            <td>主节点</td>
            <td>
              {node.isPrimary ? <span className="green">Y</span> : <span className="disabled">N</span>}
              {node.isPrimary ? <p className="comment">设置为主节点后,主要的后台任务会在此节点上运行.</p> : null}
            </td>
          </tr>
          <tr>
            <td>描述</td>
            <td>{node.description.length > 0 ? node.description : <span className="disabled">暂时还没有描述.</span>}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface InstallData {
  node: { id: number; name: string; uniqueId: string; secret: string }
  dbConfig: { config: string; error: string; isNotFound: boolean }
}

function downloadURL(file: string, text: string) {
  return `/ui/download?file=${encodeURIComponent(file)}&text=${encodeURIComponent(text)}`
}

export function ApiNodeInstallPage() {
  const [searchParams] = useSearchParams()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const query = useQuery({
    queryKey: ['settings-api-node-install', nodeId],
    queryFn: () => apiGet<InstallData>('/settings/api/node/install', { nodeId }),
    enabled: nodeId > 0,
  })

  if (nodeId <= 0) {
    return <div className="ui negative message">缺少节点ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const apiConfig = `nodeId: "${data.node.uniqueId}"\nsecret: "${data.node.secret}"`

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <NodeMenu nodeId={data.node.id} nodeName={data.node.name} active="install" />

      <h3>安装步骤</h3>
      <ol className="ui list">
        <li>
          按照下面的配置信息替换<span className="ui label basic small">configs/api.yaml</span>内容;如果文件不存在,请先创建
        </li>
        <li>
          按照下面的配置信息替换<span className="ui label basic small">configs/db.yaml</span>内容;如果文件不存在,请先创建
        </li>
        <li>
          使用<span className="ui label basic small">bin/edge-api start</span>启动节点
        </li>
        <li>
          可以在<span className="ui label basic small">logs/run.log</span>中查看启动是否有异常
        </li>
        <li>
          配置修改后,使用<span className="ui label basic small">bin/edge-api restart</span>重启节点
        </li>
      </ol>

      <div className="ui divider" />
      <h3>配置信息</h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">
              configs/api.yaml
              <em>
                <br />
                <a href={downloadURL('api.yaml', apiConfig)} target="_blank" rel="noreferrer" style={{ fontWeight: 'normal' }}>
                  [下载]
                </a>
              </em>
            </td>
            <td>
              <pre>{apiConfig}</pre>
            </td>
          </tr>
          <tr>
            <td>
              configs/db.yaml
              <em>
                <br />
                <a href={downloadURL('db.yaml', data.dbConfig.config)} target="_blank" rel="noreferrer" style={{ fontWeight: 'normal' }}>
                  [下载]
                </a>
              </em>
            </td>
            <td>
              {data.dbConfig.error.length > 0 ? (
                <span className="red">
                  {data.dbConfig.isNotFound ? (
                    <>
                      找不到数据库配置文件:configs/api_db.yaml ,请重新 <a href="/settings/database">[配置数据库]</a>:
                    </>
                  ) : (
                    <>无法生成配置内容,错误原因:</>
                  )}
                  {data.dbConfig.error}
                </span>
              ) : null}
              <pre>{data.dbConfig.config}</pre>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface NodeLog {
  tag: string
  description: string
  createdTime: string
  level: string
  isToday: boolean
}

interface NodeLogsData {
  nodeId: number
  dayFrom: string
  dayTo: string
  keyword: string
  level: string
  node: { id: number; name: string }
  logs: NodeLog[]
  page: string
}

export function ApiNodeLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const dayFrom = searchParams.get('dayFrom') || ''
  const dayTo = searchParams.get('dayTo') || ''
  const keyword = searchParams.get('keyword') || ''
  const level = searchParams.get('level') || ''
  const [form, setForm] = useState({ dayFrom, dayTo, keyword, level })
  const query = useQuery({
    queryKey: ['settings-api-node-logs', nodeId, dayFrom, dayTo, keyword, level],
    queryFn: () => apiGet<NodeLogsData>('/settings/api/node/logs', { nodeId, dayFrom, dayTo, keyword, level }),
    enabled: nodeId > 0,
  })

  if (nodeId <= 0) {
    return <div className="ui negative message">缺少节点ID</div>
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('nodeId', String(nodeId))
    if (form.dayFrom) {
      next.set('dayFrom', form.dayFrom)
    }
    if (form.dayTo) {
      next.set('dayTo', form.dayTo)
    }
    if (form.keyword) {
      next.set('keyword', form.keyword)
    }
    if (form.level) {
      next.set('level', form.level)
    }
    setSearchParams(next)
  }

  const data = query.data
  const logs = data?.logs ?? []

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      {data ? <NodeMenu nodeId={data.node.id} nodeName={data.node.name} active="log" /> : null}
      <div className="margin" />
      <form className="ui form" autoComplete="off" onSubmit={submit}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="开始日期"
              value={form.dayFrom}
              style={{ width: '8em' }}
              onChange={(event) => setForm({ ...form, dayFrom: event.target.value })}
            />
          </div>
          <div className="ui field">
            <input
              type="text"
              placeholder="结束日期"
              value={form.dayTo}
              style={{ width: '8em' }}
              onChange={(event) => setForm({ ...form, dayTo: event.target.value })}
            />
          </div>
          <div className="ui field">
            <select className="ui dropdown" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="">[级别]</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
              <option value="success">成功</option>
            </select>
          </div>
          <div className="ui field">
            <input
              type="text"
              style={{ width: '10em' }}
              placeholder="关键词"
              value={form.keyword}
              onChange={(event) => setForm({ ...form, keyword: event.target.value })}
            />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              查询
            </button>
          </div>
          {dayFrom.length > 0 || dayTo.length > 0 || keyword.length > 0 || level.length > 0 ? (
            <div className="ui field">
              <a
                href={`/settings/api/node/logs?nodeId=${nodeId}`}
                onClick={(event) => {
                  event.preventDefault()
                  setForm({ dayFrom: '', dayTo: '', keyword: '', level: '' })
                  setSearchParams({ nodeId: String(nodeId) })
                }}
              >
                [清除条件]
              </a>
            </div>
          ) : null}
        </div>
      </form>

      {query.isLoading ? <LoadingBlock /> : null}
      {!query.isLoading && logs.length === 0 ? <p className="comment">暂时还没有日志.</p> : null}
      {logs.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td>
                  <pre style={{ margin: 0, padding: 0 }}>
                    <span className={log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : log.level === 'success' ? 'green' : undefined}>
                      [{log.createdTime}] [{log.tag}] {log.description}
                    </span>
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data?.page} />
    </div>
  )
}

interface UpdateData {
  node: ApiNodeData
}

export function ApiNodeUpdatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const query = useQuery({
    queryKey: ['settings-api-node-update', nodeId],
    queryFn: () => apiGet<UpdateData>('/settings/api/node/update', { nodeId }),
    enabled: nodeId > 0,
  })

  if (nodeId <= 0) {
    return <div className="ui negative message">缺少节点ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const node = query.data.node

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <NodeMenu nodeId={node.id} nodeName={node.name} active="update" />
      <div className="ui warning message">
        如果你修改了GRPC访问地址,端口,证书相关信息时,需要重启<span className="ui label basic small">edge-api</span>进程(
        <span className="ui label basic small">edge-node restart</span>)才能生效,并可能需要手工修改其他节点的配置信息.
      </div>
      <ApiNodeForm
        node={node}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['settings-api-node'] })
          navigate(`/settings/api/node?nodeId=${node.id}`)
        }}
      />
    </div>
  )
}

export function ApiNodeCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <PageHeader items={[{ name: '节点列表', href: '/settings/api' }, { name: '添加API节点', href: '/settings/api/node/createPopup', active: true }]} />
      <h3>添加API节点</h3>
      <ApiNodeForm
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['settings-api-nodes'] })
          navigate('/settings/api')
        }}
      />
    </div>
  )
}

interface AddressData {
  addr: NetworkAddress
}

function AddressResultData({ addr }: { addr: NetworkAddress }) {
  return (
    <div className="ui message success">
      已生成访问地址:<span className="ui label small basic">{formatAddress(addr)}</span>
    </div>
  )
}

export function CreateAddressPage() {
  const toast = useToast()
  const [protocol, setProtocol] = useState('http')
  const [addr, setAddr] = useState('')
  const [result, setResult] = useState<NetworkAddress | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await apiPost<AddressData>('/settings/api/node/createAddrPopup', { protocol, addr })
      setResult(data.addr)
      toast('解析成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <h3>添加访问地址</h3>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="网络协议">
            <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
            </select>
          </FormRow>
          <FormRow title="访问地址">
            <input type="text" maxLength={100} value={addr} onChange={(event) => setAddr(event.target.value)} />
            <p className="comment">可以是&quot;IP:端口&quot;或者&quot;域名:端口&quot;.</p>
          </FormRow>
        </FormTable>
        <button className="ui button primary" type="submit">
          保存
        </button>
      </form>
      {result ? <AddressResultData addr={result} /> : null}
    </div>
  )
}

export function UpdateAddressPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [protocol, setProtocol] = useState(searchParams.get('protocol') || 'http')
  const [addr, setAddr] = useState(searchParams.get('addr') || '')
  const [result, setResult] = useState<NetworkAddress | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await apiPost<AddressData>('/settings/api/node/updateAddrPopup', { protocol, addr })
      setResult(data.addr)
      toast('解析成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <h3>修改访问地址</h3>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="网络协议">
            <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
              <option value="http">HTTP</option>
              <option value="https">HTTPS</option>
            </select>
          </FormRow>
          <FormRow title="访问地址">
            <input type="text" maxLength={100} value={addr} onChange={(event) => setAddr(event.target.value)} />
            <p className="comment">可以是&quot;IP:端口&quot;或者&quot;域名:端口&quot;.</p>
          </FormRow>
        </FormTable>
        <button className="ui button primary" type="submit">
          保存
        </button>
      </form>
      {result ? <AddressResultData addr={result} /> : null}
    </div>
  )
}
