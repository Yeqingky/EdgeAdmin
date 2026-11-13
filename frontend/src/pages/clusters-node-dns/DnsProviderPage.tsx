import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { MenuLinks, Modal } from './ui'
import { CreateDomainForm, DomainClustersContent, DomainNodesContent, DomainRoutesContent, DomainServersContent, UpdateDomainForm } from './dnsForms'
import { postForm, type DNSProviderData, type DNSProviderDomainItem } from './shared'

type DomainModal = { kind: 'create' } | { kind: 'update' | 'routes' | 'clusters' | 'nodes' | 'servers'; domainId: number } | null

function apiValue(params: Record<string, unknown>, key: string): ReactNode {
  const value = params[key]
  if (value === undefined || value === null || value === '') {
    return <span className="disabled">没有设置.</span>
  }
  return String(value)
}

function providerRows(provider: DNSProviderData['provider']): { label: ReactNode; value: ReactNode }[] {
  const params = provider.apiParams as Record<string, unknown>
  switch (provider.type) {
    case 'dnspod':
      return [
        { label: '密钥类型', value: params.apiType === 'tencentDNS' ? '腾讯云API密钥' : 'DNSPod Token' },
        ...(params.apiType === 'tencentDNS'
          ? [
              { label: 'SecretId', value: apiValue(params, 'accessKeyId') },
              { label: 'SecretKey', value: apiValue(params, 'accessKeySecret') },
            ]
          : [
              { label: '密钥ID', value: apiValue(params, 'id') },
              { label: '密钥Token', value: apiValue(params, 'token') },
              { label: '区域', value: params.region === 'international' ? '国际站' : '中国站' },
            ]),
      ]
    case 'alidns':
      return [
        { label: 'AccessKeyId', value: apiValue(params, 'accessKeyId') },
        { label: 'AccessKeySecret', value: apiValue(params, 'accessKeySecret') },
        { label: '区域ID', value: apiValue(params, 'regionId') },
      ]
    case 'huaweiDNS':
      return [
        { label: 'AccessKeyId', value: apiValue(params, 'accessKeyId') },
        { label: 'AccessKeySecret', value: apiValue(params, 'accessKeySecret') },
        { label: '终端节点', value: params.endpoint ? String(params.endpoint) : <span className="disabled">默认</span> },
      ]
    case 'cloudFlare':
      return [
        { label: 'API密钥', value: apiValue(params, 'apiKey') },
        { label: '账号邮箱', value: apiValue(params, 'email') },
      ]
    case 'godaddy':
      return [
        { label: 'Key', value: apiValue(params, 'key') },
        { label: 'Secret', value: apiValue(params, 'secret') },
      ]
    case 'cloudns':
      return [
        { label: '用户认证ID(auth-id)', value: apiValue(params, 'authId') },
        { label: '子用户认证ID(sub-auth-id)', value: apiValue(params, 'subAuthId') },
        { label: '认证密码(auth-password)', value: apiValue(params, 'authPassword') },
      ]
    case 'dnscom':
      return [
        { label: 'API Key', value: apiValue(params, 'key') },
        { label: 'API Secret', value: apiValue(params, 'secret') },
      ]
    case 'dnsla':
      return [
        { label: 'API ID', value: apiValue(params, 'apiId') },
        { label: 'API密钥', value: apiValue(params, 'secret') },
      ]
    case 'volcEngine':
      return [
        { label: 'Access Key ID', value: apiValue(params, 'accessKeyId') },
        { label: 'Secret Access Key', value: apiValue(params, 'accessKeySecret') },
      ]
    case 'amazonRoute53':
      return [
        { label: 'Access Key ID', value: apiValue(params, 'accessKeyId') },
        { label: 'Secret Access Key', value: apiValue(params, 'accessKeySecret') },
        { label: 'API区域', value: params.region ? String(params.region) : <span className="disabled">暂未设置</span> },
      ]
    case 'azureDNS':
      return [
        { label: '订阅ID (Subscription ID)', value: apiValue(params, 'subscriptionId') },
        { label: '目录(租户) ID (Directory Tenant ID)', value: apiValue(params, 'tenantId') },
        { label: '应用程序(客户端) ID (Client ID)', value: apiValue(params, 'clientId') },
        { label: '客户端密码值 (Client Secret Value)', value: apiValue(params, 'clientSecret') },
        { label: '资源组 (Resource Group Name)', value: apiValue(params, 'resourceGroupName') },
      ]
    case 'bunnyNet':
      return [{ label: 'API密钥', value: apiValue(params, 'apiKey') }]
    case 'edgeDNSAPI':
      return [
        { label: 'API地址', value: apiValue(params, 'host') },
        { label: 'AccessKey类型', value: params.role === 'admin' ? '管理员' : '平台用户' },
        { label: 'AccessKey ID', value: apiValue(params, 'accessKeyId') },
        { label: 'AccessKey密钥', value: apiValue(params, 'accessKeySecret') },
      ]
    case 'customHTTP':
      return [
        { label: 'HTTP URL', value: apiValue(params, 'url') },
        { label: '私钥', value: apiValue(params, 'secret') },
      ]
    default:
      return Object.entries(params).map(([key, value]) => ({ label: key, value: value === null || value === '' ? '-' : String(value) }))
  }
}

