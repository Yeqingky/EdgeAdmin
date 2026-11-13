import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HardDrive, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { PageHeader } from '../../components/PageHeader'
import { StatusLabel } from '../../components/StatusLabel'
import { capacityText, ClusterComboBox, type CachePolicy, type CachePolicyTypeOption } from './common'

interface CachePolicyInfo {
  typeName: string
  countClusters: number
}

interface CacheListData {
  keyword: string
  clusterId: number
  storageType: string
  page: string
  cachePolicies: CachePolicy[] | null
  infos: CachePolicyInfo[]
  storageTypes: CachePolicyTypeOption[]
}

export function CacheListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const clusterId = Number(searchParams.get('clusterId') || 0) || 0
  const storageType = searchParams.get('storageType') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [clusterInput, setClusterInput] = useState(clusterId)

  const query = useQuery({
    queryKey: ['cache-policies', keyword, clusterId, storageType, page],
    queryFn: () =>
      apiGet<CacheListData>('/servers/components/cache', {
        keyword,
        clusterId,
        storageType,
        page,
      }),
  })

  const remove = useMutation({
    mutationFn: (cachePolicyId: number) => apiPost('/servers/components/cache/delete', { cachePolicyId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['cache-policies'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const policies = data.cachePolicies || []

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (keywordInput) {
      next.set('keyword', keywordInput)
    }
    if (clusterInput) {
      next.set('clusterId', String(clusterInput))
    }
    if (storageType) {
      next.set('storageType', storageType)
    }
    setSearchParams(next)
  }

  function changeStorageType(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('storageType', value)
    } else {
      next.delete('storageType')
    }
    next.delete('page')
    setSearchParams(next)
  }

  async function deletePolicy(policy: CachePolicy) {
    if (!(await confirm({ message: '确定要删除此缓存策略吗？', danger: true, confirmText: '删除' }))) {
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
          href="#/servers/components/cache/createPopup"
          onClick={(event) => {
            event.preventDefault()
            navigate('/servers/components/cache/createPopup')
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
            <select className="ui dropdown" name="storageType" value={storageType} onChange={(event) => changeStorageType(event.target.value)}>
              <option value="">[存储类型]</option>
              {data.storageTypes.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            &nbsp;
            {keyword.length > 0 || clusterId > 0 || storageType.length > 0 ? (
              <a
                href="#/servers/components/cache"
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

      {policies.length === 0 ? <p className="comment">暂时还没有缓存策略。</p> : null}

      {policies.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>策略名称</th>
              <th>策略类型</th>
              <th>容量</th>
              <th className="center">集群数</th>
              <th className="center">状态</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy, index) => {
              const info = data.infos[index] || { typeName: policy.type, countClusters: 0 }
              const memoryCapacity = policy.options?.memoryPolicy?.capacity
              return (
                <tr key={policy.id}>
                  <td>
                    <a href={`#/servers/components/cache/policy?cachePolicyId=${policy.id}`}>
                      {policy.name}
                      {policy.type === 'file' ? (
                        <>
                          &nbsp;
                          <span title="硬盘"><HardDrive size={13} className="blue" /></span>
                        </>
                      ) : null}
                    </a>
                  </td>
                  <td>
                    {info.typeName} <span className="small">（{policy.type}）</span>
                  </td>
                  <td>
                    {capacityText(policy.capacity) ? (
                      <span>
                        {capacityText(policy.capacity)}
                        {policy.type === 'file' && memoryCapacity && memoryCapacity.count > 0 ? (
                          <span className="small grey" title="内存容量">
                            （内存：{capacityText(memoryCapacity)}）
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="disabled">不限</span>
                    )}
                  </td>
                  <td className="center">{info.countClusters}</td>
                  <td className="center">
                    <StatusLabel isOn={policy.isOn} />
                  </td>
                  <td>
                    <a href={`#/servers/components/cache/policy?cachePolicyId=${policy.id}`}>详情</a> &nbsp;
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
              )
            })}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />
    </div>
  )
}
