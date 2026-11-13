import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { DnsRoutesSelector, MenuLinks } from './ui'
import { postForm, type NodeDNSData } from './shared'

export function NodeDNSSettingsPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-settings-dns', clusterId, nodeId],
    queryFn: () => apiGet<NodeDNSData>('/clusters/cluster/node/settings/dns', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [routes, setRoutes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setRoutes(query.data.dnsRoutes.map((route) => `${route.code}@${route.domainId}`))
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
  const data = query.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await postForm(
        '/clusters/cluster/node/settings/dns',
        {
          nodeId,
          dnsDomainId: 0,
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
      <NodeMenu clusterId={clusterId} node={data.node} active="update" />
      <MenuLinks
        items={[
          { name: '基本设置', to: `/clusters/cluster/node/update?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DNS设置', to: `/clusters/cluster/node/settings/dns?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
          { name: '缓存设置', to: `/clusters/cluster/node/settings/cache?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DDoS防护', to: `/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'SSH设置', to: `/clusters/cluster/node/settings/ssh?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '系统设置', to: `/clusters/cluster/node/settings/system?clusterId=${clusterId}&nodeId=${nodeId}` },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="DNS线路">
            {data.allDNSRoutes.length > 0 ? (
              <>
                <DnsRoutesSelector allRoutes={data.allDNSRoutes} value={routes} onChange={setRoutes} />
                <p className="comment">当前节点对应的DNS线路，可用线路是根据集群设置的域名获取的，注意DNS服务商可能对这些线路有其他限制。</p>
              </>
            ) : (
              <span className="disabled">暂时没有可选的线路。</span>
            )}
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
