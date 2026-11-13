import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { MenuLinks, Modal } from './ui'
import { UpdateClusterDNSForm, UpdateNodeDNSForm } from './dnsForms'
import type { DNSIssue, DNSIssuesData } from './shared'

export function DnsIssuesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [issues, setIssues] = useState<DNSIssue[]>([])
  const [isRequesting, setIsRequesting] = useState(true)
  const [fixingClusterId, setFixingClusterId] = useState(0)
  const [fixingNode, setFixingNode] = useState<{ clusterId: number; nodeId: number } | null>(null)

  async function reload() {
    setIsRequesting(true)
    try {
      const result = await apiPost<DNSIssuesData>('/dns/issues', {})
      setIssues(result.issues || [])
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setIsRequesting(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns' },
          { name: 'DNS服务商', to: '/dns/providers' },
          { name: '问题修复', to: '/dns/issues', active: true },
          { name: '同步任务', to: '/dns/tasks/listPopup' },
        ]}
      />

      <div className="ui menu text blue first-menu">
        {issues.length > 0 ? (
          <span className="item">
            共<span className="red">{issues.length}</span>个问题
          </span>
        ) : null}
        {issues.length > 0 ? <span className="item">|</span> : null}
        <a href="" title="刷新" className="item" onClick={(event) => { event.preventDefault(); void reload() }}>
          <RefreshCw size={12} /> 刷新
        </a>
        <span className="item">|</span>
        <span className="item">这里是一个全局的DNS解析问题发现页，方便我们诊断并修复问题。</span>
      </div>

      {isRequesting ? (
        <div>
          <div className="margin" />
          正在检查系统问题，请耐心等待...
        </div>
      ) : null}

      {!isRequesting && issues.length === 0 ? (
        <div>
          <div className="margin" />
          <p className="comment">暂时没有发现问题。</p>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>问题对象</th>
              <th>问题描述</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => {
              const params = issue.params || {}
              const issueClusterId = Number(params.clusterId || 0)
              const issueClusterName = String(params.clusterName || '')
              return (
                <tr key={`${issue.type}-${issue.targetId}-${index}`}>
                  <td>
                    {issue.type === 'cluster' ? (
                      <div>
                        集群 "{issue.target}"{' '}
                        <Link to={`/clusters/cluster?clusterId=${issue.targetId}`} target="_blank">
                          »
                        </Link>
                      </div>
                    ) : null}
                    {issue.type === 'node' ? (
                      <div>
                        集群 "{issueClusterName}" 节点 "{issue.target}"{' '}
                        <Link to={`/clusters/cluster/node?clusterId=${issueClusterId}&nodeId=${issue.targetId}`} target="_blank">
                          »
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span>{issue.description}</span>
                  </td>
                  <td>
                    {issue.type === 'cluster' ? (
                      <a href="" onClick={(event) => { event.preventDefault(); setFixingClusterId(issue.targetId) }}>
                        修复
                      </a>
                    ) : null}
                    {issue.type === 'node' ? (
                      <a href="" onClick={(event) => { event.preventDefault(); setFixingNode({ clusterId: issueClusterId, nodeId: issue.targetId }) }}>
                        修复
                      </a>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {fixingClusterId > 0 ? (
        <Modal title="修改集群DNS设置" onClose={() => setFixingClusterId(0)}>
          <UpdateClusterDNSForm
            clusterId={fixingClusterId}
            onSaved={() => {
              setFixingClusterId(0)
              void queryClient.invalidateQueries({ queryKey: ['dns-clusters'] })
              void reload()
            }}
          />
        </Modal>
      ) : null}

      {fixingNode ? (
        <Modal title="修改节点DNS设置" onClose={() => setFixingNode(null)}>
          <UpdateNodeDNSForm
            clusterId={fixingNode.clusterId}
            nodeId={fixingNode.nodeId}
            onSaved={() => {
              setFixingNode(null)
              void reload()
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
