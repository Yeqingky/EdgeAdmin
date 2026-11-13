import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { NodeMenu } from './NodeMenu'
import { GrantSelector, Modal } from './ui'
import { postForm, type InstallStatusResult, type NodeGrantRef, type NodeInstallData } from './shared'

interface NodeSSHPopupData {
  node: { id: number; name: string }
  clusterId: number
  loginId: number
  params: { host?: string; port?: number | string; grantId?: number }
  grant: { id: number; name: string; method?: string; methodName?: string } | null
}

export function NodeInstallPage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)
  const nodeId = Number(searchParams.get('nodeId') || 0)
  const [installing, setInstalling] = useState(false)
  const [sshOpened, setSshOpened] = useState(false)

  const query = useQuery({
    queryKey: ['node-install', clusterId, nodeId],
    queryFn: () => apiGet<NodeInstallData>('/clusters/cluster/node/install', { clusterId, nodeId }),
    enabled: clusterId > 0 && nodeId > 0,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['node-install', clusterId, nodeId] })

  useEffect(() => {
    if (!installing) {
      return
    }
    let stopped = false
    const timer = window.setInterval(() => {
      void apiPost<InstallStatusResult>('/clusters/cluster/node/status', { nodeId })
        .then(async (result) => {
          if (stopped) {
            return
          }
          if (result.isInstalled || (result.installStatus && result.installStatus.isFinished)) {
            setInstalling(false)
            await queryClient.invalidateQueries({ queryKey: ['node-install', clusterId, nodeId] })
          }
        })
        .catch(() => {
          // ignore transient polling errors
        })
    }, 2000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [installing, nodeId, clusterId, queryClient])

  const install = useMutation({
    mutationFn: () => postForm('/clusters/cluster/node/install', { nodeId }),
    onSuccess: async () => {
      setInstalling(true)
      toast('已经开始安装,请稍候...')
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const updateInstallStatus = useMutation({
    mutationFn: (isInstalled: boolean) => postForm('/clusters/cluster/node/updateInstallStatus', { nodeId, isInstalled }),
    onSuccess: async () => {
      await refresh()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (clusterId <= 0 || nodeId <= 0) {
    return <div className="ui negative message">缺少节点参数.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const node = data.node
  const installStatus = data.installStatus
  const configContent = `rpc.endpoints: [ ${data.apiEndpoints} ]\nnodeId: "${node.uniqueId}"\nsecret: "${node.secret}"`

  async function toggleInstalled(isInstalled: boolean) {
    if (
      !(await confirm({
        message: `确定要将当前节点修改为${isInstalled ? '已安装' : '未安装'}状态?`,
        confirmText: '确定',
      }))
    ) {
      return
    }
    updateInstallStatus.mutate(isInstalled)
  }

  function downloadConfig() {
    const blob = new Blob([configContent], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'api_node.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <NodeMenu clusterId={clusterId} node={node} active="install" />

      {!node.isInstalled ? (
        <div>
          <div>
            <span className="red">
              在当前节点完成安装前,相关DNS解析记录将不会生效,
              <a href="" onClick={(event) => { event.preventDefault(); void toggleInstalled(true) }}>
                已完成安装
              </a>
              .
            </span>
            <div className="ui divider" />
          </div>

          <h4>方法1:通过SSH自动安装</h4>

          <table className="ui table definition selectable">
            <tbody>
              <tr>
                <td className="title">SSH地址</td>
                <td>
                  {data.sshAddr ? (
                    <span>
                      {data.sshAddr} &nbsp;{' '}
                      <a href="" onClick={(event) => { event.preventDefault(); setSshOpened(true) }}>
                        [修改]
                      </a>
                    </span>
                  ) : (
                    <span>
                      <span className="red">尚未设置</span> &nbsp;{' '}
                      <a href="" onClick={(event) => { event.preventDefault(); setSshOpened(true) }}>
                        [设置]
                      </a>
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {installStatus && (installStatus.isRunning || installStatus.isFinished) ? (
            <div className="ui segment">
              {installStatus.isRunning ? <div className="blue">安装中...</div> : null}
              {installStatus.isFinished ? (
                <div>
                  {installStatus.isOk ? <span className="green">已安装成功</span> : <span className="red">安装过程中发生错误:{installStatus.error}</span>}
                </div>
              ) : null}
            </div>
          ) : null}

          {installStatus && installStatus.isFinished ? (
            <button className="ui button small" type="button" onClick={() => install.mutate()}>
              重新安装
            </button>
          ) : (
            <button className="ui button small primary" type="button" onClick={() => install.mutate()}>
              开始安装
            </button>
          )}

          <h4>方法2:手动安装</h4>
          <table className="ui table definition selectable">
            <tbody>
              {data.installerFiles && data.installerFiles.length > 0 ? (
                <tr>
                  <td className="title">下载安装文件</td>
                  <td>
                    <table className="ui table celled">
                      <thead>
                        <tr>
                          <th>文件名</th>
                          <th>操作系统</th>
                          <th>CPU架构</th>
                          <th>版本</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.installerFiles.map((file) => (
                          <tr key={file.name}>
                            <td>
                              <a href={`/clusters/cluster/downloadInstaller?name=${encodeURIComponent(file.name)}`} target="_blank" rel="noreferrer">
                                {file.name}
                              </a>
                            </td>
                            <td>{file.os}</td>
                            <td>{file.arch}</td>
                            <td>v{file.version}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ) : null}
              <tr>
                <td>配置文件</td>
                <td>
                  configs/api_node.yaml &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); downloadConfig() }}>
                    [下载]
                  </a>
                </td>
              </tr>
              <tr>
                <td>配置内容</td>
                <td>
                  <pre style={{ background: '#f7f7f7', padding: '1em', overflowX: 'auto' }}>{configContent}</pre>
                  <p className="comment">
                    手动替换edge-node安装目录下的<code>configs/api_node.yaml</code>文件,然后重新启动生效;如果此文件不存在,则需要创建.
                  </p>
                </td>
              </tr>
              <tr>
                <td className="title">安装目录</td>
                <td>
                  {node.installDir ? (
                    node.installDir
                  ) : (
                    <span>建议安装在 /usr/local/goedge/edge-node</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="ui divider" />
          <a href="" onClick={(event) => { event.preventDefault(); void toggleInstalled(true) }}>
            [修改当前节点为已安装状态]
          </a>
        </div>
      ) : (
        <div>
          <h4>配置文件</h4>
          <table className="ui table definition selectable">
            <tbody>
              <tr>
                <td className="title">配置文件</td>
                <td>
                  configs/api_node.yaml &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); downloadConfig() }}>
                    [下载]
                  </a>
                </td>
              </tr>
              <tr>
                <td className="title">配置内容</td>
                <td>
                  <pre style={{ background: '#f7f7f7', padding: '1em', overflowX: 'auto' }}>{configContent}</pre>
                  <p className="comment">每个节点的配置文件内容均不相同,不能混用.</p>
                </td>
              </tr>
              <tr>
                <td className="title">安装目录</td>
                <td>{node.installDir ? node.installDir : <span>使用集群设置</span>}</td>
              </tr>
              {data.exeRoot ? (
                <tr>
                  <td>最近运行目录</td>
                  <td>{data.exeRoot}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="ui message success">当前节点为已安装状态.</div>
          <a href="" onClick={(event) => { event.preventDefault(); void toggleInstalled(false) }}>
            [重新安装]
          </a>
        </div>
      )}

      {sshOpened ? (
        <NodeSSHModal
          nodeId={nodeId}
          onClose={() => setSshOpened(false)}
          onSaved={async () => {
            setSshOpened(false)
            toast('保存成功')
            await refresh()
          }}
        />
      ) : null}

      <div style={{ marginTop: '1em' }}>
        <Link to={`/clusters/cluster/node/detail?clusterId=${clusterId}&nodeId=${nodeId}`}>[返回节点详情]</Link>
      </div>
    </div>
  )
}

function NodeSSHModal({ nodeId, onClose, onSaved }: { nodeId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const query = useQuery({
    queryKey: ['node-ssh-popup', nodeId],
    queryFn: () => apiGet<NodeSSHPopupData>('/clusters/cluster/updateNodeSSH', { nodeId }),
  })
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [grant, setGrant] = useState<NodeGrantRef | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.data && !loaded) {
      setHost(query.data.params.host || '')
      const portValue = Number(query.data.params.port || 0)
      setPort(portValue > 0 ? String(portValue) : '22')
      setGrant(query.data.grant)
      setLoaded(true)
    }
  }, [query.data, loaded])

  async function save() {
    if (!grant || grant.id <= 0) {
      toast('需要选择或填写至少一个认证信息', 'error')
      return
    }
    setSaving(true)
    try {
      await postForm('/clusters/cluster/updateNodeSSH', {
        nodeId,
        loginId: query.data?.loginId || 0,
        sshHost: host.trim(),
        sshPort: Number(port) || 0,
        grantId: grant.id,
      })
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="修改节点的SSH登录信息" onClose={onClose}>
      {query.isLoading ? <div>加载中...</div> : null}
      {query.data ? (
        <div className="ui form">
        <table className="ui table definition">
          <tbody>
            <tr>
              <td className="title">SSH主机地址 *</td>
              <td>
                <input type="text" maxLength={64} value={host} onChange={(event) => setHost(event.target.value)} />
                <p className="comment">比如192.168.1.100</p>
              </td>
            </tr>
            <tr>
              <td>SSH主机端口 *</td>
              <td>
                <input type="text" maxLength={5} style={{ width: '6em' }} value={port} onChange={(event) => setPort(event.target.value)} />
                <p className="comment">比如22.</p>
              </td>
            </tr>
            <tr>
              <td>SSH登录认证 *</td>
              <td>
                <GrantSelector clusterId={query.data.clusterId} value={grant} onChange={setGrant} />
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      ) : null}
      <div>
        <button className={`ui button primary${saving ? ' loading disabled' : ''}`} type="button" onClick={() => void save()} disabled={saving}>
          保存
        </button>
      </div>
    </Modal>
  )
}
