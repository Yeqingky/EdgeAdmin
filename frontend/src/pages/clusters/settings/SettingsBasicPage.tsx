import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { apiGet, apiPost } from '../../../api/client'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../../components/form'
import { ClusterSettingsLayout, parseId } from '../shared'

interface ClockConfig {
  autoSync: boolean
  server: string
  checkChrony: boolean
}

interface ClusterSettingsCluster {
  id: number
  name: string
  installDir: string
  timeZone: string
  nodeMaxThreads: number
  autoOpenPorts: boolean
  clock: ClockConfig
  autoRemoteStart: boolean
  autoInstallNftables: boolean
  autoSystemTuning: boolean
  autoTrimDisks: boolean
  maxConcurrentReads: number
  maxConcurrentWrites: number
  sshParams: { port: number }
  domainName: string
}

interface SettingsData {
  cluster: ClusterSettingsCluster
  grant: { id: number; name: string } | null
  timeZoneGroups: { code: string; name: string }[]
  timeZoneLocations: { name: string; group: string; offset: string }[]
  timeZoneLocation: { name: string; group: string }
  defaultNodeMaxThreads: number
  defaultNodeMaxThreadsMin: number
  defaultNodeMaxThreadsMax: number
}

export function ClusterSettingsBasicPage() {
  const [searchParams] = useSearchParams()
  const clusterId = parseId(searchParams.get('clusterId'))
  const queryClient = useQueryClient()
  const toast = useToast()
  const query = useQuery({
    queryKey: ['cluster-settings', clusterId],
    queryFn: () => apiGet<SettingsData>('/clusters/cluster/settings', { clusterId }),
    enabled: clusterId > 0,
  })
  const grantsQuery = useQuery({
    queryKey: ['grant-options'],
    queryFn: () => apiGet<{ grants: { id: number; name: string; username: string }[] }>('/clusters/grants/selectPopup'),
  })

  const [cluster, setCluster] = useState<ClusterSettingsCluster | null>(null)
  const [grantId, setGrantId] = useState(0)
  const [sshPort, setSshPort] = useState('')
  const [timeZoneGroupCode, setTimeZoneGroupCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setCluster(query.data.cluster)
      setGrantId(query.data.grant?.id || 0)
      setSshPort(String(query.data.cluster.sshParams?.port || ''))
      setTimeZoneGroupCode(query.data.timeZoneLocation?.group || query.data.timeZoneGroups[0]?.code || '')
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !cluster) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data!
  const locations = data.timeZoneLocations.filter((location) => location.group === timeZoneGroupCode)

  function update<K extends keyof ClusterSettingsCluster>(key: K, value: ClusterSettingsCluster[K]) {
    setCluster((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!cluster) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/clusters/cluster/settings', {
        clusterId,
        name: cluster.name,
        grantId,
        sshParamsPort: sshPort,
        installDir: cluster.installDir,
        timeZone: cluster.timeZone,
        nodeMaxThreads: cluster.nodeMaxThreads,
        autoOpenPorts: cluster.autoOpenPorts ? 1 : '',
        clockAutoSync: cluster.clock.autoSync ? 1 : '',
        clockServer: cluster.clock.server,
        clockCheckChrony: cluster.clock.checkChrony ? 1 : '',
        autoRemoteStart: cluster.autoRemoteStart ? 1 : '',
        autoInstallNftables: cluster.autoInstallNftables ? 1 : '',
        autoSystemTuning: cluster.autoSystemTuning ? 1 : '',
        autoTrimDisks: cluster.autoTrimDisks ? 1 : '',
        maxConcurrentReads: cluster.maxConcurrentReads,
        maxConcurrentWrites: cluster.maxConcurrentWrites,
      })
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['cluster-settings', clusterId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ClusterSettingsLayout clusterId={clusterId} activePath="/clusters/cluster/settings">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="集群名称 *">
            <TextInput type="text" maxLength={50} value={cluster.name} onChange={(event) => update('name', event.target.value)} autoFocus />
          </FormRow>
          {cluster.domainName ? (
            <FormRow title="域名">
              {cluster.domainName}
              <a href={`#/clusters/cluster/settings/dns?clusterId=${cluster.id}`} title="DNS设置">
                <ExternalLink size={12} style={{ color: 'grey' }} />
              </a>
            </FormRow>
          ) : null}
          <FormRow title="默认SSH认证">
            <Select value={grantId} onChange={(event) => setGrantId(Number(event.target.value))}>
              <option value="0">[不使用]</option>
              {grantsQuery.data?.grants.map((grant) => (
                <option key={grant.id} value={grant.id}>
                  {grant.name}
                  {grant.username ? `（${grant.username}）` : ''}
                </option>
              ))}
            </Select>
            <p className="comment">当节点没有单独设置SSH认证时，默认使用此设置。</p>
          </FormRow>
          <FormRow title="默认SSH端口">
            <TextInput type="text" maxLength={5} style={{ width: '5em' }} value={sshPort} onChange={(event) => setSshPort(event.target.value)} />
            <p className="comment">节点默认SSH登录端口。</p>
          </FormRow>
          <FormRow title="节点安装目录">
            <TextInput type="text" maxLength={100} value={cluster.installDir} onChange={(event) => update('installDir', event.target.value)} />
            <p className="comment">当节点没有单独设置安装目录时，默认使用此设置。如果集群和节点都没有设置安装目录，则使用 登录用户HOME路径/edge-node 目录。</p>
          </FormRow>
          <FormRow title="时区">
            <div className="ui fields inline">
              <div className="ui field">
                <Select value={timeZoneGroupCode} onChange={(event) => setTimeZoneGroupCode(event.target.value)}>
                  {data.timeZoneGroups.map((group) => (
                    <option key={group.code} value={group.code}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="ui field">
                <Select value={cluster.timeZone} onChange={(event) => update('timeZone', event.target.value)}>
                  {locations.map((location) => (
                    <option key={location.name} value={location.name}>
                      {location.name} ({location.offset})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="comment">节点记录日志使用的时区。</p>
          </FormRow>
          <FormRow title="单节点最大线程数">
            <TextInput
              type="text"
              maxLength={6}
              value={String(cluster.nodeMaxThreads)}
              onChange={(event) => update('nodeMaxThreads', Number(event.target.value) || 0)}
            />
            <p className="comment">
              取值在{data.defaultNodeMaxThreadsMin}和{data.defaultNodeMaxThreadsMax}之间；如果为0，则默认为{data.defaultNodeMaxThreads}。
            </p>
          </FormRow>
          <FormRow title="自动开放端口">
            <Checkbox label="" checked={cluster.autoOpenPorts} onChange={(value) => update('autoOpenPorts', value)} />
            <p className="comment">选中后会自动尝试在边缘节点正在运行的firewalld中开放所需端口。</p>
          </FormRow>
          <FormRow title="自动同步节点时钟">
            <Checkbox
              label=""
              checked={cluster.clock.autoSync}
              onChange={(value) => update('clock', { ...cluster.clock, autoSync: value })}
            />
            <p className="comment">选中后表示尝试自动同步节点时钟。</p>
          </FormRow>
          {cluster.clock.autoSync ? (
            <>
              <FormRow title="NTP时钟服务器">
                <TextInput
                  type="text"
                  maxLength={100}
                  value={cluster.clock.server}
                  onChange={(event) => update('clock', { ...cluster.clock, server: event.target.value })}
                />
                <p className="comment">可选项。默认使用 pool.ntp.org。</p>
              </FormRow>
              <FormRow title="检查Chrony">
                <Checkbox
                  label=""
                  checked={cluster.clock.checkChrony}
                  onChange={(value) => update('clock', { ...cluster.clock, checkChrony: value })}
                />
                <p className="comment">选中后，表示如果chrony正在运行，则不重复执行时间同步。</p>
              </FormRow>
            </>
          ) : null}
          <FormRow title="自动远程启动">
            <Checkbox label="" checked={cluster.autoRemoteStart} onChange={(value) => update('autoRemoteStart', value)} />
            <p className="comment">当检测到节点离线时，自动尝试远程启动（前提是节点已经设置了SSH登录认证）。</p>
          </FormRow>
          <FormRow title="自动安装nftables">
            <Checkbox label="" checked={cluster.autoInstallNftables} onChange={(value) => update('autoInstallNftables', value)} />
            <p className="comment">选中后，表示在Linux系统中自动尝试安装 nftables 用于安全防御。</p>
          </FormRow>
          <FormRow title="自动调节系统参数">
            <Checkbox label="" checked={cluster.autoSystemTuning} onChange={(value) => update('autoSystemTuning', value)} />
            <p className="comment">选中后，表示自动调整Linux内核等参数，以便提升性能。</p>
          </FormRow>
          <FormRow title="自动执行硬盘TRIM">
            <Checkbox label="" checked={cluster.autoTrimDisks} onChange={(value) => update('autoTrimDisks', value)} />
            <p className="comment">执行TRIM后可以移除SSD硬盘中无效的数据，从而显著提升SSD硬盘写入性能。</p>
          </FormRow>
          <FormRow title="节点I/O最大读并发数">
            <TextInput
              type="text"
              style={{ width: '5em' }}
              maxLength={4}
              value={String(cluster.maxConcurrentReads)}
              onChange={(event) => update('maxConcurrentReads', Number(event.target.value) || 0)}
            />
            <p className="comment">0表示根据系统资源自动计算；通常不需要修改，请在专业人士指导下操作。</p>
          </FormRow>
          <FormRow title="节点I/O最大写并发数">
            <TextInput
              type="text"
              style={{ width: '5em' }}
              maxLength={4}
              value={String(cluster.maxConcurrentWrites)}
              onChange={(event) => update('maxConcurrentWrites', Number(event.target.value) || 0)}
            />
            <p className="comment">0表示根据系统资源自动计算；通常不需要修改，请在专业人士指导下操作。</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </ClusterSettingsLayout>
  )
}
