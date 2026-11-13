import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, Pin, Settings } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { useToast } from '../../components/Toast'
import { ClustersTopMenu } from './shared'

interface LatestCluster {
  id: number
  name: string
}

interface ClusterRow {
  id: number
  name: string
  installDir: string
  countAllNodes: number
  countActiveNodes: number
  countUpgradeNodes: number
  dnsDomainId: number
  dnsName: string
  dnsDomainName: string
  countServers: number
  timeZone: string
  isPinned: boolean
}

interface ClustersData {
  keyword: string
  searchType: string
  isSearching: boolean
  totalNodeClusters: number
  totalNodes: number
  latestClusters: LatestCluster[]
  countClusters: number
  countNodes: number
  page: string
  clusters: ClusterRow[]
}

function Highlight({ word, children }: { word: string; children: string }) {
  if (!word || !children) {
    return <>{children}</>
  }
  const index = children.toLowerCase().indexOf(word.toLowerCase())
  if (index < 0) {
    return <>{children}</>
  }
  return (
    <>
      {children.substring(0, index)}
      <span className="ui label small basic">{children.substring(index, index + word.length)}</span>
      {children.substring(index + word.length)}
    </>
  )
}

export function ClustersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const keyword = searchParams.get('keyword') || ''
  const searchType = searchParams.get('searchType') || ''
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [latestVisible, setLatestVisible] = useState(false)

  const query = useQuery({
    queryKey: ['clusters', keyword, searchType],
    queryFn: () => apiGet<ClustersData>('/clusters', { keyword, searchType }),
  })

  const pinMutation = useMutation({
    mutationFn: (params: { clusterId: number; isPinned: boolean }) => apiPost('/clusters/pin', params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clusters'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const showNodes = searchType === 'node'

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (keywordInput) {
      next.set('keyword', keywordInput)
    }
    if (searchType) {
      next.set('searchType', searchType)
    }
    setSearchParams(next)
  }

  return (
    <div>
      <ClustersTopMenu active="index" counts={{ totalNodeClusters: data.totalNodeClusters, totalNodes: data.totalNodes }} />

      <div className="margin" />
      <form method="get" action="/clusters" className="ui form" onSubmit={submitSearch}>
        <input type="hidden" name="searchType" value={searchType} />
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              name="keyword"
              placeholder="集群、节点关键词"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
          </div>
          {data.latestClusters.length > 0 ? (
            <div className="ui field">
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setLatestVisible(!latestVisible)
                }}
              >
                常用
              </a>
            </div>
          ) : null}
        </div>
      </form>

      {latestVisible ? (
        <div className="ui segment">
          常用集群：
          {data.latestClusters.map((cluster, index) => (
            <span key={cluster.id}>
              <a href={`/clusters/cluster?clusterId=${cluster.id}`}>{cluster.name}</a> &nbsp;
              {index !== data.latestClusters.length - 1 ? <span className="disabled">|</span> : null} &nbsp;
            </span>
          ))}
        </div>
      ) : null}

      {data.isSearching ? (
        <div className="ui tabular menu">
          <a className={`item${!showNodes ? ' active' : ''}`} href={`/clusters?searchType=cluster&keyword=${encodeURIComponent(keyword)}`}>
            集群({data.countClusters})
          </a>
          <a className={`item${showNodes ? ' active' : ''}`} href={`/clusters/nodes?keyword=${encodeURIComponent(keyword)}`}>
            节点({data.countNodes})
          </a>
        </div>
      ) : null}

      {showNodes ? (
        <div className="ui message">
          请前往<a href={`/clusters/nodes?keyword=${encodeURIComponent(keyword)}`}>节点搜索页面</a>查看节点搜索结果。
        </div>
      ) : (
        <div>
          <div className="margin" />
          {data.clusters.length === 0 ? <p className="comment">暂时还没有集群。</p> : null}
          {data.clusters.length > 0 ? (
            <table className="ui table selectable celled">
              <thead>
                <tr>
                  <th>集群名称</th>
                  <th className="center width10">节点数</th>
                  <th className="center width10">在线节点数</th>
                  <th className="center width10">网站数</th>
                  <th>DNS域名</th>
                  <th className="two op">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.clusters.map((cluster) => (
                  <tr key={cluster.id}>
                    <td className="cluster-name-td">
                      <a href={`/clusters/cluster?clusterId=${cluster.id}`}>
                        <Highlight word={keyword}>{cluster.name}</Highlight>
                      </a>{' '}
                      <a href={`/clusters/cluster/settings?clusterId=${cluster.id}`} title="设置">
                        <Settings size={13} style={{ color: 'grey' }} />
                      </a>
                      {cluster.timeZone ? (
                        <div>
                          <span className="ui label tiny basic grey">时区：{cluster.timeZone}</span>
                        </div>
                      ) : null}
                      {cluster.isPinned ? (
                        <a
                          href=""
                          title="取消置顶"
                          onClick={(event) => {
                            event.preventDefault()
                            pinMutation.mutate({ clusterId: cluster.id, isPinned: false })
                          }}
                        >
                          <Pin size={13} /> 已置顶
                        </a>
                      ) : (
                        <a
                          href=""
                          title="置顶"
                          onClick={(event) => {
                            event.preventDefault()
                            pinMutation.mutate({ clusterId: cluster.id, isPinned: true })
                          }}
                        >
                          <Pin size={13} /> 置顶
                        </a>
                      )}
                    </td>
                    <td className="center">
                      {cluster.countAllNodes > 0 ? (
                        <a href={`/clusters/cluster/nodes?clusterId=${cluster.id}`}>
                          <span className={cluster.countAllNodes > cluster.countActiveNodes ? 'red' : undefined}>{cluster.countAllNodes}</span>
                        </a>
                      ) : (
                        <span className="disabled">-</span>
                      )}
                      {cluster.countUpgradeNodes > 0 ? (
                        <div style={{ marginTop: '0.5em' }}>
                          <a href={`/clusters/cluster/upgradeRemote?clusterId=${cluster.id}`} title="点击进入远程升级页面">
                            <span className="red">有节点需要升级</span>
                          </a>
                        </div>
                      ) : null}
                    </td>
                    <td className="center">
                      {cluster.countActiveNodes > 0 ? (
                        <a href={`/clusters/cluster/nodes?clusterId=${cluster.id}&activeState=1`}>
                          <span className="green">{cluster.countActiveNodes}</span>
                        </a>
                      ) : (
                        <span className="disabled">-</span>
                      )}
                    </td>
                    <td className="center">{cluster.countServers > 0 ? cluster.countServers : <span className="disabled">-</span>}</td>
                    <td>
                      {cluster.dnsName ? (
                        <span>
                          <var>
                            <Highlight word={keyword}>{cluster.dnsName}</Highlight>
                          </var>
                          .
                          {cluster.dnsDomainName ? (
                            <span>{cluster.dnsDomainName}</span>
                          ) : (
                            <span className="disabled">主域名</span>
                          )}
                          {cluster.dnsDomainId > 0 ? (
                            <a href={`/dns/clusters/cluster?clusterId=${cluster.id}`} title="DNS">
                              <ExternalLink size={12} style={{ color: 'grey' }} />
                            </a>
                          ) : null}
                        </span>
                      ) : (
                        <span className="disabled">-</span>
                      )}
                    </td>
                    <td>
                      <a href={`/clusters/cluster?clusterId=${cluster.id}`}>详情</a> &nbsp;
                      <a href={`/clusters/cluster/settings?clusterId=${cluster.id}`}>设置</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      )}

      <LegacyPagination html={data.page} />
    </div>
  )
}
