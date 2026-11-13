import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPostForm } from '../../../api/client'
import { useSession } from '../../../api/session'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable } from '../../../components/form'

interface NodeCluster {
  id: number
  name: string
  isChecked?: boolean
}

interface NodeIPAddressFormData {
  clusters: NodeCluster[]
  supportThresholds: boolean
}

function parseIds(value: string | null): number[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function CreateNodeIPAddressPage() {
  const toast = useToast()
  const session = useSession()
  const [searchParams] = useSearchParams()
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const supportThresholdsParam = searchParams.get('supportThresholds') === '1'
  const query = useQuery({
    queryKey: ['nodes-ip-addresses-create', nodeId, supportThresholdsParam],
    queryFn: () => apiGet<NodeIPAddressFormData>('/nodes/ipAddresses/createPopup', { nodeId, supportThresholds: supportThresholdsParam ? 1 : 0 }),
  })
  const [ip, setIP] = useState('')
  const [name, setName] = useState('')
  const [canAccess, setCanAccess] = useState(true)
  const [isUp, setIsUp] = useState(true)
  const [clusterIds, setClusterIds] = useState<number[]>([])
  const [thresholdsJSON, setThresholdsJSON] = useState('')
  const [moreVisible, setMoreVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function toggleCluster(id: number) {
    setClusterIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('ip', ip)
      form.set('name', name)
      form.set('canAccess', canAccess ? '1' : '0')
      form.set('isUp', isUp ? '1' : '0')
      if (thresholdsJSON.trim().length > 0) {
        form.set('thresholdsJSON', thresholdsJSON)
      }
      for (const id of clusterIds) {
        form.append('clusterIds', String(id))
      }
      await apiPostForm('/nodes/ipAddresses/createPopup', form)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const data = query.data

  return (
    <div>
      <h3>添加IP地址</h3>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <div className="ui negative message">加载失败</div> : null}
      {data ? (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="IP地址 *">
              <input type="text" value={ip} maxLength={128} onChange={(event) => setIP(event.target.value)} />
              <p className="comment">
                支持单个IP、CIDR格式的一组IP（位数不能小于24）、IP范围（类似于
                <span className="ui label basic small">x.x.x.x-x.x.x.x</span>，最多只取256个）等。
              </p>
            </FormRow>
            <FormRow title="允许公开访问">
              <Checkbox checked={canAccess} onChange={setCanAccess} />
              <p className="comment">是否为可以公开访问的IP，如果选中表示当前IP可以被公开访问，并可被加入到DNS解析记录中。</p>
            </FormRow>
            <tr>
              <td colSpan={2}>
                <a href="" style={{ fontWeight: 'normal' }} onClick={(event) => { event.preventDefault(); setMoreVisible(!moreVisible) }}>
                  {moreVisible ? '收起选项' : '更多选项'} {moreVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </a>
              </td>
            </tr>
            {moreVisible ? (
              <>
                <FormRow title="备注">
                  <input type="text" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
                </FormRow>
                <FormRow title="在线状态">
                  <select className="ui dropdown auto-width" value={isUp ? '1' : '0'} onChange={(event) => setIsUp(event.target.value === '1')}>
                    <option value="1">在线</option>
                    <option value="0">离线</option>
                  </select>
                </FormRow>
                {session.data?.teaIsPlus && data.supportThresholds ? (
                  <FormRow title="阈值设置">
                    <textarea
                      value={thresholdsJSON}
                      rows={3}
                      placeholder="JSON格式的阈值配置"
                      onChange={(event) => setThresholdsJSON(event.target.value)}
                    />
                  </FormRow>
                ) : null}
                {data.clusters && data.clusters.length > 0 ? (
                  <FormRow title="专属集群">
                    {data.clusters.map((cluster) => (
                      <div key={cluster.id} className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input type="checkbox" checked={clusterIds.includes(cluster.id)} onChange={() => toggleCluster(cluster.id)} />
                        <label>{cluster.name}</label>
                      </div>
                    ))}
                  </FormRow>
                ) : null}
              </>
            ) : null}
          </FormTable>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </form>
      ) : null}
    </div>
  )
}

export function UpdateNodeIPAddressPage() {
  const toast = useToast()
  const session = useSession()
  const [searchParams] = useSearchParams()
  const addressId = Number(searchParams.get('addressId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const supportThresholdsParam = searchParams.get('supportThresholds') === '1'
  const query = useQuery({
    queryKey: ['nodes-ip-addresses-update', nodeId, addressId, supportThresholdsParam],
    queryFn: () => apiGet<NodeIPAddressFormData>('/nodes/ipAddresses/updatePopup', { nodeId, addressId, supportThresholds: supportThresholdsParam ? 1 : 0 }),
  })
  const [ip, setIP] = useState(searchParams.get('ip') || '')
  const [name, setName] = useState(searchParams.get('name') || '')
  const [canAccess, setCanAccess] = useState(searchParams.get('canAccess') !== '0')
  const [isOn, setIsOn] = useState(searchParams.get('isOn') !== '0')
  const [isUp, setIsUp] = useState(searchParams.get('isUp') !== '0')
  const [clusterIds, setClusterIds] = useState<number[]>(parseIds(searchParams.get('clusterIds')))
  const [thresholdsJSON, setThresholdsJSON] = useState('')
  const [moreVisible, setMoreVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setClusterIds((current) =>
        current.length > 0
          ? current
          : (query.data.clusters ?? []).filter((cluster) => cluster.isChecked).map((cluster) => cluster.id),
      )
    }
  }, [query.data])

  function toggleCluster(id: number) {
    setClusterIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('addressId', String(addressId))
      form.set('ip', ip)
      form.set('name', name)
      form.set('canAccess', canAccess ? '1' : '0')
      form.set('isOn', isOn ? '1' : '0')
      form.set('isUp', isUp ? '1' : '0')
      if (thresholdsJSON.trim().length > 0) {
        form.set('thresholdsJSON', thresholdsJSON)
      }
      for (const id of clusterIds) {
        form.append('clusterIds', String(id))
      }
      await apiPostForm('/nodes/ipAddresses/updatePopup', form)
      toast('保存成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const data = query.data
  const plus = session.data?.teaIsPlus ?? false

  return (
    <div>
      <h3>修改IP地址</h3>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <div className="ui negative message">加载失败</div> : null}
      {data ? (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="IP地址 *">
              <input type="text" value={ip} maxLength={128} onChange={(event) => setIP(event.target.value)} />
              {addressId > 0 ? (
                <p className="comment">只支持单个IP。</p>
              ) : (
                <p className="comment">
                  支持单个IP、CIDR格式的一组IP（位数不能小于24）、IP范围（类似于
                  <span className="ui label basic small">x.x.x.x-x.x.x.x</span>，最多只取256个）等。
                </p>
              )}
            </FormRow>
            <FormRow title="允许公开访问">
              <Checkbox checked={canAccess} onChange={setCanAccess} />
              <p className="comment">是否为可以公开访问的IP，如果选中表示当前IP可以被公开访问，并可被加入到DNS解析记录中。</p>
            </FormRow>
            <tr>
              <td colSpan={2}>
                <a href="" style={{ fontWeight: 'normal' }} onClick={(event) => { event.preventDefault(); setMoreVisible(!moreVisible) }}>
                  {moreVisible ? '收起选项' : '更多选项'} {moreVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </a>
              </td>
            </tr>
            {moreVisible ? (
              <>
                <FormRow title="启用当前IP">
                  <Checkbox checked={isOn} onChange={setIsOn} />
                  <p className="comment">选中表示当前IP有效。</p>
                </FormRow>
                <FormRow title="备注">
                  <input type="text" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
                </FormRow>
                <FormRow title="在线状态">
                  <select className="ui dropdown auto-width" value={isUp ? '1' : '0'} onChange={(event) => setIsUp(event.target.value === '1')}>
                    <option value="1">在线</option>
                    <option value="0">离线</option>
                  </select>
                </FormRow>
                {plus && data.supportThresholds ? (
                  <FormRow title="阈值设置">
                    <textarea
                      value={thresholdsJSON}
                      rows={3}
                      placeholder="JSON格式的阈值配置"
                      onChange={(event) => setThresholdsJSON(event.target.value)}
                    />
                  </FormRow>
                ) : null}
                {data.clusters && data.clusters.length > 0 ? (
                  <FormRow title="专属集群">
                    {data.clusters.map((cluster) => (
                      <div key={cluster.id} className="ui checkbox" style={{ marginRight: '1em' }}>
                        <input type="checkbox" checked={clusterIds.includes(cluster.id)} onChange={() => toggleCluster(cluster.id)} />
                        <label>{cluster.name}</label>
                      </div>
                    ))}
                  </FormRow>
                ) : null}
              </>
            ) : null}
          </FormTable>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </form>
      ) : null}
    </div>
  )
}