export function DnsProviderPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const providerId = Number(searchParams.get('providerId') || 0)
  const filter = searchParams.get('filter') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [modal, setModal] = useState<DomainModal>(null)
  const [isUpdatingDomains, setIsUpdatingDomains] = useState(false)
  const [syncStarted, setSyncStarted] = useState(false)
  const [syncingDomainId, setSyncingDomainId] = useState(0)

  const query = useQuery({
    queryKey: ['dns-provider', providerId, filter, page],
    queryFn: () => apiGet<DNSProviderData>('/dns/providers/provider', { providerId, filter: filter || undefined, page: page > 1 ? page : undefined }),
    enabled: providerId > 0,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dns-provider'] })
  }

  useEffect(() => {
    if (!query.data || syncStarted) {
      return
    }
    if (query.data.pageNo <= 1 && query.data.filter === '') {
      setSyncStarted(true)
      setIsUpdatingDomains(true)
      void apiPost<{ hasChanges: boolean }>('/dns/providers/syncDomains', { providerId })
        .then(async () => {
          await refresh()
        })
        .catch(() => {
          // ignore auto sync errors
        })
        .finally(() => {
          window.setTimeout(() => setIsUpdatingDomains(false), 1000)
        })
    }
  }, [query.data, syncStarted, providerId])

  if (!providerId) {
    return <div className="ui negative message">缺少服务商参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const provider = data.provider
  const rows = providerRows(provider)

  async function syncDomains() {
    setIsUpdatingDomains(true)
    try {
      await apiPost<{ hasChanges: boolean }>('/dns/providers/syncDomains', { providerId })
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败', 'error')
    } finally {
      setTimeout(() => setIsUpdatingDomains(false), 1000)
    }
  }

  async function syncDomain(domain: DNSProviderDomainItem) {
    if (!(await confirm({ message: '确定要同步此域名下的所有解析记录吗?' }))) {
      return
    }
    setSyncingDomainId(domain.id)
    try {
      await postForm('/dns/domains/sync', { domainId: domain.id })
      toast('同步成功')
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败', 'error')
    } finally {
      setSyncingDomainId(0)
    }
  }

  async function deleteDomain(domain: DNSProviderDomainItem) {
    if (!(await confirm({ message: `确定要删除域名"${domain.name}"吗?`, danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await postForm('/dns/domains/delete', { domainId: domain.id })
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function recoverDomain(domain: DNSProviderDomainItem) {
    if (!(await confirm({ message: `确定要恢复域名"${domain.name}"吗?` }))) {
      return
    }
    try {
      await postForm('/dns/domains/recover', { domainId: domain.id })
      await refresh()
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败', 'error')
    }
  }

  function setFilter(nextFilter: string) {
    const next = new URLSearchParams()
    next.set('providerId', String(providerId))
    next.set('filter', nextFilter)
    setSearchParams(next)
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: 'DNS账号列表', to: '/dns/providers' },
          { name: provider.name, to: `/dns/providers/provider?providerId=${provider.id}`, active: true },
        ]}
      />

      <h3>
        账号信息{' '}
        <Link to={`/dns/providers/updatePopup?providerId=${provider.id}`} style={{ fontSize: '0.8em' }}>
          [修改]
        </Link>
      </h3>

      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">账号说明</td>
            <td>{provider.name}</td>
          </tr>
          <tr>
            <td>服务商</td>
            <td>{provider.typeName}</td>
          </tr>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
          {provider.type === 'localEdgeDNS' ? (
            <tr>
              <td>域名服务集群</td>
              <td>{provider.localEdgeDNS?.name || '-'}</td>
            </tr>
          ) : null}
          {provider.minTTL > 0 ? (
            <tr>
              <td>最小TTL</td>
              <td>{provider.minTTL}秒</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h4>
        管理的域名 &nbsp;{' '}
        <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); void syncDomains() }}>
          [刷新域名]
        </a>{' '}
        &nbsp;{' '}
        <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); setModal({ kind: 'create' }) }}>
          [添加域名]
        </a>
      </h4>

      {isUpdatingDomains ? <p className="ui message blue">正在检查域名状态...</p> : null}

      <div className="ui menu text blue first-menu">
        <a href="" className={`item${filter === '' ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); setFilter('') }}>
          正常状态
        </a>
        <a href="" className={`item${filter === 'down' ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); setFilter('down') }}>
          已下线
        </a>
        <a href="" className={`item${filter === 'deleted' ? ' active' : ''}`} onClick={(event) => { event.preventDefault(); setFilter('deleted') }}>
          已删除
        </a>
      </div>

      {data.domains.length === 0 ? (
        <p className="comment">
          暂时还没有{filter === 'deleted' ? '已删除' : filter === 'down' ? '已下线' : '可以管理'}的域名.
        </p>
      ) : null}

      {data.domains.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>域名</th>
              <th className="center" style={{ width: '7em' }}>线路</th>
              <th className="center" style={{ width: '6em' }}>集群</th>
              <th className="center" style={{ width: '7em' }}>节点域名</th>
              <th className="center" style={{ width: '7em' }}>网站域名</th>
              <th>数据更新时间</th>
              <th className="center">状态</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.domains.map((domain) => (
              <tr key={domain.id}>
                <td>{domain.name}</td>
                <td className="center">
                  {domain.countRoutes > 0 ? (
                    <a href="" onClick={(event) => { event.preventDefault(); setModal({ kind: 'routes', domainId: domain.id }) }}>
                      {domain.countRoutes}个 »
                    </a>
                  ) : (
                    <span className="disabled">0个</span>
                  )}
                </td>
                <td className="center">
                  {domain.countClusters > 0 ? (
                    <a href="" onClick={(event) => { event.preventDefault(); setModal({ kind: 'clusters', domainId: domain.id }) }}>
                      {domain.countClusters} »
                    </a>
                  ) : (
                    <span className="disabled">0个</span>
                  )}
                </td>
                <td className="center">
                  {domain.countAllNodes > 0 ? (
                    <a href="" onClick={(event) => { event.preventDefault(); setModal({ kind: 'nodes', domainId: domain.id }) }}>
                      {domain.countNodeRecords}/{domain.countAllNodes}个 »
                    </a>
                  ) : (
                    <span className="disabled">0个</span>
                  )}
                </td>
                <td className="center">
                  {domain.countAllServers > 0 ? (
                    <a href="" onClick={(event) => { event.preventDefault(); setModal({ kind: 'servers', domainId: domain.id }) }}>
                      {domain.countServerRecords}/{domain.countAllServers}个 »
                    </a>
                  ) : (
                    <span className="disabled">0个</span>
                  )}
                </td>
                <td>{domain.dataUpdatedTime ? <span>{domain.dataUpdatedTime}</span> : <span className="disabled">尚未更新</span>}</td>
                <td className="center">
                  {!domain.isOn ? (
                    <span className="ui label grey basic">已禁用</span>
                  ) : domain.countRoutes === 0 || domain.nodesChanged || domain.serversChanged ? (
                    syncingDomainId === domain.id ? (
                      <span>正在同步...</span>
                    ) : (
                      <a
                        href=""
                        style={{ borderBottom: '1px #db2828 dashed' }}
                        title="点击和DNS服务商系统同步"
                        onClick={(event) => { event.preventDefault(); void syncDomain(domain) }}
                      >
                        <span className="red">需要同步</span>
                      </a>
                    )
                  ) : !domain.isUp ? (
                    <a href="" style={{ borderBottom: '1px #db2828 dashed' }} onClick={(event) => { event.preventDefault(); toast('当前域名已从服务商下线', 'error') }}>
                      <span className="red">已下线</span>
                    </a>
                  ) : null}
                </td>
                <td>
                  {syncingDomainId === domain.id ? (
                    <span>正在同步...</span>
                  ) : (
                    <a href="" onClick={(event) => { event.preventDefault(); void syncDomain(domain) }}>
                      同步
                    </a>
                  )}
                  &nbsp;
                  {syncingDomainId !== domain.id ? (
                    <a href="" onClick={(event) => { event.preventDefault(); setModal({ kind: 'update', domainId: domain.id }) }}>
                      修改
                    </a>
                  ) : null}
                  &nbsp;
                  {syncingDomainId !== domain.id && !domain.isDeleted ? (
                    <a href="" onClick={(event) => { event.preventDefault(); void deleteDomain(domain) }}>
                      删除
                    </a>
                  ) : null}
                  {syncingDomainId !== domain.id && domain.isDeleted ? (
                    <a href="" onClick={(event) => { event.preventDefault(); void recoverDomain(domain) }}>
                      恢复
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {modal ? (
        <Modal
          title={
            modal.kind === 'create'
              ? '添加管理域名'
              : modal.kind === 'update'
                ? '修改域名'
                : modal.kind === 'routes'
                  ? '域名支持的线路'
                  : modal.kind === 'clusters'
                    ? '使用域名的集群'
                    : modal.kind === 'nodes'
                      ? '使用域名的节点'
                      : '使用域名的网站'
          }
          onClose={() => setModal(null)}
          width={modal.kind === 'nodes' || modal.kind === 'servers' ? '60em' : undefined}
        >
          {modal.kind === 'create' ? (
            <CreateDomainForm
              providerId={providerId}
              onSaved={() => {
                setModal(null)
                void refresh()
              }}
            />
          ) : null}
          {modal.kind === 'update' ? (
            <UpdateDomainForm
              domainId={modal.domainId}
              onSaved={() => {
                setModal(null)
                void refresh()
              }}
            />
          ) : null}
          {modal.kind === 'routes' ? <DomainRoutesContent domainId={modal.domainId} /> : null}
          {modal.kind === 'clusters' ? <DomainClustersContent domainId={modal.domainId} /> : null}
          {modal.kind === 'nodes' ? <DomainNodesContent domainId={modal.domainId} /> : null}
          {modal.kind === 'servers' ? <DomainServersContent domainId={modal.domainId} /> : null}
        </Modal>
      ) : null}
    </div>
  )
}
