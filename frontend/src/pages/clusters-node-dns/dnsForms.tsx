import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { Checkbox, FormRow, FormTable, Select } from '../../components/form'
import { DnsRoutesSelector, ValueList } from './ui'
import {
  postForm,
  type DNSDomainClustersData,
  type DNSDomainFormData,
  type DNSDomainNodesData,
  type DNSDomainServersData,
  type DNSIssueNodePopupData,
  type DNSRouteListData,
  type DomainSelectResult,
  type DnsRouteOption,
  type OptionsDomainData,
  type OptionsProviderData,
  type UpdateClusterDNSData,
} from './shared'

export function UpdateClusterDNSForm({ clusterId, onSaved }: { clusterId: number; onSaved: () => void }) {
  const session = useSession()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['update-cluster-dns', clusterId],
    queryFn: () => apiGet<UpdateClusterDNSData>('/dns/updateClusterPopup', { clusterId }),
    enabled: clusterId > 0,
  })

  const [providerType, setProviderType] = useState('')
  const [providerId, setProviderId] = useState(0)
  const [domainId, setDomainId] = useState(0)
  const [domainName, setDomainName] = useState('')
  const [dnsName, setDnsName] = useState('')
  const [cnameRecords, setCnameRecords] = useState<string[]>([])
  const [ttl, setTtl] = useState('0')
  const [cnameAsDomain, setCnameAsDomain] = useState(false)
  const [sharedCNAME, setSharedCNAME] = useState(false)
  const [includingLnNodes, setIncludingLnNodes] = useState(false)
  const [nodesAutoSync, setNodesAutoSync] = useState(false)
  const [serversAutoSync, setServersAutoSync] = useState(false)
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const providersQuery = useQuery({
    queryKey: ['dns-provider-options', providerType],
    queryFn: () => apiPost<OptionsProviderData>('/dns/providerOptions', { type: providerType }),
    enabled: providerType.length > 0,
  })
  const domainsQuery = useQuery({
    queryKey: ['dns-domain-options', providerId],
    queryFn: () => apiPost<OptionsDomainData>('/dns/domainOptions', { providerId }),
    enabled: providerId > 0,
  })

  useEffect(() => {
    if (query.data && !initialized) {
      const data = query.data
      setProviderType(data.providerType || (data.providerTypes[0] ? data.providerTypes[0].code : ''))
      setProviderId(data.providerId || 0)
      setDomainId(data.domainId || 0)
      setDomainName(data.domain || '')
      setDnsName(data.dnsName || '')
      setCnameRecords(data.cnameRecords || [])
      setTtl(String(data.ttl || 0))
      setCnameAsDomain(data.cnameAsDomain)
      setSharedCNAME(data.sharedCNAME)
      setIncludingLnNodes(data.includingLnNodes)
      setNodesAutoSync(data.nodesAutoSync)
      setServersAutoSync(data.serversAutoSync)
      setInitialized(true)
    }
  }, [query.data, initialized])

  useEffect(() => {
    if (!providersQuery.data) {
      return
    }
    const list = providersQuery.data.providers
    if (list.length === 0) {
      setProviderId(0)
      return
    }
    if (!list.some((provider) => provider.id === providerId)) {
      setProviderId(list[0].id)
    }
  }, [providersQuery.data, providerId])

  useEffect(() => {
    if (!domainsQuery.data) {
      return
    }
    const list = domainsQuery.data.domains
    if (list.length === 0) {
      setDomainId(0)
      setDomainName('')
      return
    }
    const found = list.find((domain) => domain.id === domainId)
    if (!found) {
      setDomainId(list[0].id)
      setDomainName(list[0].name)
    } else {
      setDomainName(found.name)
    }
  }, [domainsQuery.data, domainId])

  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <div className="loading-block">加载中...</div>
  }
  if (!query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const providers = providersQuery.data?.providers || []
  const domains = domainsQuery.data?.domains || []
  const isPlus = session.data?.teaIsPlus ?? false

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!dnsName.trim()) {
      toast('请输入子域名', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postForm(
        '/dns/updateClusterPopup',
        {
          clusterId,
          dnsName: dnsName.trim(),
          domainId,
          nodesAutoSync,
          serversAutoSync,
          cnameRecords,
          ttl: Number(ttl) || 0,
          cnameAsDomain: sharedCNAME ? false : cnameAsDomain,
          sharedCNAME,
          includingLnNodes,
        },
        true,
      )
      toast('保存成功')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="DNS服务商">
          <Select
            value={providerType}
            onChange={(event) => {
              setProviderType(event.target.value)
              setProviderId(0)
              setDomainId(0)
            }}
          >
            {data.providerTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow title="账号">
          {providers.length === 0 ? <p className="comment">没有账号可选</p> : null}
          <Select value={String(providerId)} onChange={(event) => { setProviderId(Number(event.target.value)); setDomainId(0) }}>
            <option value="0">[请选择]</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
          <p className="comment">
            <a href="/dns/providers">去管理DNS服务商账号»</a>
          </p>
        </FormRow>
        {providerId > 0 ? (
          <FormRow title="域名">
            {domains.length === 0 ? <p className="comment">没有域名可选</p> : null}
            <Select value={String(domainId)} onChange={(event) => setDomainId(Number(event.target.value))}>
              <option value="0">[请选择]</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </Select>
          </FormRow>
        ) : null}
        <FormRow title="子域名">
          <div className="ui input right labeled">
            <input type="text" maxLength={64} size={20} style={{ width: '10em' }} value={dnsName} onChange={(event) => setDnsName(event.target.value)} />
            <span className="ui label">.{domainName || '主域名'}</span>
          </div>
          <p className="comment">子域名和主域名共同组成集群的域名.</p>
        </FormRow>
        <FormRow title="共用CNAME">
          <Checkbox
            checked={sharedCNAME}
            onChange={(checked) => {
              setSharedCNAME(checked)
              if (checked) {
                setCnameAsDomain(false)
              }
            }}
          />
          <p className="comment">所有网站使用子域名作为CNAME, 不再为每个网站生成独立的CNAME.</p>
        </FormRow>
        <FormRow title="自动设置CNAME记录">
          <ValueList values={cnameRecords} onChange={setCnameRecords} placeholder="记录名" />
          <p className="comment">
            除集群已创建的网站之外,自动解析到集群的CNAME记录,比如
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                if (!cnameRecords.includes('www')) {
                  setCnameRecords([...cnameRecords, 'www'])
                }
              }}
            >
              www
            </a>
            .
          </p>
        </FormRow>
        <tr>
          <td colSpan={2}>
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setMoreOptionsVisible(!moreOptionsVisible)
              }}
            >
              {moreOptionsVisible ? '收起更多选项' : '更多选项'}
            </a>
          </td>
        </tr>
        {moreOptionsVisible ? (
          <>
            {!sharedCNAME ? (
              <FormRow title="允许通过CNAME访问网站">
                <Checkbox checked={cnameAsDomain} onChange={setCnameAsDomain} />
                <p className="comment">选中后,表示允许使用CNAME直接访问网站;如果取消选中,则表示CNAME只作为DNS解析记录使用.</p>
              </FormRow>
            ) : null}
            {isPlus ? (
              <FormRow title="包含Ln节点">
                <Checkbox checked={includingLnNodes} onChange={setIncludingLnNodes} />
                <p className="comment">选中后,表示域名解析中包含L2及以上级别节点,也就意味着用户请求可能会被分配到这些节点.</p>
              </FormRow>
            ) : null}
            <FormRow title="记录TTL">
              <div className="ui input right labeled">
                <input type="text" maxLength={6} style={{ width: '6em' }} value={ttl} onChange={(event) => setTtl(event.target.value)} />
                <span className="ui label">秒</span>
              </div>
              <p className="comment">每个DNS服务商或者账号的TTL限制各有不同,请注意取值范围;修改后,只对新的解析记录生效.0表示使用默认.</p>
            </FormRow>
            <FormRow title="同步节点DNS状态">
              <Checkbox checked={nodesAutoSync} onChange={setNodesAutoSync} />
            </FormRow>
            <FormRow title="同步网站DNS状态">
              <Checkbox checked={serversAutoSync} onChange={setServersAutoSync} />
            </FormRow>
          </>
        ) : null}
      </FormTable>

      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function UpdateNodeDNSForm({
  clusterId,
  nodeId,
  ipAddrId,
  onSaved,
}: {
  clusterId: number
  nodeId: number
  ipAddrId?: number
  onSaved: () => void
}) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['dns-update-node-dns', clusterId, nodeId, ipAddrId],
    queryFn: () => apiGet<DNSIssueNodePopupData>('/dns/issues/updateNodePopup', { clusterId, nodeId, ipAddrId: ipAddrId || 0 }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [ipAddr, setIpAddr] = useState('')
  const [domainId, setDomainId] = useState(0)
  const [domainName, setDomainName] = useState('')
  const [allRoutes, setAllRoutes] = useState<DnsRouteOption[]>([])
  const [routes, setRoutes] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setIpAddr(query.data.ipAddr || '')
      setDomainId(query.data.domainId || 0)
      setDomainName(query.data.domainName || '')
      setAllRoutes(query.data.allRoutes || [])
      setRoutes((query.data.routes || []).map((route) => `${route.code}@${route.domainId}`))
      setInitialized(true)
    }
  }, [query.data, initialized])

  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <div className="loading-block">加载中...</div>
  }
  if (!query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function syncDomain() {
    try {
      await postForm('/dns/issues/syncDomain', { domainId })
      toast('从服务商获取线路成功')
      const refreshed = await apiGet<DNSIssueNodePopupData>('/dns/issues/updateNodePopup', { clusterId, nodeId, ipAddrId: ipAddrId || 0 })
      setAllRoutes(refreshed.allRoutes || [])
      setRoutes((refreshed.routes || []).map((route) => `${route.code}@${route.domainId}`))
      setDomainId(refreshed.domainId || 0)
      setDomainName(refreshed.domainName || '')
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败', 'error')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ipAddr.trim()) {
      toast('请输入IP地址', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postForm(
        '/dns/issues/updateNodePopup',
        {
          nodeId,
          ipAddr: ipAddr.trim(),
          ipAddrId: ipAddrId || 0,
          domainId,
          dnsRoutesJSON: JSON.stringify(routes),
        },
        true,
      )
      toast('保存成功')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <h3>修改节点DNS设置</h3>
      <FormTable>
        {domainName ? (
          <FormRow title="主域名">
            {domainName}
            <p className="comment">由当前节点所属集群设置.</p>
          </FormRow>
        ) : null}
        <FormRow title="IP地址 *">
          <input type="text" maxLength={64} value={ipAddr} onChange={(event) => setIpAddr(event.target.value)} />
          <p className="comment">用于域名解析的节点IP地址.</p>
        </FormRow>
        {domainId > 0 ? (
          <FormRow title="线路">
            {allRoutes.length === 0 ? (
              <p className="comment">
                没有可选的线路.
                <a href="" onClick={(event) => { event.preventDefault(); void syncDomain() }}>
                  [获取线路]
                </a>
              </p>
            ) : (
              <div>
                <DnsRoutesSelector allRoutes={allRoutes} value={routes} onChange={setRoutes} />
                <p className="comment">
                  当前节点IP对应的线路.
                  <a href="" onClick={(event) => { event.preventDefault(); void syncDomain() }}>
                    [重新获取线路]
                  </a>
                </p>
              </div>
            )}
          </FormRow>
        ) : (
          <FormRow title="线路">
            <span className="disabled">当前集群没有选择域名.</span>
          </FormRow>
        )}
      </FormTable>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function CreateDomainForm({ providerId, onSaved }: { providerId: number; onSaved: () => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入域名', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postForm('/dns/domains/createPopup', { providerId, name: name.trim() }, true)
      toast('保存成功')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <h3>添加管理域名</h3>
      <FormTable>
        <FormRow title="域名 *">
          <input type="text" maxLength={64} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <p className="comment">在DNS服务商中可以管理的域名.</p>
        </FormRow>
      </FormTable>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function UpdateDomainForm({ domainId, onSaved }: { domainId: number; onSaved: () => void }) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['dns-domain-update', domainId],
    queryFn: () => apiGet<DNSDomainFormData>('/dns/domains/updatePopup', { domainId }),
    enabled: domainId > 0,
  })
  const [name, setName] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.domain && !initialized) {
      setName(query.data.domain.name)
      setIsOn(query.data.domain.isOn)
      setInitialized(true)
    }
  }, [query.data, initialized])

  if (query.isLoading || !initialized) {
    return <div className="loading-block">加载中...</div>
  }
  if (query.isError || !query.data?.domain) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await postForm('/dns/domains/updatePopup', { domainId, name: name.trim(), isOn }, true)
      toast('保存成功')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <h3>修改域名</h3>
      <FormTable>
        <FormRow title="域名 *">
          <input type="text" maxLength={64} value={name} onChange={(event) => setName(event.target.value)} />
        </FormRow>
        <FormRow title="是否启用">
          <Checkbox checked={isOn} onChange={setIsOn} />
        </FormRow>
      </FormTable>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        保存
      </button>
    </form>
  )
}

