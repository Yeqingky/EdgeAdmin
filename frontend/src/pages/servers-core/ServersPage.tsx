import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, ChevronUp, Settings, Trash2 } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LegacyPagination } from '../../components/LegacyPagination'
import { LoadingBlock } from '../../components/LoadingBlock'
import {
  FirstMenu,
  DividerItem,
  Keyword,
  Modal,
  MoreAngle,
  Tip,
  apiPostMulti,
  formatBits,
  useClusterOptions,
  useUserOptions,
} from './common'

interface ServerPort {
  protocol: string
  portRange: string
}

interface ServerRow {
  id: number
  isOn: boolean
  name: string
  cluster: { id: number; name: string }
  ports: ServerPort[]
  serverTypeName: string
  groups: { id: number; name: string }[]
  firstServerName: string
  countServerNames: number
  isAuditing: boolean
  auditingIsOk: boolean
  user?: { id: number; fullname: string } | null
  auditingTime: string
  bandwidthBits: number
  qps: string
  attackQPS: string
}

interface ServersData {
  clusterId: number
  groupId: number
  keyword: string
  auditingFlag: number
  hasOrder: boolean
  userId: number
  latestServers: { id: number; name: string }[]
  countAuditing: number
  countNeedFixLogs: number
  hasUsers: boolean
  canVisitUser: boolean
  page: string
  servers: ServerRow[]
  clusters: { id: number; name: string }[]
  groups: { id: number; name: string }[]
}

