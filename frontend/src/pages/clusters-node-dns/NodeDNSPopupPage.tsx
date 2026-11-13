import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { DnsRoutesSelector, MenuLinks } from './ui'
import { postForm, type NodeDNSPopupData } from './shared'

export function NodeDNSPopupPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-dns-popup', clusterId, nodeId],
    queryFn: () => apiGet<NodeDNSPopupData>('/clusters/cluster/node/updateDNSPopup', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [ipAddr, setIpAddr] = useState('')
  const [domainId, setDomainId] = useState(0)
  const [domainName, setDomainName] = useState('')
  const [routes, setRoutes] = useState<string[]>([])
  const [allRoutes, setAllRoutes] = useState<NodeDNSPopupData['allRoutes']>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setIpAddr(query.data.ipAddr || '')
      setDomainId(query.data.domainId || 0)
      setDomainName(query.data.domainName || '')
      setRoutes((query.data.routes || []).map((route) => `${route.code}@${route.domainId}`))
      setAllRoutes(query.data.allRoutes || [])
      setInitialized(true)
    }
  }, [query.data, initialized])

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数。</div>
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (query.isLoading || !initialized) {
    return <LoadingBlock />
  }
  if (!query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function syncDomain() {
    if (domainId <= 0) {
      return
    }
    try {
      await postForm('/clusters/cluster/node/syncDomain', { domainId })
      toast('从服务商获取线路成功')
      const refreshed = await apiGet<NodeDNSPopupData>('/clusters/cluster/node/updateDNSPopup', { clusterId, nodeId })
      setAllRoutes(refreshed.allRoutes || [])
      setRoutes((refreshed.routes || []).map((route) => `${route.code}@${route.domainId}`))
      setDomainName(refreshed.domainName || '')
      setDomainId(refreshed.domainId || 0)
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
        '/clusters/cluster/node/updateDNSPopup',
        {
          nodeId,
          ipAddr: ipAddr.trim(),
          domainId,
          dnsRoutesJSON: JSON.stringify(routes),
        },
        true,
      )
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '节点列表', to: `/clusters/cluster/nodes?clusterId=${clusterId}` },
          { name: '节点详情', to: `/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '修改节点DNS设置', to: `/clusters/cluster/node/updateDNSPopup?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
        ]}
      />

      <h3>修改节点DNS设置</h3>

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          {domainName ? (
            <FormRow title="主域名">
              {domainName}
              <p className="comment">由当前节点所属集群设置。</p>
            </FormRow>
          ) : null}
          <FormRow title="IP地址 *">
            <input type="text" maxLength={64} value={ipAddr} onChange={(event) => setIpAddr(event.target.value)} />
            <p className="comment">用于域名解析的节点IP地址。</p>
          </FormRow>
          {domainId > 0 ? (
            <FormRow title="线路">
              {allRoutes.length === 0 ? (
                <p className="comment">
                  没有可选的线路。
                  <a href="" onClick={(event) => { event.preventDefault(); void syncDomain() }}>
                    [获取线路]
                  </a>
                </p>
              ) : (
                <div>
                  <DnsRoutesSelector allRoutes={allRoutes} value={routes} onChange={setRoutes} />
                  <p className="comment">
                    当前节点IP对应的线路。
                    <a href="" onClick={(event) => { event.preventDefault(); void syncDomain() }}>
                      [重新获取线路]
                    </a>
                  </p>
                </div>
              )}
            </FormRow>
          ) : (
            <FormRow title="线路">
              <span className="disabled">当前集群没有选择域名。</span>
            </FormRow>
          )}
        </FormTable>
        <SubmitButton submitting={submitting} />

        <div style={{ marginTop: '1em' }}>
          <Link to={`/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${nodeId}`}>[返回节点详情]</Link>
        </div>
      </form>
    </div>
  )
}
