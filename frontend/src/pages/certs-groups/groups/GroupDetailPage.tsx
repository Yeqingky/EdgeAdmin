import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { GroupFirstMenu, Keyword, type GroupBasic } from '../shared'

interface ServerName {
  name: string
  subNames?: string[] | null
}

interface GroupServer {
  id: number
  isOn: boolean
  name: string
  cluster: { id: number; name: string }
  ports: { protocol: string; portRange: string }[]
  serverTypeName: string
  groups: { id: number; name: string }[]
  serverNames: ServerName[] | null
  countServerNames: number
  isAuditing: boolean
  auditingIsOk: boolean
  user?: { id: number; fullname: string } | null
}

interface GroupDetailData {
  group: GroupBasic
  canVisitUser: boolean
  keyword: string
  page: string
  servers: GroupServer[]
}

export function GroupDetailPage() {
  const [searchParams] = useSearchParams()
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const keyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1

  const query = useQuery({
    queryKey: ['server-group', groupId, keyword, page],
    queryFn: () => apiGet<GroupDetailData>('/servers/groups/group', { groupId, keyword, page }),
    enabled: groupId > 0,
  })

  if (groupId <= 0) {
    return <div className="ui negative message">缺少分组ID</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const group = data.group

  return (
    <div>
      <GroupFirstMenu group={group} active="index" />

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">分组名称</td>
            <td>{group.name}</td>
          </tr>
        </tbody>
      </table>

      <h3>网站</h3>

      {data.servers.length === 0 ? <p className="comment">暂时还没有网站.</p> : null}

      {data.servers.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>网站名称</th>
              <th>所属用户</th>
              <th>部署集群</th>
              <th>域名</th>
              <th>端口</th>
              <th className="two wide center">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.servers.map((server) => {
              const serverNames = server.serverNames || []
              const firstName = serverNames[0]
              return (
                <tr key={server.id}>
                  <td>
                    <a href={`/servers/server?serverId=${server.id}`}>
                      <Keyword word={keyword} text={server.name} />
                    </a>
                    <div style={{ marginTop: '0.4em' }}>
                      <span className="ui label basic tiny">{server.serverTypeName}</span>
                    </div>
                  </td>
                  <td>
                    {server.user ? (
                      <span>
                        {server.user.fullname}
                        {data.canVisitUser ? <a href={`/users/user?userId=${server.user.id}`}>[查看]</a> : null}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{server.cluster ? server.cluster.name : '-'}</td>
                  <td>
                    {firstName ? (
                      <span>
                        <Keyword
                          word={keyword}
                          text={firstName.subNames && firstName.subNames.length > 0 ? firstName.subNames[0] : firstName.name}
                        />
                        {server.countServerNames > 1 ? <span>等{server.countServerNames}个域名</span> : null}
                      </span>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                    {server.isAuditing ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <a className="ui label basic tiny red" href={`/servers/server/settings/serverNames?serverId=${server.id}`}>
                          审核中
                        </a>
                      </div>
                    ) : null}
                    {!server.auditingIsOk ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <a className="ui label basic tiny red" href={`/servers/server/settings/serverNames?serverId=${server.id}`}>
                          审核不通过
                        </a>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {server.ports.length === 0
                      ? '-'
                      : server.ports.map((port) => (
                          <div key={`${port.protocol}-${port.portRange}`}>
                            <span className="ui label tiny basic">
                              <Keyword word={keyword} text={port.portRange} />
                              <span className="small">({port.protocol})</span>
                            </span>
                          </div>
                        ))}
                  </td>
                  <td className="center">
                    {server.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}
                  </td>
                  <td>
                    <a href={`/servers/server?serverId=${server.id}`}>详情</a> &nbsp;{' '}
                    <a href={`/servers/server/settings?serverId=${server.id}`}>设置</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />
    </div>
  )
}
