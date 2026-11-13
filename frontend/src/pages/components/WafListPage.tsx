import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { PageHeader } from '../../components/PageHeader'
import { ClusterComboBox, type WafModeInfo } from './common'

interface WafPolicyListItem {
  id: number
  isOn: boolean
  name: string
  mode: string
  modeInfo: WafModeInfo | null
  countInbound: number
  countOutbound: number
  countClusters: number
}

interface WafListData {
  keyword: string
  clusterId: number
  page: string
  policies: WafPolicyListItem[]
}

export function WafListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const clusterId = Number(searchParams.get('clusterId') || 0) || 0
  const page = Number(searchParams.get('page') || 1) || 1
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [clusterInput, setClusterInput] = useState(clusterId)

  const query = useQuery({
    queryKey: ['waf-policies', keyword, clusterId, page],
    queryFn: () => apiGet<WafListData>('/servers/components/waf', { keyword, clusterId, page }),
  })

  const remove = useMutation({
    mutationFn: (firewallPolicyId: number) => apiPost('/servers/components/waf/delete', { firewallPolicyId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['waf-policies'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const policies = query.data.policies || []

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (keywordInput) {
      next.set('keyword', keywordInput)
    }
    if (clusterInput) {
      next.set('clusterId', String(clusterInput))
    }
    setSearchParams(next)
  }

  async function deletePolicy(policy: WafPolicyListItem) {
    if (!(await confirm({ message: '确定要删除此WAF策略吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(policy.id)
  }

  return (
    <div>
      <PageHeader items={[{ name: '列表', active: true }]}>
        <span className="item disabled">|</span>
        <a
          className="item"
          href="/servers/components/waf/createPopup"
          onClick={(event) => {
            event.preventDefault()
            navigate('/servers/components/waf/createPopup')
          }}
        >
          [创建]
        </a>
      </PageHeader>

      <div className="margin" />

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <ClusterComboBox value={clusterInput} onChange={setClusterInput} />
          </div>
          <div className="ui field">
            <input
              type="text"
              name="keyword"
              placeholder="策略名称..."
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            &nbsp;
            {keyword.length > 0 || clusterId > 0 ? (
              <a
                href="/servers/components/waf"
                onClick={(event) => {
                  event.preventDefault()
                  setKeywordInput('')
                  setClusterInput(0)
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {policies.length === 0 ? <p className="comment">暂时还没有WAF策略。</p> : null}

      {policies.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>策略名称</th>
              <th className="center">入站规则分组</th>
              <th className="center">出站规则分组</th>
              <th className="center">集群数</th>
              <th className="two wide center">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td>
                  <a href={`/servers/components/waf/policy?firewallPolicyId=${policy.id}`}>{policy.name}</a>
                </td>
                <td className="center">
                  <a href={`/servers/components/waf/groups?firewallPolicyId=${policy.id}&type=inbound`}>
                    <span className={policy.countInbound === 0 ? 'disabled' : undefined}>{policy.countInbound}</span>
                  </a>
                </td>
                <td className="center">
                  <a href={`/servers/components/waf/groups?firewallPolicyId=${policy.id}&type=outbound`}>
                    <span className={policy.countOutbound === 0 ? 'disabled' : undefined}>{policy.countOutbound}</span>
                  </a>
                </td>
                <td className="center">{policy.countClusters}</td>
                <td className="center">
                  {!policy.isOn ? (
                    <span className="red">已停用</span>
                  ) : policy.modeInfo ? (
                    <span
                      className={
                        policy.modeInfo.code === 'defend'
                          ? 'green'
                          : policy.modeInfo.code === 'observe'
                            ? 'blue'
                            : 'grey'
                      }
                    >
                      {policy.modeInfo.name}
                    </span>
                  ) : null}
                </td>
                <td>
                  <a href={`/servers/components/waf/policy?firewallPolicyId=${policy.id}`}>详情</a> &nbsp;
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      void deletePolicy(policy)
                    }}
                  >
                    <Trash2 size={13} /> 删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <LegacyPagination html={query.data.page} />
    </div>
  )
}

interface WafSelectData {
  policies: WafPolicyListItem[]
  page: string
}

export function WafSelectPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['waf-select'],
    queryFn: () => apiGet<WafSelectData>('/servers/components/waf/selectPopup'),
  })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  return (
    <div>
      <h3>选择WAF策略</h3>
      <table className="ui table selectable celled">
        <thead>
          <tr>
            <th>策略名称</th>
            <th style={{ width: '7em' }}>状态</th>
            <th className="two op">操作</th>
          </tr>
        </thead>
        <tbody>
          {query.data.policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.name}</td>
              <td>{policy.isOn ? <span className="ui label green basic">已启用</span> : <span className="ui label grey basic">已禁用</span>}</td>
              <td>
                {policy.isOn ? (
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      navigate(`/servers/components/waf/policy?firewallPolicyId=${policy.id}`)
                    }}
                  >
                    选择
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <LegacyPagination html={query.data.page} />
    </div>
  )
}
