import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { MenuLinks } from './ui'
import { postForm, type NodeInstallStatus, type UpgradeRemoteData, type UpgradeNodeItem } from './shared'

interface UpgradeStatusData {
  status: NodeInstallStatus | null
}

const SSH_ERROR_CODES = ['EMPTY_LOGIN', 'EMPTY_SSH_HOST', 'EMPTY_SSH_PORT', 'EMPTY_GRANT', 'SSH_LOGIN_FAILED']

export function UpgradeRemotePage() {
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const clusterId = Number(searchParams.get('clusterId') || 0)

  const query = useQuery({
    queryKey: ['upgrade-remote', clusterId],
    queryFn: () => apiGet<UpgradeRemoteData>('/clusters/cluster/upgradeRemote', { clusterId }),
    enabled: clusterId > 0,
  })

  const [nodes, setNodes] = useState<(UpgradeNodeItem & { isChecked: boolean; isInstalling: boolean })[]>([])
  const [installingNodeId, setInstallingNodeId] = useState<number | null>(null)
  const [isBatch, setIsBatch] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (query.data && !initialized) {
      setNodes((query.data.nodes || []).map((node) => ({ ...node, isChecked: false, isInstalling: false })))
      setInitialized(true)
    }
  }, [query.data, initialized])

  const startUpgrade = useCallback(
    async (node: UpgradeNodeItem) => {
      setInstallingNodeId(node.id)
      setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, isInstalling: true } : item)))
      try {
        await postForm('/clusters/cluster/upgradeRemote', { nodeId: node.id })
      } catch (error) {
        setInstallingNodeId(null)
        setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, isInstalling: false } : item)))
        toast(error instanceof Error ? error.message : '升级失败', 'error')
      }
    },
    [toast],
  )

  useEffect(() => {
    if (installingNodeId === null) {
      return
    }
    let stopped = false
    const timer = window.setInterval(() => {
      void apiPost<UpgradeStatusData>('/clusters/cluster/upgradeStatus', { nodeId: installingNodeId })
        .then((result) => {
          if (stopped || !result.status) {
            return
          }
          const status = result.status
          setNodes((current) =>
            current.map((item) => (item.id === installingNodeId ? { ...item, installStatus: status, isInstalling: !status.isFinished } : item)),
          )
          if (!status.isFinished) {
            return
          }
          setInstallingNodeId(null)
          if (status.isOk) {
            toast('升级成功')
            setNodes((current) => current.map((item) => (item.id === installingNodeId ? { ...item, isChecked: false, isInstalling: false } : item)))
            if (isBatch) {
              const next = nodes.find((item) => item.isChecked && item.id !== installingNodeId)
              if (next) {
                void startUpgrade(next)
              } else {
                toast('全部升级成功')
                void queryClient.invalidateQueries({ queryKey: ['upgrade-remote', clusterId] })
              }
            }
          } else {
            const errorCode = status.errorCode || ''
            if (SSH_ERROR_CODES.includes(errorCode)) {
              toast(`需要填写SSH登录信息:${status.error || ''}`, 'error')
            } else {
              toast(`升级失败:${status.error || ''}`, 'error')
            }
          }
        })
        .catch(() => {
          // ignore transient errors
        })
    }, 3000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [installingNodeId, isBatch, nodes, startUpgrade, toast, queryClient, clusterId])

  if (!clusterId) {
    return <div className="ui negative message">缺少集群参数.</div>
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

  const checkedCount = nodes.filter((node) => node.isChecked).length

  async function upgradeNode(node: UpgradeNodeItem) {
    if (!(await confirm({ message: '确定要开始升级此节点吗?' }))) {
      return
    }
    setIsBatch(false)
    await startUpgrade(node)
  }

  async function upgradeBatch() {
    if (!(await confirm({ message: '确定要批量升级选中的节点吗?' }))) {
      return
    }
    setIsBatch(true)
    const next = nodes.find((node) => node.isChecked)
    if (next) {
      await startUpgrade(next)
    }
  }

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有节点', to: `/clusters/cluster/nodes?clusterId=${clusterId}` },
          { name: '远程安装', to: `/clusters/cluster/installRemote?clusterId=${clusterId}` },
          { name: '升级节点', to: `/clusters/cluster/upgradeRemote?clusterId=${clusterId}`, active: true },
        ]}
      />

      {nodes.length === 0 ? <p className="comment">暂时没有需要升级的节点.</p> : null}

      {nodes.length > 0 ? (
        <div>
          <h3>
            所有需要升级的节点
            {checkedCount > 0 ? (
              <button className="ui button primary tiny" style={{ marginLeft: '1em' }} onClick={() => void upgradeBatch()} disabled={installingNodeId !== null}>
                批量升级({checkedCount})
              </button>
            ) : null}
          </h3>
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th style={{ width: '3em' }}>
                  <input
                    type="checkbox"
                    checked={checkedCount === nodes.length && nodes.length > 0}
                    onChange={(event) => setNodes((current) => current.map((node) => ({ ...node, isChecked: event.target.checked })))}
                  />
                </th>
                <th>节点名</th>
                <th>访问IP</th>
                <th>SSH地址</th>
                <th>版本变化</th>
                <th className="four wide">节点状态</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id}>
                  <td>
                    {!node.installStatus || !node.installStatus.isOk ? (
                      <input
                        type="checkbox"
                        checked={node.isChecked}
                        onChange={(event) =>
                          setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, isChecked: event.target.checked } : item)))
                        }
                      />
                    ) : null}
                  </td>
                  <td>
                    <Link to={`/clusters/cluster/node?clusterId=${clusterId}&nodeId=${node.id}`}>{node.name}</Link>
                  </td>
                  <td>
                    {(node.addresses || [])
                      .filter((address) => address.canAccess)
                      .map((address) => (
                        <span key={address.id} className="ui label tiny basic">
                          {address.ip}
                        </span>
                      ))}
                  </td>
                  <td>
                    {node.login && node.login.type === 'ssh' && node.loginParams && node.loginParams.host ? (
                      <span>
                        {node.loginParams.host}:{node.loginParams.port}
                      </span>
                    ) : (
                      <span className="disabled">没有设置</span>
                    )}
                  </td>
                  <td>
                    v{node.oldVersion} -&gt; v{node.newVersion}
                  </td>
                  <td>
                    {node.installStatus && (node.installStatus.isRunning || node.installStatus.isFinished) ? (
                      <div>
                        {node.installStatus.isRunning ? <div className="blue">升级中...</div> : null}
                        {node.installStatus.isFinished ? (
                          <div>
                            {node.installStatus.isOk ? (
                              <span className="green">已升级成功</span>
                            ) : (
                              <span className="red">升级过程中发生错误:{node.installStatus.error}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="disabled">等待升级</span>
                    )}
                  </td>
                  <td>
                    {installingNodeId === null ? (
                      <a href="" onClick={(event) => { event.preventDefault(); void upgradeNode(node) }}>
                        升级
                      </a>
                    ) : node.isInstalling ? (
                      <span>升级中...</span>
                    ) : (
                      <span className="disabled">升级</span>
                    )}
                    {node.installStatus && node.installStatus.isFinished && !node.installStatus.isOk && SSH_ERROR_CODES.includes(node.installStatus.errorCode || '') ? (
                      <div>
                        <Link to={`/clusters/cluster/updateNodeSSH?nodeId=${node.id}`}>[修改SSH设置]</Link>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
