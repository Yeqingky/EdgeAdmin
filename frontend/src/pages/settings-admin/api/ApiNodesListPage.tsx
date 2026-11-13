import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { PageHeader, SettingsTabs } from '../common'
import { CreateApiNodeModal } from './ApiNodeForm'
import { UpgradeApiNodeModal } from './ApiNodeUpgrade'

interface ApiNodeStatus {
  isActive: boolean
  updatedAt: number
  hostname: string
  cpuUsage: number
  cpuUsageText: string
  memUsage: number
  memUsageText: string
  buildVersion: string
  latestVersion: string
  shouldUpgrade: boolean
  canUpgrade: boolean
}

interface ApiNodeItem {
  id: number
  isOn: boolean
  name: string
  accessAddrs: string[]
  restAccessAddrs: string[]
  isPrimary: boolean
  status: ApiNodeStatus
}

interface ApiNodesData {
  nodes: ApiNodeItem[]
  page: string
  hasMethodStats: boolean
}

export function ApiNodesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [upgradingNodeId, setUpgradingNodeId] = useState(0)
  const query = useQuery({
    queryKey: ['settings-api-nodes'],
    queryFn: () => apiGet<ApiNodesData>('/settings/api'),
  })

  async function deleteNode(nodeId: number) {
    if (!(await confirm({ message: '确定要删除此节点吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    try {
      await apiPost('/settings/api/delete', { nodeId })
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['settings-api-nodes'] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const nodes = data.nodes ?? []

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <PageHeader>
        <a href="" className="item" onClick={(event) => { event.preventDefault(); setCreating(true) }}>
          [添加节点]
        </a>
        {data.hasMethodStats ? (
          <a
            href="#/settings/api/methodStats"
            className="item"
            onClick={(event) => { event.preventDefault(); navigate('/settings/api/methodStats') }}
          >
            用时统计
          </a>
        ) : null}
      </PageHeader>

      {nodes.length === 0 ? <p className="comment">暂时还没有节点。</p> : null}

      <div className="table-box">
        {nodes.length > 0 ? (
          <table className="ui table selectable celled">
            <thead>
              <tr>
                <th>节点名称</th>
                <th>GRPC访问地址</th>
                <th>HTTP访问地址</th>
                <th className="width6 center">版本号</th>
                <th className="width5 center">CPU</th>
                <th className="width5 center">内存</th>
                <th className="center width10">状态</th>
                <th className="two op">操作</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id}>
                  <td>
                    <a href={`#/settings/api/node?nodeId=${node.id}`}>{node.name}</a>
                    {node.isPrimary ? (
                      <div>
                        <span className="ui label grey basic">主节点</span>
                      </div>
                    ) : null}
                    {node.status && node.status.shouldUpgrade ? (
                      <div>
                        <span className="red small">
                          v{node.status.buildVersion} -&gt; v{node.status.latestVersion}
                          <br />
                          {node.status.canUpgrade ? (
                            <a href="" onClick={(event) => { event.preventDefault(); setUpgradingNodeId(node.id) }}>
                              [远程升级]
                            </a>
                          ) : null}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {node.accessAddrs && node.accessAddrs.length > 0 ? (
                      <div>
                        {node.accessAddrs.map((address, index) => (
                          <div key={`${address}-${index}`}>
                            <span className="ui label tiny basic" style={{ marginBottom: '0.5em' }}>
                              {address}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="disabled">-</div>
                    )}
                  </td>
                  <td>
                    {node.restAccessAddrs && node.restAccessAddrs.length > 0 ? (
                      <div>
                        {node.restAccessAddrs.map((address, index) => (
                          <div key={`${address}-${index}`}>
                            <span className="ui label tiny basic" style={{ marginBottom: '0.5em' }}>
                              {address}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="disabled">-</div>
                    )}
                  </td>
                  <td className="center">
                    {node.status.buildVersion.length > 0 ? <span>v{node.status.buildVersion}</span> : <span className="disabled">-</span>}
                  </td>
                  <td className="center">
                    {node.status.isActive ? (
                      <span className={node.status.cpuUsage > 0.8 ? 'red' : undefined}>{node.status.cpuUsageText}</span>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td className="center">
                    {node.status.isActive ? (
                      <span className={node.status.memUsage > 0.8 ? 'red' : undefined}>{node.status.memUsageText}</span>
                    ) : (
                      <span className="disabled">-</span>
                    )}
                  </td>
                  <td className="center">
                    {!node.isOn ? (
                      <span className="red">已停用</span>
                    ) : node.status.isActive ? (
                      <span className="green">运行中</span>
                    ) : node.status.updatedAt > 0 ? (
                      <span className="red">已断开</span>
                    ) : (
                      <span className="red">未连接</span>
                    )}
                  </td>
                  <td>
                    <a href={`#/settings/api/node?nodeId=${node.id}`}>详情</a> &nbsp;
                    <a href="" onClick={(event) => { event.preventDefault(); void deleteNode(node.id) }}>
                      删除
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <LegacyPagination html={data.page} />

      {creating ? (
        <CreateApiNodeModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void queryClient.invalidateQueries({ queryKey: ['settings-api-nodes'] })
          }}
        />
      ) : null}
      {upgradingNodeId > 0 ? (
        <UpgradeApiNodeModal
          nodeId={upgradingNodeId}
          onClose={() => {
            setUpgradingNodeId(0)
            void queryClient.invalidateQueries({ queryKey: ['settings-api-nodes'] })
          }}
        />
      ) : null}
    </div>
  )
}

interface MethodStat {
  id: number
  method: string
  tag: string
  costMs: number
  peekMs: number
  countCalls: number
}

interface MethodStatsData {
  order: string
  method: string
  tag: string
  stats: MethodStat[]
}

export function ApiMethodStatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const appliedMethod = searchParams.get('method') || ''
  const appliedTag = searchParams.get('tag') || ''
  const appliedOrder = searchParams.get('order') || ''
  const [method, setMethod] = useState(appliedMethod)
  const [tag, setTag] = useState(appliedTag)
  const [order, setOrder] = useState(appliedOrder)
  const query = useQuery({
    queryKey: ['settings-api-method-stats', appliedMethod, appliedTag, appliedOrder],
    queryFn: () => apiGet<MethodStatsData>('/settings/api/methodStats', { method: appliedMethod, tag: appliedTag, order: appliedOrder }),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (method) {
      next.set('method', method)
    }
    if (tag) {
      next.set('tag', tag)
    }
    if (order) {
      next.set('order', order)
    }
    setSearchParams(next)
  }

  const stats = query.data?.stats ?? []

  return (
    <div>
      <SettingsTabs kind="advanced" active="apiNodes" />
      <PageHeader items={[{ name: '节点列表', href: '#/settings/api' }, { name: '用时统计', href: '#/settings/api/methodStats', active: true }]} />
      <div className="margin" />
      <form className="ui form" onSubmit={submit}>
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="方法" value={method} onChange={(event) => setMethod(event.target.value)} />
          </div>
          <div className="ui field">
            <input type="text" placeholder="标签" value={tag} onChange={(event) => setTag(event.target.value)} />
          </div>
          <div className="ui field">
            <select className="ui dropdown auto-width" value={order} onChange={(event) => setOrder(event.target.value)}>
              <option value="">[排序]</option>
              <option value="method">方法</option>
              <option value="costMs.desc">平均耗时</option>
              <option value="peekMs.desc">峰值耗时</option>
              <option value="calls.desc">调用次数</option>
            </select>
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {appliedMethod.length > 0 || appliedTag.length > 0 || appliedOrder.length > 0 ? (
              <a
                href="#/settings/api/methodStats"
                onClick={(event) => {
                  event.preventDefault()
                  setMethod('')
                  setTag('')
                  setOrder('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                清除条件
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <div className="ui negative message">加载失败</div> : null}
      {!query.isLoading && stats.length === 0 ? <p className="comment">暂时还没有统计数据。</p> : null}
      {stats.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>方法</th>
              <th>标签</th>
              <th>平均耗时</th>
              <th>峰值耗时</th>
              <td>调用次数</td>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.id}>
                <td>{stat.method}</td>
                <td>{stat.tag}</td>
                <td>{stat.costMs}ms</td>
                <td>{stat.peekMs}ms</td>
                <td>{stat.countCalls}次</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}
