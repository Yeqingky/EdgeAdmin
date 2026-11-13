import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { LegacyPagination } from '../../components/LegacyPagination'
import { MenuLinks } from './ui'
import { postForm, type DNSProvidersData } from './shared'

export function DnsProvidersPage() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const domain = searchParams.get('domain') || ''
  const providerType = searchParams.get('providerType') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [draft, setDraft] = useState({ keyword, domain, providerType })

  const query = useQuery({
    queryKey: ['dns-providers', keyword, domain, providerType, page],
    queryFn: () =>
      apiGet<DNSProvidersData>('/dns/providers', {
        keyword: keyword || undefined,
        domain: domain || undefined,
        providerType: providerType || undefined,
        page: page > 1 ? page : undefined,
      }),
  })

  const remove = useMutation({
    mutationFn: (providerId: number) => postForm('/dns/providers/delete', { providerId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['dns-providers'] })
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

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (draft.keyword) {
      next.set('keyword', draft.keyword)
    }
    if (draft.domain) {
      next.set('domain', draft.domain)
    }
    if (draft.providerType) {
      next.set('providerType', draft.providerType)
    }
    setSearchParams(next)
  }

  async function deleteProvider(providerId: number) {
    if (!(await confirm({ message: '确定要删除这个DNS服务商账号吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(providerId)
  }

  const hasFilter = keyword || domain || providerType

  return (
    <div>
      <MenuLinks
        items={[
          { name: '所有集群', to: '/dns' },
          { name: 'DNS服务商', to: '/dns/providers', active: true },
          { name: '[添加DNS账号信息]', to: '/dns/providers/createPopup' },
        ]}
      />

      <form className="ui form" onSubmit={submit}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="账号说明..."
              value={draft.keyword}
              onChange={(event) => setDraft({ ...draft, keyword: event.target.value })}
            />
          </div>
          <div className="ui field">
            <input
              type="text"
              placeholder="域名..."
              value={draft.domain}
              onChange={(event) => setDraft({ ...draft, domain: event.target.value })}
            />
          </div>
          {data.providerTypes.length > 0 ? (
            <div className="ui field">
              <select
                className="ui dropdown auto-width"
                value={draft.providerType}
                onChange={(event) => setDraft({ ...draft, providerType: event.target.value })}
              >
                <option value="">[服务商厂家]</option>
                {data.providerTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.name}({type.count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;
            {hasFilter ? (
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setDraft({ keyword: '', domain: '', providerType: '' })
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {data.providers.length === 0 ? <p className="comment">暂时还没有第三方DNS服务商。</p> : null}

      {data.providers.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>账号说明</th>
              <th className="three wide">服务商</th>
              <th className="center">域名</th>
              <th className="two op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.providers.map((provider) => (
              <tr key={provider.id}>
                <td>
                  <Link to={`/dns/providers/provider?providerId=${provider.id}`}>{provider.name}</Link>
                </td>
                <td>{provider.typeName}</td>
                <td className="center">{provider.countDomains === 0 ? <span className="disabled">0</span> : provider.countDomains}</td>
                <td>
                  <Link to={`/dns/providers/provider?providerId=${provider.id}`}>详情</Link> &nbsp; &nbsp;{' '}
                  <a href="" onClick={(event) => { event.preventDefault(); void deleteProvider(provider.id) }}>
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      <div style={{ marginTop: '1em' }}>
        <button className="ui button primary" type="button" onClick={() => navigate('/dns/providers/createPopup')}>
          添加DNS账号信息
        </button>
      </div>
    </div>
  )
}
