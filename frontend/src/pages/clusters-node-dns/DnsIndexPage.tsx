import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { MenuLinks, Modal } from './ui'
import { UpdateClusterDNSForm } from './dnsForms'
import type { DNSIndexData } from './shared'

export function DnsIndexPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [draft, setDraft] = useState(keyword)
  const [updatingClusterId, setUpdatingClusterId] = useState(0)

  const query = useQuery({
    queryKey: ['dns-clusters', keyword, page],
    queryFn: () => apiGet<DNSIndexData>('/dns', { keyword: keyword || undefined, page: page > 1 ? page : undefined }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (draft) {
      next.set('keyword', draft)
    }
    setSearchParams(next)
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns', active: true },
          { name: 'DNS服务商', to: '/dns/providers' },
          { name: '问题修复', to: '/dns/issues' },
          { name: '同步任务', to: '/dns/tasks/listPopup' },
        ]}
      />
      <div className="margin" />

      <form className="ui form" onSubmit={submit}>
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="集群、域名..." value={draft} onChange={(event) => setDraft(event.target.value)} />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {keyword ? <Link to="/dns">[清除条件]</Link> : null}
          </div>
        </div>
      </form>

      {data.clusters.length === 0 ? (
        <p className="comment" style={{ marginTop: '1em' }}>
          暂时还没有集群。
        </p>
      ) : null}

      {data.clusters.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>集群</th>
              <th>子域名</th>
              <th>DNS服务商</th>
              <th>DNS服务商账号</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td>
                  <Link to={`/dns/clusters/cluster?clusterId=${cluster.id}`}>{cluster.name}</Link>
                  &nbsp;
                  <Link to={`/clusters/cluster?clusterId=${cluster.id}`} title="集群管理">
                    »
                  </Link>
                </td>
                <td>
                  {cluster.dnsName && cluster.domainName ? (
                    <span>
                      <em>{cluster.dnsName}</em>.{cluster.domainName}
                    </span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td>{cluster.providerTypeName ? cluster.providerTypeName : <span className="disabled">-</span>}</td>
                <td>
                  {cluster.providerName ? (
                    <span>
                      {cluster.providerName}
                      <Link to={`/dns/providers/provider?providerId=${cluster.providerId}`}> »</Link>
                    </span>
                  ) : (
                    <span className="disabled">-</span>
                  )}
                </td>
                <td>
                  <Link to={`/dns/clusters/cluster?clusterId=${cluster.id}`}>详情</Link> &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); setUpdatingClusterId(cluster.id) }}>
                    修改
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {data.clusters.length > 0 ? <p className="comment">这里列出了所有集群对应的域名设置。</p> : null}

      <LegacyPagination html={data.page} />

      {updatingClusterId > 0 ? (
        <Modal title="修改集群DNS设置" onClose={() => setUpdatingClusterId(0)}>
          <UpdateClusterDNSForm
            clusterId={updatingClusterId}
            onSaved={() => {
              setUpdatingClusterId(0)
              void queryClient.invalidateQueries({ queryKey: ['dns-clusters'] })
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
