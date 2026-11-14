import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { TunnelSelect } from '../../components/TunnelSelect'
import { Checkbox, FormRow, FormTable, SubmitButton } from '../../components/form'
import { LocationShell } from './LocationShell'
import { MissingLocation, useLocationData } from './helpers'
import { DomainsBox, Modal } from './editors'
import { reverseProxyMenu } from './reverseProxyMenu'
import type { LocationBaseData, OriginSummary, ReverseProxyConfig, ReverseProxyRef } from './types'

interface OriginsData extends LocationBaseData {
  reverseProxyRef: ReverseProxyRef | null
  reverseProxyConfig: Partial<ReverseProxyConfig> | null
  serverType: string
  primaryOrigins: OriginSummary[] | null
  backupOrigins: OriginSummary[] | null
}

interface OriginDetail {
  id: number
  protocol: string
  addr: string
  tunnelNodeId?: number
  weight: number
  name: string
  description: string
  isOn: boolean
  connTimeout: number
  readTimeout: number
  idleTimeout: number
  maxConns: number
  maxIdleConns: number
  cert?: { certId?: number } | null
  domains: string[] | null
  host: string
  followPort: boolean
  http2Enabled: boolean
}

interface OriginPopupData {
  origin: OriginDetail
  reverseProxyId: number
  originId: number
  originType: string
  serverType: string
}

interface OriginFormState {
  protocol: string
  addr: string
  tunnelNodeId: number
  host: string
  weight: number
  name: string
  connTimeout: number
  readTimeout: number
  maxConns: number
  maxIdleConns: number
  idleTimeout: number
  description: string
  isOn: boolean
  domains: string[]
  followPort: boolean
  http2Enabled: boolean
  certId: number
}

function protocolOptions(serverType: string): Array<{ code: string; name: string }> {
  switch (serverType) {
    case 'tcpProxy':
      return [
        { code: 'tcp', name: 'TCP' },
        { code: 'tls', name: 'TLS' },
      ]
    case 'udpProxy':
      return [{ code: 'udp', name: 'UDP' }]
    default:
      return [
        { code: 'http', name: 'HTTP' },
        { code: 'https', name: 'HTTPS' },
      ]
  }
}

function defaultProtocol(serverType: string) {
  switch (serverType) {
    case 'tcpProxy':
      return 'tcp'
    case 'udpProxy':
      return 'udp'
    default:
      return 'http'
  }
}

