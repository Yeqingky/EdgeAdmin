import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import '../../../../web/views/@default/servers/create.css'
import { FirstMenu, apiPostMulti, useClusterOptions, useUserOptions } from './common'
import {
  CertModal,
  OriginModal,
  PortModal,
  ServerNameModal,
  type CertRef,
  type OriginAddress,
  type OriginItem,
  type ServerNameConfig,
} from './server-modals'

interface ServerTypeDef {
  code: string
  name: string
  description: string
}

interface CreateData {
  countAuditing: number
  serverTypes: ServerTypeDef[]
  hasUsers: boolean
  currentUserId: number
}

interface GroupItem {
  id: number
  name: string
}

interface PlanItem {
  id: number
  name: string
  dayTo: string
}

export function ServerCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()

  const query = useQuery({
    queryKey: ['servers-core', 'server-create'],
    queryFn: () => apiGet<CreateData>('/servers/create'),
  })

  const clustersQuery = useClusterOptions()
  const usersQuery = useUserOptions(!!query.data?.hasUsers)
  const groupsQuery = useQuery({
    queryKey: ['servers-core', 'server-groups'],
    queryFn: () => apiGet<{ groups: GroupItem[] }>('/servers/groups'),
  })

  const [serverType, setServerType] = useState('httpProxy')
  const [name, setName] = useState('')
  const [clusterId, setClusterId] = useState(0)
  const [userId, setUserId] = useState(query.data?.currentUserId || 0)
  const [userPlanId, setUserPlanId] = useState(0)
  const [groupIds, setGroupIds] = useState<number[]>([])
  const [serverNames, setServerNames] = useState<ServerNameConfig[]>([])
  const [origins, setOrigins] = useState<OriginItem[]>([])
  const [addresses, setAddresses] = useState<OriginAddress[]>([])
  const [certs, setCerts] = useState<CertRef[]>([])
  const [webRoot, setWebRoot] = useState('')
  const [accessLogIsOn, setAccessLogIsOn] = useState(true)
  const [websocketIsOn, setWebsocketIsOn] = useState(true)
  const [cacheIsOn, setCacheIsOn] = useState(true)
  const [wafIsOn, setWafIsOn] = useState(false)
  const [remoteAddrIsOn, setRemoteAddrIsOn] = useState(false)
  const [statIsOn, setStatIsOn] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [showOriginModal, setShowOriginModal] = useState(false)
  const [showPortModal, setShowPortModal] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)

  const clusters = clustersQuery.data || []
  const users = usersQuery.data || []
  const groups = groupsQuery.data?.groups || []

  const plansQuery = useQuery({
    queryKey: ['servers-core', 'plans', userId],
    enabled: userId > 0,
    queryFn: () => apiPost<{ plans: PlanItem[] }>('/servers/users/plans', { userId }),
  })
  const plans = plansQuery.data?.plans || []

  useEffect(() => {
    if (clusterId === 0 && clusters.length > 0) {
      setClusterId(clusters[0].id)
    }
  }, [clusters, clusterId])

  const isHTTP = serverType === 'httpProxy' || serverType === 'httpWeb'
  const isProxy = serverType === 'httpProxy' || serverType === 'tcpProxy' || serverType === 'udpProxy'

  useEffect(() => {
    setOrigins([])
    setCerts([])
    if (serverType === 'httpProxy' || serverType === 'httpWeb') {
      setAddresses([
        { protocol: 'http', host: '', portRange: '80' },
        { protocol: 'https', host: '', portRange: '443' },
      ])
    } else {
      setAddresses([])
    }
  }, [serverType])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const currentType = data.serverTypes.find((item) => item.code === serverType)
  const allDomains = serverNames.flatMap((item) =>
    item.subNames && item.subNames.length > 0 ? item.subNames : item.name ? [item.name] : [],
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isProxy && origins.length === 0) {
      toast('请添加至少一个源站地址', 'error')
      return
    }
    if (serverType === 'httpProxy' && allDomains.length === 0) {
      toast('请输入添加至少一个域名', 'error')
      return
    }
    if (addresses.length === 0) {
      toast('至少需要绑定一个端口', 'error')
      return
    }

    const entries: Array<[string, string | number]> = [
      ['serverType', serverType],
      ['name', name],
      ['userId', userId],
      ['userPlanId', userPlanId],
      ['clusterId', clusterId],
      ['addresses', JSON.stringify(addresses)],
      ['serverNames', JSON.stringify(serverNames)],
      ['origins', JSON.stringify(origins)],
      ['certIdsJSON', certs.length > 0 ? JSON.stringify(certs.map((cert) => cert.id)) : ''],
      ['webRoot', webRoot],
      ['accessLogIsOn', accessLogIsOn ? 1 : ''],
      ['websocketIsOn', websocketIsOn ? 1 : ''],
      ['cacheIsOn', cacheIsOn ? 1 : ''],
      ['wafIsOn', wafIsOn ? 1 : ''],
      ['remoteAddrIsOn', remoteAddrIsOn ? 1 : ''],
      ['statIsOn', statIsOn ? 1 : ''],
    ]
    for (const groupId of groupIds) {
      entries.push(['groupIds', groupId])
    }

    setSubmitting(true)
    try {
      await apiPostMulti('/servers/create', entries)
      toast('保存成功')
      navigate('/servers')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: '网站列表', href: '/servers' },
          { name: `审核中(${data.countAuditing})`, href: '/servers?auditingFlag=1' },
          { name: '[创建网站]', href: '/servers/create', active: true },
        ]}
      />

      <form className="ui form" onSubmit={(event) => void submit(event)}>
        <div className="tables-box">
          <div className="table-box left">
            <h3>新网站主要信息:</h3>
            <table className="ui table selectable definition">
              <tbody>
                {data.hasUsers ? (
                  <tr>
                    <td className="title">所属用户</td>
                    <td>
                      <select
                        className="ui dropdown"
                        value={userId}
                        onChange={(event) => {
                          setUserId(Number(event.target.value))
                          setUserPlanId(0)
                        }}
                      >
                        <option value={0}>[不指定用户]</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <p className="comment">当前网站所属平台用户.</p>
                    </td>
                  </tr>
                ) : null}
                {plans.length > 0 ? (
                  <tr>
                    <td className="title">选择套餐</td>
                    <td>
                      <select
                        className="ui dropdown auto-width"
                        value={userPlanId}
                        onChange={(event) => setUserPlanId(Number(event.target.value))}
                      >
                        <option value={0}>[选择套餐]</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}({plan.dayTo})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="title">部署的集群 *</td>
                  <td>
                    {userId === 0 ? (
                      <>
                        <select
                          className="ui dropdown"
                          value={clusterId}
                          onChange={(event) => setClusterId(Number(event.target.value))}
                        >
                          <option value={0}>[选择集群]</option>
                          {clusters.map((cluster) => (
                            <option key={cluster.id} value={cluster.id}>
                              {cluster.name}
                            </option>
                          ))}
                        </select>
                        <p className="comment">当前网站将会部署到所选集群的节点上.</p>
                      </>
                    ) : (
                      <span>跟随用户设置.</span>
                    )}
                  </td>
                </tr>

                {isHTTP ? (
                  <tr>
                    <td>绑定域名 *</td>
                    <td>
                      {serverNames.length > 0 ? (
                        <div style={{ marginBottom: '0.5em' }}>
                          {serverNames.map((item, index) => (
                            <span key={index} className="ui label basic small" style={{ marginBottom: '0.4em' }}>
                              {item.subNames && item.subNames.length > 0 ? item.subNames.join(', ') : item.name}
                              <a
                                href=""
                                title="删除"
                                style={{ marginLeft: '0.4em' }}
                                onClick={(event) => {
                                  event.preventDefault()
                                  setServerNames((current) => current.filter((_, i) => i !== index))
                                }}
                              >
                                <X size={11} />
                              </a>
                            </span>
                          ))}
                          <div className="ui divider" />
                        </div>
                      ) : null}
                      <a href="" onClick={(event) => { event.preventDefault(); setShowNameModal(true) }}>
                        [添加域名]
                      </a>
                      <p className="comment">绑定后,才能通过域名可以访问不同的服务.</p>
                    </td>
                  </tr>
                ) : null}

                {isHTTP ? (
                  <tr>
                    <td>HTTPS证书</td>
                    <td>
                      {certs.length > 0 ? (
                        <div style={{ marginBottom: '0.5em' }}>
                          {certs.map((cert) => (
                            <span key={cert.id} className="ui label basic small" style={{ marginBottom: '0.4em' }}>
                              {cert.name}
                              <a
                                href=""
                                title="删除"
                                style={{ marginLeft: '0.4em' }}
                                onClick={(event) => {
                                  event.preventDefault()
                                  setCerts((current) => current.filter((item) => item.id !== cert.id))
                                }}
                              >
                                <X size={11} />
                              </a>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <a href="" onClick={(event) => { event.preventDefault(); setShowCertModal(true) }}>
                        [选择证书]
                      </a>
                      <p className="comment">可以选择当前网站使用的证书;如果留空,则需要使用默认证书或上传新证书.</p>
                    </td>
                  </tr>
                ) : null}

                {isProxy ? (
                  <tr>
                    <td>源站地址 *</td>
                    <td>
                      {origins.length > 0 ? (
                        <div style={{ marginBottom: '0.5em' }}>
                          {origins.map((origin, index) => (
                            <span key={origin.id} className="ui label small basic" style={{ marginBottom: '0.4em' }}>
                              {origin.addrSummary && origin.addrSummary.length > 0
                                ? origin.addrSummary
                                : `${origin.addr?.protocol}://${origin.addr?.host}:${origin.addr?.portRange}`}
                              <a
                                href=""
                                title="删除"
                                style={{ marginLeft: '0.4em' }}
                                onClick={(event) => {
                                  event.preventDefault()
                                  setOrigins((current) => current.filter((_, i) => i !== index))
                                }}
                              >
                                <X size={11} />
                              </a>
                            </span>
                          ))}
                          <div className="ui divider" />
                        </div>
                      ) : null}
                      <a href="" onClick={(event) => { event.preventDefault(); setShowOriginModal(true) }}>
                        [添加源站地址]
                      </a>
                    </td>
                  </tr>
                ) : null}

                {serverType === 'httpWeb' ? (
                  <tr>
                    <td>Web目录</td>
                    <td>
                      <input type="text" value={webRoot} onChange={(event) => setWebRoot(event.target.value)} />
                    </td>
                  </tr>
                ) : null}

                <tr>
                  <td className="title">绑定端口 *</td>
                  <td>
                    {addresses.length > 0 ? (
                      <div style={{ marginBottom: '0.5em' }}>
                        {addresses.map((address, index) => (
                          <span key={index} className="ui label basic small" style={{ marginBottom: '0.4em' }}>
                            {address.host ? `${address.host}:` : ''}
                            {address.portRange}
                            <span className="small">({address.protocol})</span>
                            <a
                              href=""
                              title="删除"
                              style={{ marginLeft: '0.4em' }}
                              onClick={(event) => {
                                event.preventDefault()
                                setAddresses((current) => current.filter((_, i) => i !== index))
                              }}
                            >
                              <X size={11} />
                            </a>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <a href="" onClick={(event) => { event.preventDefault(); setShowPortModal(true) }}>
                      [添加端口]
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-box right">
            <h3>次要信息:</h3>
            <table className="ui table selectable definition">
              <tbody>
                <tr>
                  <td className="title">网站类型</td>
                  <td>
                    <select
                      className="ui dropdown auto-width"
                      value={serverType}
                      onChange={(event) => setServerType(event.target.value)}
                    >
                      {data.serverTypes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {currentType && currentType.description ? (
                      <p className="comment">{currentType.description}</p>
                    ) : null}
                  </td>
                </tr>
                <tr>
                  <td className="title">网站名称</td>
                  <td>
                    <input type="text" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
                    <p className="comment">可以是网站用途或者域名等.</p>
                  </td>
                </tr>
                {isHTTP ? (
                  <tr>
                    <td>默认开启配置</td>
                    <td>
                      <div className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id="create-access-log"
                          checked={accessLogIsOn}
                          onChange={(event) => setAccessLogIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-access-log">访问日志</label>
                      </div>
                      <div className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id="create-websocket"
                          checked={websocketIsOn}
                          onChange={(event) => setWebsocketIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-websocket">Websocket</label>
                      </div>
                      <div className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id="create-cache"
                          checked={cacheIsOn}
                          onChange={(event) => setCacheIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-cache">缓存</label>
                      </div>
                      <div className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id="create-waf"
                          checked={wafIsOn}
                          onChange={(event) => setWafIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-waf">WAF</label>
                      </div>
                      <div className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id="create-remote-addr"
                          checked={remoteAddrIsOn}
                          onChange={(event) => setRemoteAddrIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-remote-addr">从上级代理中读取IP</label>
                      </div>
                      <div className="ui checkbox">
                        <input
                          type="checkbox"
                          id="create-stat"
                          checked={statIsOn}
                          onChange={(event) => setStatIsOn(event.target.checked)}
                        />
                        <label htmlFor="create-stat">统计</label>
                      </div>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>选择分组</td>
                  <td>
                    {groups.length === 0 ? <span className="disabled">暂时还没有分组.</span> : null}
                    {groups.map((group) => (
                      <div className="ui checkbox" key={group.id} style={{ marginRight: '1em' }}>
                        <input
                          type="checkbox"
                          id={`create-group-${group.id}`}
                          checked={groupIds.includes(group.id)}
                          onChange={(event) =>
                            setGroupIds((current) =>
                              event.target.checked
                                ? [...current, group.id]
                                : current.filter((id) => id !== group.id),
                            )
                          }
                        />
                        <label htmlFor={`create-group-${group.id}`}>{group.name}</label>
                      </div>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="clear" />
        </div>

        <div style={{ marginTop: '1em' }}>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="submit"
            disabled={submitting}
          >
            保存
          </button>
        </div>
      </form>

      {showOriginModal ? (
        <OriginModal
          serverType={serverType}
          onClose={() => setShowOriginModal(false)}
          onCreated={(origin) => setOrigins((current) => [...current, origin])}
        />
      ) : null}
      {showPortModal ? (
        <PortModal
          serverType={serverType}
          onClose={() => setShowPortModal(false)}
          onCreated={(address) => setAddresses((current) => [...current, address])}
        />
      ) : null}
      {showNameModal ? (
        <ServerNameModal
          onClose={() => setShowNameModal(false)}
          onCreated={(serverName) => setServerNames((current) => [...current, serverName])}
        />
      ) : null}
      {showCertModal ? (
        <CertModal
          userId={userId}
          domains={allDomains}
          initialCerts={certs}
          onClose={() => setShowCertModal(false)}
          onApply={setCerts}
        />
      ) : null}
    </div>
  )
}
