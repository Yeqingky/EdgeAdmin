import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FormRow, FormTable, SubmitButton } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { CacheDiskDirsEditor, MenuLinks, SizeCapacityInput } from './ui'
import { postForm, type CacheDir, type NodeCacheData, type SizeCapacity } from './shared'

export function NodeCacheSettingsPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-settings-cache', clusterId, nodeId],
    queryFn: () => apiGet<NodeCacheData>('/clusters/cluster/node/settings/cache', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [diskCapacity, setDiskCapacity] = useState<SizeCapacity>({ count: 0, unit: 'gb' })
  const [memoryCapacity, setMemoryCapacity] = useState<SizeCapacity>({ count: 0, unit: 'gb' })
  const [cacheDiskDir, setCacheDiskDir] = useState('')
  const [cacheDiskSubDirs, setCacheDiskSubDirs] = useState<CacheDir[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setDiskCapacity(query.data.node.maxCacheDiskCapacity || { count: 0, unit: 'gb' })
      setMemoryCapacity(query.data.node.maxCacheMemoryCapacity || { count: 0, unit: 'gb' })
      setCacheDiskDir(query.data.node.cacheDiskDir || '')
      setCacheDiskSubDirs(query.data.node.cacheDiskSubDirs || [])
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
        '/clusters/cluster/node/settings/cache',
        {
          nodeId,
          maxCacheDiskCapacityJSON: JSON.stringify(diskCapacity),
          cacheDiskDir,
          cacheDiskSubDirsJSON: JSON.stringify(cacheDiskSubDirs),
          maxCacheMemoryCapacityJSON: JSON.stringify(memoryCapacity),
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
          { name: '缓存设置', to: `/clusters/cluster/node/settings/cache?clusterId=${clusterId}&nodeId=${nodeId}`, active: true },
          { name: 'DDoS防护', to: `/clusters/cluster/node/settings/ddos-protection?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: 'SSH设置', to: `/clusters/cluster/node/settings/ssh?clusterId=${clusterId}&nodeId=${nodeId}` },
          { name: '系统设置', to: `/clusters/cluster/node/settings/system?clusterId=${clusterId}&nodeId=${nodeId}` },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="缓存硬盘容量">
            <SizeCapacityInput value={diskCapacity} onChange={setDiskCapacity} />
            <p className="comment">缓存所在硬盘的最大用量，超出此用量或硬盘接近用尽时，将会自动尝试清理旧数据，0表示不限制。</p>
          </FormRow>
          <FormRow title="硬盘缓存主目录">
            <input type="text" maxLength={500} value={cacheDiskDir} onChange={(event) => setCacheDiskDir(event.target.value)} />
            <p className="comment">存放文件缓存的主目录，通常填写绝对路径。不填则表示使用集群缓存策略中定义的目录。</p>
          </FormRow>
          <FormRow title="其他硬盘缓存目录">
            <CacheDiskDirsEditor value={cacheDiskSubDirs} onChange={setCacheDiskSubDirs} />
            <p className="comment">除了主目录外，可以在这里添加别的可用于缓存的目录；缓存目录有变更时（添加、删除或修改）需要手动将这些缓存目录清空。</p>
          </FormRow>
          <FormRow title="缓存内存容量">
            <SizeCapacityInput value={memoryCapacity} onChange={setMemoryCapacity} />
            <p className="comment">缓存能使用的内存的最大容量，0表示不限制。</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