function OriginForm({
  serverId,
  reverseProxyId,
  originType,
  originId,
  serverType,
  onClose,
}: {
  serverId: number
  reverseProxyId: number
  originType: string
  originId: number | null
  serverType: string
  onClose: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['origin-form', reverseProxyId, originId],
    queryFn: () =>
      apiGet<OriginPopupData>('/servers/server/settings/origins/updatePopup', {
        serverId,
        reverseProxyId,
        originType,
        originId,
      }),
    enabled: originId !== null && originId > 0,
  })
  const [state, setState] = useState<OriginFormState>({
    protocol: defaultProtocol(serverType),
    addr: '',
    tunnelNodeId: 0,
    host: '',
    weight: 10,
    name: '',
    connTimeout: 10,
    readTimeout: 0,
    maxConns: 0,
    maxIdleConns: 0,
    idleTimeout: 0,
    description: '',
    isOn: true,
    domains: [],
    followPort: false,
    http2Enabled: false,
    certId: 0,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const origin = query.data?.origin
    if (origin) {
      setState({
        protocol: origin.protocol || defaultProtocol(serverType),
        addr: origin.addr || '',
        tunnelNodeId: origin.tunnelNodeId || 0,
        host: origin.host || '',
        weight: origin.weight || 10,
        name: origin.name || '',
        connTimeout: origin.connTimeout || 0,
        readTimeout: origin.readTimeout || 0,
        maxConns: origin.maxConns || 0,
        maxIdleConns: origin.maxIdleConns || 0,
        idleTimeout: origin.idleTimeout || 0,
        description: origin.description || '',
        isOn: origin.isOn ?? true,
        domains: origin.domains ? [...origin.domains] : [],
        followPort: origin.followPort ?? false,
        http2Enabled: origin.http2Enabled ?? false,
        certId: origin.cert?.certId || 0,
      })
    }
  }, [query.data, serverType])

  if (originId !== null && originId > 0 && (query.isLoading || query.isError || !query.data)) {
    return (
      <Modal title="修改源站" onClose={onClose} width="46em">
        {query.isError ? <div className="ui negative message">加载失败</div> : <LoadingBlock />}
      </Modal>
    )
  }

  const isHTTP = serverType === 'httpProxy' || serverType === 'httpWeb'
  const options = protocolOptions(serverType)
  const showHost = isHTTP || state.protocol === 'tls'

  function update(patch: Partial<OriginFormState>) {
    setState((current) => ({ ...current, ...patch }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const params: Record<string, unknown> = {
        serverId,
        reverseProxyId,
        originType,
        protocol: state.protocol,
        addr: state.addr,
        tunnelNodeId: state.tunnelNodeId,
        weight: state.weight,
        name: state.name,
        connTimeout: state.connTimeout,
        readTimeout: state.readTimeout,
        maxConns: state.maxConns,
        maxIdleConns: state.maxIdleConns,
        idleTimeout: state.idleTimeout,
        certIdsJSON: JSON.stringify(state.certId > 0 ? [state.certId] : []),
        domainsJSON: JSON.stringify(state.domains),
        host: state.host,
        followPort: state.followPort,
        http2Enabled: state.http2Enabled,
        description: state.description,
        isOn: state.isOn,
      }
      if (originId !== null && originId > 0) {
        params.originId = originId
      }
      await apiPost(originId && originId > 0 ? '/servers/server/settings/origins/updatePopup' : '/servers/server/settings/origins/addPopup', params)
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['location-reverse-proxy-origins'] })
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={originId && originId > 0 ? '修改源站' : '添加源站'} onClose={onClose} width="46em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <tbody>
            <FormRow title="源站协议">
              <select className="ui dropdown auto-width" value={state.protocol} onChange={(event) => update({ protocol: event.target.value })}>
                {options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </FormRow>
            {isHTTP ? (
              <FormRow title="Tunnel">
                <TunnelSelect value={state.tunnelNodeId} onChange={(id) => update({ tunnelNodeId: id })} serverId={serverId} />
              </FormRow>
            ) : null}
            <FormRow title="源站地址 *">
              <div className="ui input left labeled">
                <span className="ui label">{state.protocol}://</span>
                <input type="text" value={state.addr} onChange={(event) => update({ addr: event.target.value })} />
              </div>
              <p className="comment">
                源站服务器地址,通常是一个IP(或域名)加端口,80和443端口可以省略
                {serverType === 'httpProxy' ? ',不需要加 http:// 或 https://' : ''}.
              </p>
            </FormRow>
            {showHost ? (
              <FormRow title="回源主机名">
                <input type="text" maxLength={100} placeholder="比如example.com" value={state.host} onChange={(event) => update({ host: event.target.value })} />
                <p className="comment">
                  可选项.请求源站时的Host字段值,用于设置访问源站的站点域名{isHTTP ? ',支持请求变量' : ''};
                  如果用户访问的域名和源站域名不一致,请务必设置为源站域名.
                </p>
              </FormRow>
            ) : null}
            <FormRow title="专属域名">
              <DomainsBox domains={state.domains} onChange={(domains) => update({ domains })} />
              <p className="comment">默认不需要填写,表示支持所有域名.如果填写了专属域名,表示这些源站只会在所列的专属域名被访问时才生效.</p>
            </FormRow>
            {state.protocol !== 'udp' ? (
              <FormRow title="端口跟随">
                <Checkbox checked={state.followPort} onChange={(followPort) => update({ followPort })} />
                <p className="comment">选中后表示源站的端口保持和用户访问的服务端口保持一致;此时的源站地址中的端口号可以任意填写.</p>
              </FormRow>
            ) : null}
            {state.protocol === 'https' ? (
              <FormRow title="支持HTTP/2">
                <Checkbox checked={state.http2Enabled} onChange={(http2Enabled) => update({ http2Enabled })} />
                <p className="comment">选中后,表示源站支持HTTP/2协议.</p>
              </FormRow>
            ) : null}
            {state.protocol === 'https' || state.protocol === 'tls' ? (
              <FormRow title={`${state.protocol.toUpperCase()}证书`}>
                <input
                  type="text"
                  maxLength={10}
                  style={{ width: '8em' }}
                  placeholder="证书ID"
                  value={state.certId > 0 ? String(state.certId) : ''}
                  onChange={(event) => update({ certId: Math.max(0, Number(event.target.value) || 0) })}
                />
                <p className="comment">可以选择连接源站使用的证书ID;除非源站有特殊需求,否则不需要添加.</p>
              </FormRow>
            ) : null}
            <FormRow title="权重">
              <input
                type="text"
                maxLength={4}
                style={{ width: '5em' }}
                value={state.weight}
                onChange={(event) => update({ weight: Math.max(0, Number(event.target.value) || 0) })}
              />
              <p className="comment">数字越大,代表分配的请求比例越多.</p>
            </FormRow>
            <FormRow title="名称">
              <input type="text" maxLength={100} value={state.name} onChange={(event) => update({ name: event.target.value })} />
              <p className="comment">给当前源站起一个容易识别的名称.</p>
            </FormRow>
            <FormRow title="连接失败超时时间">
              <div className="ui fields inline">
                <div className="ui field">
                  <input type="text" size={6} value={state.connTimeout} onChange={(event) => update({ connTimeout: Math.max(0, Number(event.target.value) || 0) })} />
                </div>
                <div className="ui field">秒</div>
              </div>
              <p className="comment">连接源站失败的最大超时时间,0表示不限制.</p>
            </FormRow>
            {isHTTP ? (
              <FormRow title="读取超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <input type="text" size={6} value={state.readTimeout} onChange={(event) => update({ readTimeout: Math.max(0, Number(event.target.value) || 0) })} />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <p className="comment">读取内容时的最大超时时间,0表示不限制.</p>
              </FormRow>
            ) : null}
            {isHTTP ? (
              <FormRow title="最大并发连接数">
                <input type="text" size={6} maxLength={10} value={state.maxConns} onChange={(event) => update({ maxConns: Math.max(0, Number(event.target.value) || 0) })} />
                <p className="comment">源站可以接受到的最大并发连接数,0表示使用系统默认.</p>
              </FormRow>
            ) : null}
            {isHTTP ? (
              <FormRow title="最大空闲连接数">
                <input type="text" size={6} maxLength={10} value={state.maxIdleConns} onChange={(event) => update({ maxIdleConns: Math.max(0, Number(event.target.value) || 0) })} />
                <p className="comment">当没有请求时,源站保持等待的最大空闲连接数量,0表示使用系统默认.</p>
              </FormRow>
            ) : null}
            {isHTTP ? (
              <FormRow title="最大空闲超时时间">
                <div className="ui fields inline">
                  <div className="ui field">
                    <input type="text" size={6} value={state.idleTimeout} onChange={(event) => update({ idleTimeout: Math.max(0, Number(event.target.value) || 0) })} />
                  </div>
                  <div className="ui field">秒</div>
                </div>
                <p className="comment">源站保持等待的空闲超时时间,0表示使用默认时间.</p>
              </FormRow>
            ) : null}
            <FormRow title="备注">
              <textarea rows={3} maxLength={100} value={state.description} onChange={(event) => update({ description: event.target.value })} />
            </FormRow>
            <FormRow title="启用当前源站">
              <Checkbox checked={state.isOn} onChange={(isOn) => update({ isOn })} />
            </FormRow>
          </tbody>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}

function OriginTable({
  origins,
  originType,
  onModify,
  onDelete,
  onToggle,
}: {
  origins: OriginSummary[]
  originType: string
  onModify: (originId: number) => void
  onDelete: (origin: OriginSummary) => void
  onToggle: (origin: OriginSummary, isOn: boolean) => void
}) {
  const hasMatchedDomains = origins.some((origin) => origin.domains && origin.domains.length > 0)
  const originTypeName = originType === 'primary' ? '主要源站' : '备用源站'
  return (
    <div>
      <h3>
        {originTypeName}{' '}
        <a href="" onClick={(event) => { event.preventDefault(); onModify(0) }}>
          [添加{originTypeName}]
        </a>
      </h3>
      {origins.length === 0 ? <p className="comment">暂时还没有{originTypeName}.</p> : null}
      {origins.length > 0 ? (
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
                <td className={origin.isOn ? undefined : 'disabled'}>
                  <a href="" className={origin.isOn ? undefined : 'disabled'} onClick={(event) => { event.preventDefault(); onModify(origin.id) }}>
                    {origin.addr}
                  </a>
                  <div style={{ marginTop: '0.3em' }}>
                    {origin.isOSS ? <span className="ui label tiny grey basic">对象存储</span> : null}
                    {origin.name && origin.name.length > 0 ? <span className="ui label tiny grey basic">{origin.name}</span> : null}
                    {origin.hasCert ? <span className="ui label tiny grey basic">证书</span> : null}
                    {origin.host && origin.host.length > 0 ? <span className="ui label tiny grey basic">主机名: {origin.host}</span> : null}
                    {origin.followPort ? <span className="ui label tiny grey basic">端口跟随</span> : null}
                    {origin.addr && origin.addr.startsWith('https://') && origin.http2Enabled ? (
                      <span className="ui label tiny grey basic">HTTP/2</span>
                    ) : null}
                    {origin.domains && origin.domains.length > 0 ? (
                      <span>
                        {origin.domains.map((domain) => (
                          <span key={domain} className="ui label tiny grey basic">
                            匹配: {domain}
                          </span>
                        ))}
                      </span>
                    ) : hasMatchedDomains ? (
                      <span className="ui label tiny grey basic">匹配: 所有域名</span>
                    ) : null}
                  </div>
                </td>
                <td className={origin.isOn ? undefined : 'disabled'}>{origin.weight}</td>
                <td>{origin.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                <td>
                  <a href="" onClick={(event) => { event.preventDefault(); onModify(origin.id) }}>
                    修改
                  </a>{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); onToggle(origin, !origin.isOn) }}>
                    {origin.isOn ? '停用' : <span className="red">启用</span>}
                  </a>{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); onDelete(origin) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export function ReverseProxyOriginsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { query, serverId, locationId } = useLocationData<OriginsData>('/servers/server/settings/locations/reverseProxy', 'location-reverse-proxy-origins')
  const [editing, setEditing] = useState<{ originType: string; originId: number | null } | null>(null)

  if (locationId === 0) {
    return <MissingLocation />
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const ref = query.data.reverseProxyRef
  const reverseProxyId = query.data.reverseProxyConfig?.id || 0
  const primaryOrigins = query.data.primaryOrigins || []
  const backupOrigins = query.data.backupOrigins || []
  const enabled = !!ref && ref.isPrior && ref.isOn

  async function deleteOrigin(origin: OriginSummary, originType: string) {
    if (!(await confirm({ message: `确定要删除此源站(${origin.addr})吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/origins/delete', { reverseProxyId, originId: origin.id, originType })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['location-reverse-proxy-origins'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function toggleOrigin(origin: OriginSummary, isOn: boolean) {
    const resultMessage = isOn ? '启用成功' : '停用成功'
    if (!(await confirm({ message: `确定要${isOn ? '启用' : '停用'}此源站(${origin.addr})吗?` }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/origins/updateIsOn', { originId: origin.id, isOn })
      toast(resultMessage)
      await queryClient.invalidateQueries({ queryKey: ['location-reverse-proxy-origins'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <LocationShell data={query.data} menu={reverseProxyMenu(serverId, locationId, 'index')}>
      <div className="margin" />
      {!enabled ? (
        <div className="ui message warning">
          当前源站没有启用,可以通过点击{' '}
          <a href={`/servers/server/settings/locations/reverseProxy/setting?serverId=${serverId}&locationId=${locationId}`}>[更多设置]</a> 开启 .
        </div>
      ) : null}
      <OriginTable
        origins={primaryOrigins}
        originType="primary"
        onModify={(originId) => setEditing({ originType: 'primary', originId: originId > 0 ? originId : null })}
        onDelete={(origin) => deleteOrigin(origin, 'primary')}
        onToggle={(origin, isOn) => toggleOrigin(origin, isOn)}
      />
      <OriginTable
        origins={backupOrigins}
        originType="backup"
        onModify={(originId) => setEditing({ originType: 'backup', originId: originId > 0 ? originId : null })}
        onDelete={(origin) => deleteOrigin(origin, 'backup')}
        onToggle={(origin, isOn) => toggleOrigin(origin, isOn)}
      />
      {editing ? (
        <OriginForm
          serverId={serverId}
          reverseProxyId={reverseProxyId}
          originType={editing.originType}
          originId={editing.originId}
          serverType={query.data.serverType}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </LocationShell>
  )
}
