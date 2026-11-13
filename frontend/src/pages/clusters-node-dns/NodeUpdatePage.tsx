import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { NodeMenu } from './NodeMenu'
import { GroupSelector, IPAddressesEditor, Modal, RegionSelector, ValueList } from './ui'
import { postForm, type ClusterRef, type IPAddressItem, type NodeUpdateData } from './shared'

interface ClusterOptionsData {
  clusters: { id: number; name: string; countNodes: number }[]
}

export function NodeUpdatePage() {
  const session = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)

  const query = useQuery({
    queryKey: ['node-update', clusterId, nodeId],
    queryFn: () => apiGet<NodeUpdateData>('/clusters/cluster/node/update', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const [name, setName] = useState('')
  const [nodeClusterId, setNodeClusterId] = useState(clusterId)
  const [ipAddresses, setIpAddresses] = useState<IPAddressItem[]>([])
  const [group, setGroup] = useState<{ id: number; name: string } | null>(null)
  const [region, setRegion] = useState<{ id: number; name: string } | null>(null)
  const [isOn, setIsOn] = useState(true)
  const [enableIPLists, setEnableIPLists] = useState(false)
  const [level, setLevel] = useState(1)
  const [lnAddrs, setLnAddrs] = useState<string[]>([])
  const [secondaryClusters, setSecondaryClusters] = useState<ClusterRef[]>([])
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false)
  const [clustersOpened, setClustersOpened] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      const node = query.data.node
      setName(node.name)
      setNodeClusterId(node.primaryCluster ? node.primaryCluster.id : clusterId)
      setIpAddresses(node.ipAddresses || [])
      setGroup(node.group || null)
      setRegion(node.region || null)
      setIsOn(node.isOn)
      setEnableIPLists(node.enableIPLists)
      setLevel(node.level || 1)
      setLnAddrs(node.lnAddrs || [])
      setSecondaryClusters(node.secondaryClusters || [])
      setInitialized(true)
    }
  }, [query.data, initialized, clusterId])

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
    if (!name.trim()) {
      toast('请输入节点名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postForm('/clusters/cluster/node/update', {
        nodeId,
        name: name.trim(),
        groupId: group ? group.id : 0,
        regionId: region ? region.id : 0,
        ipAddressesJSON: JSON.stringify(ipAddresses),
        primaryClusterId: nodeClusterId,
        secondaryClusterIds: JSON.stringify(secondaryClusters.map((cluster) => cluster.id)),
        isOn,
        level,
        lnAddrs: level > 1 ? lnAddrs : [],
        enableIPLists,
      })
      toast('保存成功')
      navigate(`/clusters/cluster/node/detail?clusterId=${nodeClusterId}&nodeId=${nodeId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={data.node} active="update" />

      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="节点名称 *">
            <TextInput type="text" maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
          </FormRow>
          <FormRow title="所属集群">
            <span>
              {data.node.primaryCluster ? <span className="ui label basic small">{data.node.primaryCluster.name}</span> : null}
              {secondaryClusters.map((cluster) => (
                <span key={cluster.id} className="ui label basic small grey">
                  {cluster.name}
                </span>
              ))}
              &nbsp;{' '}
              <a href="" onClick={(event) => { event.preventDefault(); setClustersOpened(true) }}>
                [修改]
              </a>
            </span>
          </FormRow>
          <FormRow title="IP地址 *">
            <IPAddressesEditor value={ipAddresses} onChange={setIpAddresses} />
            <p className="comment">用于访问节点和域名解析等。</p>
          </FormRow>
          <FormRow title="所属分组">
            <GroupSelector clusterId={nodeClusterId} value={group} onChange={setGroup} />
            <p className="comment">用来筛选节点{isPlus ? '，同时可以在分组中设置二级缓存节点' : ''}。</p>
          </FormRow>
          <FormRow title="所属区域">
            <RegionSelector value={region} onChange={setRegion} />
            <p className="comment">设置区域后可以根据区域进行流量统计和计费。</p>
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
              {isPlus && data.canUpdateLevel ? (
                <FormRow title="级别">
                  <Select value={String(level)} onChange={(event) => setLevel(Number(event.target.value))}>
                    <option value="1">边缘节点</option>
                    <option value="2">L2节点</option>
                  </Select>
                </FormRow>
              ) : null}
              {isPlus && data.canUpdateLevel && level > 1 ? (
                <FormRow title="L2级别访问地址">
                  <ValueList values={lnAddrs} onChange={setLnAddrs} placeholder="IP地址" />
                  <p className="comment">
                    如果不为空，边缘节点访问当前L2节点时将会使用这些IP地址；如果没有设置，将会使用当前节点已经填写的IP地址。
                  </p>
                </FormRow>
              ) : null}
              <FormRow title="同步IP名单">
                <Checkbox checked={enableIPLists} onChange={setEnableIPLists} />
                <p className="comment">选中后，表示启用IP名单同步，包括来自管理员、用户添加的IP名单，以及其他节点系统自动拦截的IP名单。</p>
              </FormRow>
              <FormRow title="启用节点">
                <Checkbox checked={isOn} onChange={setIsOn} />
                <p className="comment">如果不启用此节点，此节点上的所有网站将不能访问。</p>
              </FormRow>
            </>
          ) : null}
        </FormTable>

        <SubmitButton submitting={submitting} />
      </form>

      {clustersOpened ? (
        <ClusterSelector
          primaryClusterId={nodeClusterId}
          secondaryClusterIds={secondaryClusters.map((cluster) => cluster.id)}
          onClose={() => setClustersOpened(false)}
          onConfirm={(primary, secondary) => {
            setNodeClusterId(primary.id)
            setSecondaryClusters(secondary)
            setClustersOpened(false)
          }}
        />
      ) : null}
    </div>
  )
}

export function ClusterSelector({
  primaryClusterId,
  secondaryClusterIds,
  onClose,
  onConfirm,
}: {
  primaryClusterId: number
  secondaryClusterIds: number[]
  onClose: () => void
  onConfirm: (primaryCluster: ClusterRef, secondaryClusters: ClusterRef[]) => void
}) {
  const query = useQuery({
    queryKey: ['clusters-options'],
    queryFn: () => apiGet<ClusterOptionsData>('/clusters/selectPopup', { pageSize: 100 }),
  })
  const [primary, setPrimary] = useState(primaryClusterId)
  const [secondary, setSecondary] = useState<number[]>(secondaryClusterIds.filter((id) => id !== primaryClusterId))
  const clusters = query.data?.clusters || []

  return (
    <Modal title="选择节点所属集群" onClose={onClose} width="40em">
      {query.isLoading ? <div>加载中...</div> : null}
      <table className="ui table definition">
        <tbody>
          <tr>
            <td className="title">主集群</td>
            <td>
              <Select value={String(primary)} onChange={(event) => setPrimary(Number(event.target.value))}>
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </Select>
            </td>
          </tr>
          <tr>
            <td>从集群</td>
            <td>
              {clusters
                .filter((cluster) => cluster.id !== primary)
                .map((cluster) => (
                  <div key={cluster.id} className="ui checkbox" style={{ marginRight: '1em' }}>
                    <input
                      type="checkbox"
                      checked={secondary.includes(cluster.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSecondary([...secondary, cluster.id])
                        } else {
                          setSecondary(secondary.filter((id) => id !== cluster.id))
                        }
                      }}
                    />
                    <label>{cluster.name}</label>
                  </div>
                ))}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        className="ui button primary"
        type="button"
        onClick={() => {
          const primaryCluster = clusters.find((cluster) => cluster.id === primary) || { id: primary, name: `#${primary}`, countNodes: 0 }
          const selected = clusters
            .filter((cluster) => secondary.includes(cluster.id) && cluster.id !== primary)
            .map((cluster) => ({ id: cluster.id, name: cluster.name }))
          onConfirm({ id: primaryCluster.id, name: primaryCluster.name }, selected)
        }}
      >
        确定
      </button>
    </Modal>
  )
}