export function DomainRoutesContent({ domainId }: { domainId: number }) {
  const query = useQuery({
    queryKey: ['dns-domain-routes', domainId],
    queryFn: () => apiGet<DNSRouteListData>('/dns/domains/routesPopup', { domainId }),
  })
  if (query.isLoading) {
    return <div>加载中...</div>
  }
  const routes = query.data?.routes || []
  return (
    <div>
      <h3>域名支持的线路</h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td className="title">线路</td>
            <td>
              {routes.length === 0 ? <p className="comment">暂时还没有支持的线路.</p> : null}
              {routes.map((route) => (
                <span key={route.code} className="ui label tiny basic" style={{ marginBottom: '0.5em' }}>
                  {route.name}
                  {route.code && route.code !== route.name ? <span> ({route.code})</span> : null}
                </span>
              ))}
              <p className="comment">注意:有些DNS服务商会根据账号的会员级别等限制线路的使用.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function DomainClustersContent({ domainId }: { domainId: number }) {
  const query = useQuery({
    queryKey: ['dns-domain-clusters', domainId],
    queryFn: () => apiGet<DNSDomainClustersData>('/dns/domains/clustersPopup', { domainId }),
  })
  if (query.isLoading) {
    return <div>加载中...</div>
  }
  const data = query.data
  if (!data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>使用域名"{data.domain}"的集群</h3>
      <table className="ui table selectable">
        <thead>
          <tr>
            <th>集群</th>
            <th>域名</th>
            <th>解析状态</th>
          </tr>
        </thead>
        <tbody>
          {data.clusters.map((cluster) => (
            <tr key={cluster.id}>
              <td>
                <a href={`/clusters/cluster?clusterId=${cluster.id}`} target="_blank" rel="noreferrer">
                  {cluster.name}
                </a>
              </td>
              <td>
                {cluster.dnsName}.{data.domain}
              </td>
              <td>{cluster.isOk ? <span className="green">已解析</span> : <span className="red">未解析</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DomainNodesContent({ domainId }: { domainId: number }) {
  const query = useQuery({
    queryKey: ['dns-domain-nodes', domainId],
    queryFn: () => apiGet<DNSDomainNodesData>('/dns/domains/nodesPopup', { domainId }),
  })
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  if (query.isLoading) {
    return <div>加载中...</div>
  }
  const data = query.data
  if (!data) {
    return <div className="ui negative message">加载失败</div>
  }
  const rows: { clusterName: string; clusterId: number; dnsName: string; node: DNSDomainNodesData['clusters'][number]['nodes'][number] }[] = []
  for (const cluster of data.clusters) {
    for (const node of cluster.nodes) {
      rows.push({ clusterName: cluster.name, clusterId: cluster.id, dnsName: cluster.dnsName, node })
    }
  }
  const lower = keyword.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    if (lower) {
      const haystack = [row.clusterName, row.dnsName, row.node.name, row.node.ipAddr, row.node.route.name].join(' ').toLowerCase()
      if (!haystack.includes(lower)) {
        return false
      }
    }
    if (status === 'ok' && !row.node.isOk) {
      return false
    }
    if (status === 'notOk' && row.node.isOk) {
      return false
    }
    return true
  })

  return (
    <div>
      <h3>使用域名"{data.domain}"的节点</h3>
      <div className="ui fields inline">
        <div className="ui field">
          <input type="text" placeholder="关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </div>
        <div className="ui field">
          <select className="ui dropdown auto-width" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">[全部状态]</option>
            <option value="ok">已解析</option>
            <option value="notOk">未解析</option>
          </select>
        </div>
      </div>
      <div className="ui divider" />
      <table className="ui table selectable">
        <thead>
          <tr>
            <th>集群</th>
            <th>节点</th>
            <th>子域名</th>
            <th>线路</th>
            <th>IP</th>
            <th>解析状态</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, index) => (
            <tr key={`${row.node.id}-${row.node.route.code}-${index}`}>
              <td>
                <a href={`/clusters/cluster?clusterId=${row.clusterId}`} target="_blank" rel="noreferrer">
                  {row.clusterName}
                </a>
              </td>
              <td>
                <a href={`/clusters/cluster/node?clusterId=${row.clusterId}&nodeId=${row.node.id}`} target="_blank" rel="noreferrer">
                  {row.node.name}
                </a>
              </td>
              <td>{row.dnsName}</td>
              <td>{row.node.route.name}</td>
              <td>{row.node.ipAddr}</td>
              <td>{row.node.isOk ? <span className="green">已解析</span> : <span className="red">未解析</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DomainServersContent({ domainId }: { domainId: number }) {
  const query = useQuery({
    queryKey: ['dns-domain-servers', domainId],
    queryFn: () => apiGet<DNSDomainServersData>('/dns/domains/serversPopup', { domainId }),
  })
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  if (query.isLoading) {
    return <div>加载中...</div>
  }
  const data = query.data
  if (!data) {
    return <div className="ui negative message">加载失败</div>
  }
  const rows: { clusterName: string; clusterId: number; dnsName: string; server: DNSDomainServersData['clusters'][number]['servers'][number] }[] = []
  for (const cluster of data.clusters) {
    for (const server of cluster.servers) {
      rows.push({ clusterName: cluster.name, clusterId: cluster.id, dnsName: cluster.dnsName, server })
    }
  }
  const lower = keyword.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    if (lower) {
      const haystack = [row.clusterName, row.dnsName, row.server.name, row.server.dnsName].join(' ').toLowerCase()
      if (!haystack.includes(lower)) {
        return false
      }
    }
    if (status === 'ok' && !row.server.isOk) {
      return false
    }
    if (status === 'notOk' && row.server.isOk) {
      return false
    }
    return true
  })

  return (
    <div>
      <h3>使用域名"{data.domain}"的网站</h3>
      <div className="ui fields inline">
        <div className="ui field">
          <input type="text" placeholder="关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </div>
        <div className="ui field">
          <select className="ui dropdown auto-width" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">[全部状态]</option>
            <option value="ok">已解析</option>
            <option value="notOk">未解析</option>
          </select>
        </div>
      </div>
      <div className="ui divider" />
      <table className="ui table selectable">
        <thead>
          <tr>
            <th>集群</th>
            <th>网站</th>
            <th>子域名</th>
            <th>CNAME</th>
            <th>解析状态</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, index) => (
            <tr key={`${row.server.id}-${index}`}>
              <td>
                <a href={`/clusters/cluster?clusterId=${row.clusterId}`} target="_blank" rel="noreferrer">
                  {row.clusterName}
                </a>
              </td>
              <td>
                <a href={`/servers/server?clusterId=${row.clusterId}&serverId=${row.server.id}`} target="_blank" rel="noreferrer">
                  {row.server.name}
                </a>
              </td>
              <td>{row.dnsName}</td>
              <td>{row.server.dnsName}</td>
              <td>{row.server.isOk ? <span className="green">已解析</span> : <span className="red">未解析</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DomainSelectForm({ onDone }: { onDone?: (result: DomainSelectResult) => void }) {
  const toast = useToast()
  const typesQuery = useQuery({
    queryKey: ['dns-domain-select-types'],
    queryFn: () => apiGet<{ providerTypes: { name: string; code: string }[] }>('/dns/domains/selectPopup'),
  })
  const [providerType, setProviderType] = useState('')
  const [providerId, setProviderId] = useState(0)
  const [domainId, setDomainId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const providersQuery = useQuery({
    queryKey: ['dns-provider-options', providerType],
    queryFn: () => apiPost<OptionsProviderData>('/dns/providerOptions', { type: providerType }),
    enabled: providerType.length > 0,
  })
  const domainsQuery = useQuery({
    queryKey: ['dns-domain-options', providerId],
    queryFn: () => apiPost<OptionsDomainData>('/dns/domainOptions', { providerId }),
    enabled: providerId > 0,
  })

  useEffect(() => {
    if (typesQuery.data && !providerType && typesQuery.data.providerTypes.length > 0) {
      setProviderType(typesQuery.data.providerTypes[0].code)
    }
  }, [typesQuery.data, providerType])

  useEffect(() => {
    if (providersQuery.data) {
      const list = providersQuery.data.providers
      if (list.length === 0) {
        setProviderId(0)
      } else if (!list.some((provider) => provider.id === providerId)) {
        setProviderId(list[0].id)
      }
    }
  }, [providersQuery.data, providerId])

  useEffect(() => {
    if (domainsQuery.data) {
      const list = domainsQuery.data.domains
      if (list.length === 0) {
        setDomainId(0)
      } else if (!list.some((domain) => domain.id === domainId)) {
        setDomainId(list[0].id)
      }
    }
  }, [domainsQuery.data, domainId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await apiPost<DomainSelectResult>('/dns/domains/selectPopup', { domainId })
      if (onDone) {
        onDone(result)
      } else {
        toast(`已选择域名:${result.domainName || '-'}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <h3>选择集群DNS设置</h3>
      <FormTable>
        <FormRow title="DNS服务商">
          <Select
            value={providerType}
            onChange={(event) => {
              setProviderType(event.target.value)
              setProviderId(0)
              setDomainId(0)
            }}
          >
            {(typesQuery.data?.providerTypes || []).map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow title="账号">
          {(providersQuery.data?.providers || []).length === 0 ? <p className="comment">没有账号可选</p> : null}
          <Select value={String(providerId)} onChange={(event) => { setProviderId(Number(event.target.value)); setDomainId(0) }}>
            <option value="0">[请选择]</option>
            {(providersQuery.data?.providers || []).map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow title="域名">
          {(domainsQuery.data?.domains || []).length === 0 ? <p className="comment">没有域名可选</p> : null}
          <Select value={String(domainId)} onChange={(event) => setDomainId(Number(event.target.value))}>
            <option value="0">[请选择]</option>
            {(domainsQuery.data?.domains || []).map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </Select>
        </FormRow>
      </FormTable>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        确定
      </button>
    </form>
  )
}
