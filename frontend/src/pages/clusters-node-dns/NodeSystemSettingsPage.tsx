import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { ApiNodeAddressesEditor, MenuLinks } from './ui'
import { postForm, type NetworkAddressConfig, type NodeSystemData } from './shared'

export function NodeSystemSettingsPage() {
  const session = useSession()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-settings-system', clusterId, nodeId],
    queryFn: () => apiGet<NodeSystemData>('/clusters/cluster/node/settings/system', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [maxCPU, setMaxCPU] = useState('0')
  const [bypassMobile, setBypassMobile] = useState('0')
  const [bypassChecked, setBypassChecked] = useState(false)
  const [dnsResolverType, setDnsResolverType] = useState('default')
  const [apiNodeAddrs, setApiNodeAddrs] = useState<NetworkAddressConfig[]>([])
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      const node = query.data.node
      setMaxCPU(String(node.maxCPU || 0))
      setBypassMobile(String(node.bypassMobile || 0))
      setBypassChecked(node.bypassMobileCheckbox)
      setDnsResolverType(query.data.dnsResolverConfig?.type || 'default')
      setApiNodeAddrs(query.data.apiNodeAddrs || [])
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
  const isPlus = session.data?.teaIsPlus ?? false

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await postForm(
        '/clusters/cluster/node/settings/system',
        {
          nodeId,
          maxCPU: Number(maxCPU) || 0,
          bypassMobile: bypassChecked ? Number(bypassMobile) || 0 : 0,
          dnsResolverJSON: JSON.stringify({ type: dnsResolverType }),
          apiNodeAddrsJSON: JSON.stringify(apiNodeAddrs),
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
          { name: 'DNS设置', to: `/clusters/cluster/node/settings/dns?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '缓存设置', to: `/clusters/cluster/node/settings/cache?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'DDoS防护', to: `/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'SSH设置', to: `/clusters/cluster/node/settings/ssh?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '系统设置', to: `/clusters/cluster/node/settings/system?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="CPU线程数">
            <input type="text" maxLength={4} style={{ width: '5em' }} value={maxCPU} onChange={(event) => setMaxCPU(event.target.value)} />
            <p className="comment">当前节点可以使用的最多的CPU线程数，如果为0则默认为总的CPU线程数。</p>
          </FormRow>
          {isPlus ? (
            <>
              <FormRow title="BYPASS 移动">
                <Checkbox
                  checked={bypassChecked}
                  onChange={(checked) => {
                    setBypassChecked(checked)
                    setBypassMobile(checked ? '17' : '0')
                  }}
                />
                <p className="comment">选中后，可优化移动网络访问成功率，对于正常站点，会增加访问延迟，节点需安装nftables。</p>
              </FormRow>
              {bypassChecked ? (
                <FormRow title="BYPASS 移动，窗口大小">
                  <input type="text" style={{ width: '6em' }} value={bypassMobile} onChange={(event) => setBypassMobile(event.target.value)} />
                  <p className="comment">TCP接收窗口大小，默认值17。</p>
                </FormRow>
              ) : null}
            </>
          ) : null}
        </FormTable>

        <h4>DNS解析</h4>
        <FormTable>
          <FormRow title="使用的DNS解析库">
            <Select value={dnsResolverType} onChange={(event) => setDnsResolverType(event.target.value)}>
              <option value="default">默认</option>
              <option value="cgo">CGO</option>
              <option value="goNative">Go原生</option>
            </Select>
            <p className="comment">边缘节点使用的DNS解析库。修改此项配置后，需要重启节点进程才会生效。</p>
          </FormRow>
        </FormTable>

        <h4>API相关</h4>
        <FormTable>
          <FormRow title="API节点地址">
            <ApiNodeAddressesEditor value={apiNodeAddrs} onChange={setApiNodeAddrs} />
            <p className="comment">当前节点单独使用的API节点设置。</p>
          </FormRow>
        </FormTable>

        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
