import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { ClustersTopMenu } from './shared'

interface CreateData {
  hasDomains: boolean
  totalNodeClusters: number
  totalNodes: number
  defaultDNSName: string
  dnsName: string
}

interface CachePoliciesData {
  cachePolicies: { id: number; name: string }[]
}

interface FirewallPoliciesData {
  policies: { id: number; name: string }[]
}

interface GrantsData {
  grants: { id: number; name: string; username: string }[]
}

interface DomainsData {
  domains: { id: number; name: string }[]
}

export function ClusterCreatePage() {
  const toast = useToast()
  const query = useQuery({ queryKey: ['cluster-create'], queryFn: () => apiGet<CreateData>('/clusters/create') })
  const cacheQuery = useQuery({
    queryKey: ['cache-policies'],
    queryFn: () => apiGet<CachePoliciesData>('/servers/components/cache/selectPopup', { pageSize: 1000 }),
  })
  const wafQuery = useQuery({
    queryKey: ['waf-policies'],
    queryFn: () => apiGet<FirewallPoliciesData>('/servers/components/waf/selectPopup', { pageSize: 1000 }),
  })
  const grantsQuery = useQuery({
    queryKey: ['grant-options'],
    queryFn: () => apiGet<GrantsData>('/clusters/grants/selectPopup'),
  })
  const domainsQuery = useQuery({
    queryKey: ['domain-options'],
    queryFn: () => apiPost<DomainsData>('/dns/domainOptions', {}),
  })

  const [name, setName] = useState('')
  const [cachePolicyId, setCachePolicyId] = useState(0)
  const [firewallPolicyId, setFirewallPolicyId] = useState(0)
  const [matchDomainStrictly, setMatchDomainStrictly] = useState(false)
  const [grantId, setGrantId] = useState(0)
  const [installDir, setInstallDir] = useState('')
  const [systemdServiceIsOn] = useState(true)
  const [autoInstallNftables, setAutoInstallNftables] = useState(false)
  const [autoSystemTuning, setAutoSystemTuning] = useState(false)
  const [autoTrimDisks, setAutoTrimDisks] = useState(false)
  const [dnsDomainId, setDnsDomainId] = useState(0)
  const [dnsName, setDnsName] = useState('')
  const [dnsTTL, setDnsTTL] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setDnsName(query.data.dnsName)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const resp = await apiPost<{ clusterId: number }>('/clusters', {
        name,
        cachePolicyId,
        httpFirewallPolicyId: firewallPolicyId,
        matchDomainStrictly: matchDomainStrictly ? 1 : '',
        grantId,
        installDir,
        systemdServiceIsOn: systemdServiceIsOn ? 1 : '',
        autoInstallNftables: autoInstallNftables ? 1 : '',
        autoSystemTuning: autoSystemTuning ? 1 : '',
        autoTrimDisks: autoTrimDisks ? 1 : '',
        dnsDomainId,
        dnsName,
        dnsTTL,
      })
      toast('集群创建成功')
      window.location.hash = `#/clusters/cluster/nodes?clusterId=${resp.clusterId}`
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const domainName = domainsQuery.data?.domains.find((domain) => domain.id === dnsDomainId)?.name || ''

  return (
    <div>
      <ClustersTopMenu active="create" counts={{ totalNodeClusters: data.totalNodeClusters, totalNodes: data.totalNodes }} />
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="集群名称 *">
            <TextInput type="text" name="name" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </FormRow>
          <FormRow title="默认缓存设置">
            <Select value={cachePolicyId} onChange={(event) => setCachePolicyId(Number(event.target.value))}>
              <option value="0">[不使用]</option>
              {cacheQuery.data?.cachePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </Select>
            <p className="comment">为可选项。集群中的网站可以自行设置是否启用此设置。</p>
          </FormRow>
          <FormRow title="默认WAF设置">
            <Select value={firewallPolicyId} onChange={(event) => setFirewallPolicyId(Number(event.target.value))}>
              <option value="0">[不使用]</option>
              {wafQuery.data?.policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </Select>
            <p className="comment">为可选项。集群中的网站可以自行设置是否启用此设置。</p>
          </FormRow>
          <FormRow title="只允许绑定的域名访问">
            <Checkbox label="" checked={matchDomainStrictly} onChange={setMatchDomainStrictly} />
            <p className="comment">选中后，表示只有已经绑定的域名才允许访问；不选中表示访问一个不存在的域名时默认选择第一个网站。</p>
          </FormRow>
        </FormTable>

        <h4>
          节点安装选项 &nbsp;<span className="grey small">（可选）</span>
        </h4>
        <FormTable>
          <FormRow title="默认SSH登录方式">
            <Select value={grantId} onChange={(event) => setGrantId(Number(event.target.value))}>
              <option value="0">[不使用]</option>
              {grantsQuery.data?.grants.map((grant) => (
                <option key={grant.id} value={grant.id}>
                  {grant.name}
                  {grant.username ? `（${grant.username}）` : ''}
                </option>
              ))}
            </Select>
            <p className="comment">当前集群下节点统一的登录设置；当节点没有单独设置SSH登录方式时，默认使用此设置。</p>
          </FormRow>
          <FormRow title="节点安装目录">
            <TextInput type="text" maxLength={100} value={installDir} onChange={(event) => setInstallDir(event.target.value)} />
            <p className="comment">当节点没有单独设置安装目录时，默认使用此设置。如果集群和节点都没有设置安装目录，则使用登录用户HOME路径/edge-node目录。</p>
          </FormRow>
          <FormRow title="自动安装nftables">
            <Checkbox label="" checked={autoInstallNftables} onChange={setAutoInstallNftables} />
            <p className="comment">选中后，表示在Linux系统中自动尝试安装 nftables 用于安全防御。</p>
          </FormRow>
          <FormRow title="自动调节系统参数">
            <Checkbox label="" checked={autoSystemTuning} onChange={setAutoSystemTuning} />
            <p className="comment">选中后，表示自动调整Linux内核等参数，以便提升性能。</p>
          </FormRow>
          <FormRow title="自动执行硬盘TRIM">
            <Checkbox label="" checked={autoTrimDisks} onChange={setAutoTrimDisks} />
            <p className="comment">执行TRIM后可以移除SSD硬盘中无效的数据，从而显著提升SSD硬盘写入性能。</p>
          </FormRow>
        </FormTable>

        <h4>
          DNS设置选项 &nbsp;<span className="grey small">（可选）</span>
        </h4>
        <FormTable>
          {data.hasDomains ? (
            <FormRow title="选择主域名">
              <Select value={dnsDomainId} onChange={(event) => setDnsDomainId(Number(event.target.value))}>
                <option value="0">[不使用主域名]</option>
                {domainsQuery.data?.domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </Select>
              <p className="comment">用于生成集群节点和网站的CNAME和DNS解析记录。</p>
            </FormRow>
          ) : null}
          <FormRow title="DNS子域名">
            <div className="ui input right labeled">
              <TextInput type="text" maxLength={64} style={{ width: '10em' }} value={dnsName} onChange={(event) => setDnsName(event.target.value)} />
              <span className="ui label">{domainName ? `.${domainName}` : '.主域名'}</span>
            </div>
            <p className="comment">
              {dnsName === data.defaultDNSName ? <span className="red">当前已为你生成默认的子域名。</span> : null}
              当前集群的子域名，和主域名一起组成集群节点的子域名。
            </p>
          </FormRow>
          <FormRow title="解析记录TTL">
            <div className="ui input right labeled">
              <TextInput type="text" maxLength={6} style={{ width: '6em' }} value={dnsTTL} onChange={(event) => setDnsTTL(event.target.value)} />
              <span className="ui label">秒</span>
            </div>
            <p className="comment">生成解析记录时使用的TTL；0表示使用默认。</p>
          </FormRow>
        </FormTable>

        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}

interface ClusterOptionsData {
  totalNodeClusters: number
  totalNodes: number
}

export function ClusterCreateNodeIndexPage() {
  const clustersQuery = useQuery({
    queryKey: ['cluster-options'],
    queryFn: () => apiGet<{ clusters: { id: number; name: string }[] }>('/clusters/selectPopup', { pageSize: 1000 }),
  })
  const dataQuery = useQuery({ queryKey: ['clusters-createNode'], queryFn: () => apiGet<ClusterOptionsData>('/clusters/createNode') })
  const [clusterId, setClusterId] = useState(0)

  if (clustersQuery.isLoading || dataQuery.isLoading) {
    return <LoadingBlock />
  }
  const clusters = clustersQuery.data?.clusters || []

  if (clusters.length === 1) {
    return <Navigate to={`/clusters/cluster/createNode?clusterId=${clusters[0].id}`} replace />
  }

  return (
    <div>
      <ClustersTopMenu active="createNode" counts={{ totalNodeClusters: dataQuery.data?.totalNodeClusters, totalNodes: dataQuery.data?.totalNodes }} />
      <div className="margin" />
      <form className="ui form">
        <FormTable>
          <FormRow title="选择所属集群 *">
            <Select value={clusterId} onChange={(event) => setClusterId(Number(event.target.value))}>
              <option value="0">[请选择]</option>
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </Select>
          </FormRow>
        </FormTable>
        <button
          type="button"
          className={`ui button primary${clusterId <= 0 ? ' disabled' : ''}`}
          onClick={() => {
            if (clusterId > 0) {
              window.location.hash = `#/clusters/cluster/createNode?clusterId=${clusterId}`
            }
          }}
        >
          下一步 »
        </button>
      </form>
    </div>
  )
}

interface SelectPopupData {
  keyword: string
  page: string
  clusters: { id: number; name: string; isOn: boolean; countNodes: number; isSelected: boolean }[]
}

export function ClusterSelectPopupPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const [keywordInput, setKeywordInput] = useState(keyword)
  const query = useQuery({
    queryKey: ['cluster-select-popup', keyword],
    queryFn: () => apiGet<SelectPopupData>('/clusters/selectPopup', { keyword }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data

  return (
    <div>
      <h3>选择集群</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          const next = new URLSearchParams()
          if (keywordInput) {
            next.set('keyword', keywordInput)
          }
          setSearchParams(next)
        }}
      >
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="名称..." value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} autoFocus />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
          </div>
        </div>
      </form>

      {data.clusters.length === 0 ? <p className="comment">没有找到相应的集群。</p> : null}
      {data.clusters.length > 0 ? (
        <table className="ui table celled selectable">
          <thead>
            <tr>
              <th>集群名称</th>
              <th>节点数</th>
              <th className="two wide">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td>{cluster.name}</td>
                <td>{cluster.countNodes}</td>
                <td>{cluster.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
                <td>
                  {cluster.isSelected ? (
                    <span className="disabled">已选择</span>
                  ) : (
                    <a href={`#/clusters/cluster?clusterId=${cluster.id}`}>选择</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={data.page} />
    </div>
  )
}