export function ServersPage() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const clusterId = Number(searchParams.get('clusterId') || 0) || 0
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const userId = Number(searchParams.get('userId') || 0) || 0
  const keywordParam = searchParams.get('keyword') || ''
  const auditingFlag = Number(searchParams.get('auditingFlag') || 0) || 0
  const trafficOutOrder = searchParams.get('trafficOutOrder') || ''
  const requestsOrder = searchParams.get('requestsOrder') || ''
  const attackRequestsOrder = searchParams.get('attackRequestsOrder') || ''
  const page = Number(searchParams.get('page') || 1) || 1

  const [keyword, setKeyword] = useState(keywordParam)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [latestVisible, setLatestVisible] = useState(false)
  const [namesServer, setNamesServer] = useState<{ id: number; name: string } | null>(null)
  const [namesKeyword, setNamesKeyword] = useState('')

  const query = useQuery({
    queryKey: ['servers-core', 'servers', clusterId, groupId, userId, keywordParam, auditingFlag, trafficOutOrder, requestsOrder, attackRequestsOrder, page],
    queryFn: () =>
      apiGet<ServersData>('/servers', {
        clusterId,
        groupId,
        userId,
        keyword: keywordParam,
        auditingFlag,
        trafficOutOrder,
        requestsOrder,
        attackRequestsOrder,
        page,
      }),
  })

  const clustersQuery = useClusterOptions()
  const usersQuery = useUserOptions(!!query.data?.hasUsers)
  const clusters = clustersQuery.data || []
  const users = usersQuery.data || []

  const namesQuery = useQuery({
    queryKey: ['servers-core', 'server-names', namesServer?.id],
    enabled: !!namesServer,
    queryFn: () => apiGet<{ serverNames: string[] }>('/servers/serverNamesPopup', { serverId: namesServer?.id }),
  })

  const deleteServers = useMutation({
    mutationFn: (serverIds: number[]) =>
      apiPostMulti('/servers/deleteServers', serverIds.map((id) => ['serverIds', id] as [string, number])),
    onSuccess: async () => {
      toast('删除成功')
      setSelectedIds([])
      await queryClient.invalidateQueries({ queryKey: ['servers-core', 'servers'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const data = query.data

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !data) {
    return <div className="ui negative message">加载失败</div>
  }

  function updateParams(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || value === 0) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    next.delete('page')
    setSearchParams(next)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    updateParams({
      keyword: keyword.trim(),
      clusterId,
      groupId,
      userId,
      auditingFlag,
    })
  }

  function toggleOrder(name: string) {
    const current = searchParams.get(name) || ''
    const next = current === 'desc' ? 'asc' : current === 'asc' ? '' : 'desc'
    const patch: Record<string, string | undefined> = {}
    for (const key of ['trafficOutOrder', 'requestsOrder', 'attackRequestsOrder']) {
      patch[key] = key === name ? next : undefined
    }
    updateParams(patch)
  }

  async function removeServer(server: ServerRow) {
    if (!(await confirm({ message: `确定要删除网站 ${server.name} 吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    deleteServers.mutate([server.id])
  }

  async function removeSelected() {
    if (!(await confirm({ message: `确定要删除所选的${selectedIds.length}个网站吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    deleteServers.mutate(selectedIds)
  }

  const allChecked = data.servers.length > 0 && data.servers.every((server) => selectedIds.includes(server.id))
  const hasConditions = clusterId > 0 || groupId > 0 || keywordParam.length > 0 || data.hasOrder || userId > 0
  const visibleNames = (namesQuery.data?.serverNames || []).filter((name) =>
    !namesKeyword ? true : name.toLowerCase().includes(namesKeyword.toLowerCase()),
  )

  function orderIcon(name: string) {
    const value = searchParams.get(name)
    if (value === 'desc') {
      return <ChevronDown size={11} />
    }
    if (value === 'asc') {
      return <ChevronUp size={11} />
    }
    return <span className="grey">⇅</span>
  }

  return (
    <div>
      <FirstMenu
        items={[
          { name: '网站列表', href: '/servers', active: auditingFlag !== 1 },
          { name: `审核中(${data.countAuditing})`, href: '/servers?auditingFlag=1', active: auditingFlag === 1 },
        ]}
      >
        <DividerItem />
        <a
          className="item"
          href="/servers/create"
          onClick={(event) => {
            event.preventDefault()
            navigate('/servers/create')
          }}
        >
          [创建网站]
        </a>
      </FirstMenu>

      {data.countNeedFixLogs > 0 ? (
        <div className="ui icon message small error">
          <AlertTriangle size={20} />
          <div className="content">
            <a href="/clusters/logs?type=needFix">有{data.countNeedFixLogs}个网站相关的错误需要修复.</a>
          </div>
        </div>
      ) : null}

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui margin" />
        <div className="ui fields inline">
          {clusters.length > 0 ? (
            <div className="ui field">
              <select
                className="ui dropdown"
                value={clusterId}
                onChange={(event) => updateParams({ clusterId: Number(event.target.value) })}
              >
                <option value={0}>[选择集群]</option>
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {data.groups.length > 0 ? (
            <div className="ui field">
              <select
                className="ui dropdown auto-width"
                value={groupId}
                onChange={(event) => updateParams({ groupId: Number(event.target.value) })}
              >
                <option value={0}>[选择分组]</option>
                <option value={-1}>[未分组]</option>
                {data.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {data.hasUsers ? (
            <div className="ui field">
              <select
                className="ui dropdown"
                value={userId}
                onChange={(event) => updateParams({ userId: Number(event.target.value) })}
              >
                <option value={0}>[选择用户]</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="ui field">
            <input
              type="text"
              style={{ width: '14em' }}
              placeholder="关键词,域名,端口等"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            &nbsp;
            {hasConditions ? (
              <a
                href="/servers"
                onClick={(event) => {
                  event.preventDefault()
                  setKeyword('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
        <div className="ui fields inline" style={{ marginTop: '1em' }}>
          {clusterId === 0 && groupId === 0 && keywordParam.length === 0 && data.latestServers.length > 0 ? (
            <div className="ui field">
              <MoreAngle open={latestVisible} onClick={() => setLatestVisible(!latestVisible)}>
                常用
              </MoreAngle>
            </div>
          ) : null}
        </div>
      </form>

      {latestVisible ? (
        <div className="ui segment">
          常用网站:
          {data.latestServers.map((server, index) => (
            <span key={server.id}>
              <a href={`/servers/server?serverId=${server.id}`}>{server.name}</a>
              {index !== data.latestServers.length - 1 ? (
                <>
                  {' '}
                  &nbsp; <span className="disabled">|</span> &nbsp;
                </>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {data.servers.length === 0 ? (
        <p className="ui message">
          暂时还没有网站,现在去{' '}
          <a href="/servers/create" onClick={(event) => { event.preventDefault(); navigate('/servers/create') }}>
            [创建网站 → ]
          </a>
        </p>
      ) : null}

      {selectedIds.length > 0 ? (
        <div>
          <div className="ui divider" />
          <button className="ui button basic" type="button" onClick={() => setSelectedIds([])}>
            取消所选
          </button>
          &nbsp; &nbsp;
          <button className="ui button basic" type="button" onClick={() => void removeSelected()}>
            删除所选{selectedIds.length}网站
          </button>
        </div>
      ) : null}

      {data.servers.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '1em' }}>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? data.servers.map((server) => server.id) : [])
                    }
                  />
                  <label />
                </div>
              </th>
              <th>网站名称</th>
              <th>所属用户</th>
              <th>部署集群</th>
              <th>域名</th>
              <th>端口</th>
              <th className="center">
                下行带宽
                <Tip content="最近5分钟峰值带宽,每5分钟更新一次" />
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('trafficOutOrder') }}>
                  {orderIcon('trafficOutOrder')}
                </a>
              </th>
              <th className="center">
                QPS
                <Tip content="最近5分钟平均QPS,每5分钟更新一次" />
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('requestsOrder') }}>
                  {orderIcon('requestsOrder')}
                </a>
              </th>
              <th className="center">
                攻击QPS
                <Tip content="最近5分钟平均攻击QPS,每5分钟更新一次" />
                <a href="" onClick={(event) => { event.preventDefault(); toggleOrder('attackRequestsOrder') }}>
                  {orderIcon('attackRequestsOrder')}
                </a>
              </th>
              <th className="center">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.servers.map((server) => {
              return (
                <tr key={server.id}>
                  <td>
                    <div className="ui checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(server.id)}
                        onChange={(event) =>
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...current, server.id]
                              : current.filter((id) => id !== server.id),
                          )
                        }
                      />
                      <label />
                    </div>
                  </td>
                  <td>
                    <a href={`/servers/server?serverId=${server.id}`}>
                      <Keyword word={keywordParam}>{server.name}</Keyword>
                    </a>{' '}
                    &nbsp;{' '}
                    <a href={`/servers/server/settings?serverId=${server.id}`} title="设置">
                      <Settings size={13} className="grey" />
                    </a>
                    <div style={{ marginTop: '0.4em' }}>
                      <span className="ui label basic grey tiny">{server.serverTypeName}</span>
                    </div>
                  </td>
                  <td>
                    {server.user ? (
                      <span>
                        {server.user.fullname}
                        {data.canVisitUser ? (
                          <a href={`/users/user?userId=${server.user.id}`} style={{ marginLeft: '0.3em' }}>
                            ↗
                          </a>
                        ) : null}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>{server.cluster.name}</td>
                  <td>
                    {server.firstServerName.length > 0 ? (
                      <span>
                        <Keyword word={keywordParam}>{server.firstServerName}</Keyword>
                        {server.countServerNames > 1 ? (
                          <span>
                            等{server.countServerNames}个域名{' '}
                            <a
                              href=""
                              onClick={(event) => {
                                event.preventDefault()
                                setNamesKeyword('')
                                setNamesServer({ id: server.id, name: server.name })
                              }}
                            >
                              [查看]
                            </a>
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="disabled">-</span>
                    )}

                    {server.isAuditing ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <a
                          className="ui label basic tiny red"
                          title="点击跳到审核页面"
                          href={`/servers/server/settings/serverNames?serverId=${server.id}`}
                        >
                          审核中
                          {server.auditingTime.length > 0 ? (
                            <span className="small grey">({server.auditingTime})</span>
                          ) : null}{' '}
                          &nbsp;→
                        </a>
                      </div>
                    ) : null}

                    {!server.auditingIsOk ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <a
                          className="ui label basic tiny red"
                          title="点击跳到审核页面"
                          href={`/servers/server/settings/serverNames?serverId=${server.id}`}
                        >
                          审核不通过 &nbsp;→
                        </a>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {server.ports.length === 0 ? (
                      <span>-</span>
                    ) : (
                      server.ports.map((port, index) => (
                        <div key={index}>
                          <span className="ui label basic tiny">
                            <Keyword word={keywordParam}>{port.portRange}</Keyword>
                            <span className="small">({port.protocol})</span>
                          </span>
                        </div>
                      ))
                    )}
                  </td>
                  <td className="center">
                    {server.bandwidthBits > 0 ? (
                      <span>{formatBits(server.bandwidthBits)}</span>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td className="center">
                    {server.qps !== '0' ? server.qps : <span className="disabled">-</span>}
                  </td>
                  <td className="center">
                    {server.attackQPS !== '0' ? server.attackQPS : <span className="disabled">-</span>}
                  </td>
                  <td className="center">
                    {server.isOn ? (
                      <span className="ui label green basic">已启用</span>
                    ) : (
                      <span className="ui label grey basic">已禁用</span>
                    )}
                  </td>
                  <td>
                    <a href={`/servers/server?serverId=${server.id}`}>详情</a> &nbsp;
                    <a href={`/servers/server/settings?serverId=${server.id}`}>设置</a> &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void removeServer(server)
                      }}
                    >
                      <Trash2 size={13} /> 删除
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {namesServer ? (
        <Modal title={`"${namesServer.name}"域名`} onClose={() => setNamesServer(null)} width="40em">
          <form className="ui form">
            <input
              type="text"
              placeholder="输入关键词搜索"
              value={namesKeyword}
              onChange={(event) => setNamesKeyword(event.target.value)}
              autoComplete="off"
            />
          </form>
          <div style={{ marginTop: '1em' }}>
            {visibleNames.map((name) => (
              <span
                key={name}
                className="ui label basic"
                style={{ marginBottom: '0.5em' }}
              >
                {name}
              </span>
            ))}
            {visibleNames.length === 0 ? <span className="disabled">暂时还没有域名.</span> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
