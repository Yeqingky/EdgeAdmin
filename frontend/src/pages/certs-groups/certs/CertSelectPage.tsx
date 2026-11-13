import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { Keyword, UserSelector } from '../shared'
import type { CertConfig } from './CertForms'

interface CertInfo {
  beginDay: string
  endDay: string
  isExpired: boolean
  isAvailable: boolean
  countServers: number
  isSelected: boolean
}

interface SelectData {
  searchingServerId: number
  userId: number
  searchingUserId: number
  baseURL: string
  allSearchingDomains: string
  searchingDomains: string[]
  keyword: string
  selectedCertIds: string
  searchingType: string
  viewSize: string
  totalAll: number
  totalMatch: number
  certs: CertConfig[]
  certInfos: CertInfo[]
  page: string
}

export function CertSelectPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const userId = Number(searchParams.get('userId') || 0) || 0
  const keyword = searchParams.get('keyword') || ''
  const searchingDomains = searchParams.get('searchingDomains') || ''
  const searchingType = searchParams.get('searchingType') || ''
  const viewSize = searchParams.get('viewSize') || 'normal'
  const selectedCertIds = searchParams.get('selectedCertIds') || ''
  const page = Number(searchParams.get('page') || 1) || 1

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [userIdInput, setUserIdInput] = useState(userId)
  const [checked, setChecked] = useState<number[]>([])

  useEffect(() => {
    setKeywordInput(keyword)
    setUserIdInput(userId)
  }, [keyword, userId])

  const query = useQuery({
    queryKey: ['certs-select', serverId, userId, keyword, searchingDomains, searchingType, viewSize, selectedCertIds, page],
    queryFn: () =>
      apiGet<SelectData>('/servers/certs/selectPopup', {
        serverId,
        userId,
        keyword,
        searchingDomains,
        searchingType,
        viewSize,
        selectedCertIds,
        page,
      }),
  })

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const domains = data.searchingDomains || []

  function buildQuery(overrides: Record<string, string | number>): URLSearchParams {
    const next = new URLSearchParams()
    const values: Record<string, string | number> = {
      serverId,
      userId,
      keyword,
      searchingDomains,
      searchingType,
      viewSize,
      selectedCertIds,
      ...overrides,
    }
    for (const [key, value] of Object.entries(values)) {
      if (String(value).length > 0 && String(value) !== '0') {
        next.set(key, String(value))
      }
    }
    return next
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearchParams(buildQuery({ userId: userIdInput, keyword: keywordInput, page: 1 }))
  }

  function confirmSelection() {
    toast(`已选择${checked.length}个证书`)
    navigate(-1)
  }

  return (
    <div>
      <h3>
        选择证书
        {domains.length > 0 ? (
          <span>
            （当前网站域名：{domains[0]}
            {domains.length > 1 ? `等${domains.length}个域名` : ''}）
          </span>
        ) : null}
      </h3>

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <UserSelector userId={userIdInput} onChange={setUserIdInput} />
          </div>
          <div className="ui field">
            <input
              type="text"
              name="keyword"
              placeholder="域名、说明文字等"
              size={30}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
            &nbsp;{' '}
            {keyword.length > 0 ? (
              <a
                href={`/servers/certs/selectPopup?${buildQuery({ keyword: '', page: 1 }).toString()}`}
                onClick={(event) => {
                  event.preventDefault()
                  setKeywordInput('')
                  setSearchParams(buildQuery({ keyword: '', page: 1 }))
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {domains.length > 0 ? (
        <div>
          <div className="ui divider" style={{ marginBottom: 0 }} />
          <div className="ui menu text blue">
            <span className="item">{data.searchingUserId > 0 ? '当前用户' : '未指定用户'} »</span>
            <a className={`item${data.searchingType === 'all' ? ' active' : ''}`} href={`/servers/certs/selectPopup?${buildQuery({ searchingType: 'all' }).toString()}`}>
              所有证书 <span className="small">({data.totalAll})</span>
            </a>
            <span className="item disabled">|</span>
            <a
              className={`item${data.searchingType === 'match' ? ' active' : ''}`}
              href={`/servers/certs/selectPopup?${buildQuery({ searchingType: 'match' }).toString()}`}
            >
              域名匹配证书 <span className="small">({data.totalMatch})</span>
            </a>
          </div>
        </div>
      ) : null}

      {checked.length > 0 ? (
        <div>
          <div className="margin" />
          <button className="ui button small basic" type="button" onClick={confirmSelection}>
            使用选中的{checked.length}个证书
          </button>
        </div>
      ) : null}

      {data.certs.length === 0 ? (
        <p className="comment">
          {data.searchingUserId > 0 ? '当前用户下' : ''}暂时还没有{data.searchingType === 'match' ? '跟所添加域名匹配的' : ''}相关证书
          {data.searchingUserId > 0 ? (
            <>
              ，
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setUserIdInput(0)
                  setSearchParams(buildQuery({ userId: 0, page: 1 }))
                }}
              >
                [尝试搜索管理员上传和申请的证书]
              </a>
            </>
          ) : null}
          。
        </p>
      ) : null}

      {data.certs.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '1em' }}>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={data.certs.length > 0 && checked.length === data.certs.filter((_, index) => !data.certInfos[index]?.isSelected).length}
                    onChange={(event) =>
                      setChecked(
                        event.target.checked
                          ? data.certs.filter((_, index) => !data.certInfos[index]?.isSelected).map((cert) => cert.id)
                          : [],
                      )
                    }
                  />
                  <label />
                </div>
              </th>
              <th>证书说明</th>
              <th>域名</th>
              <th>过期日期</th>
              {viewSize === 'normal' ? <th>引用网站</th> : null}
              <th>状态</th>
              <th className="one op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.certs.map((cert, index) => {
              const info = data.certInfos[index] || {
                beginDay: '',
                endDay: '',
                isExpired: true,
                isAvailable: false,
                countServers: 0,
                isSelected: false,
              }
              const commonNames = cert.commonNames || []
              return (
                <tr key={cert.id}>
                  <td>
                    {!info.isSelected ? (
                      <div className="ui checkbox">
                        <input
                          type="checkbox"
                          checked={checked.includes(cert.id)}
                          onChange={(event) =>
                            setChecked((current) => (event.target.checked ? [...current, cert.id] : current.filter((id) => id !== cert.id)))
                          }
                        />
                        <label />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {!info.isSelected ? (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setChecked([cert.id])
                        }}
                      >
                        <Keyword word={keyword} text={cert.name} />
                      </a>
                    ) : (
                      <span>{cert.name}</span>
                    )}
                    {commonNames.length > 0 ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <span className="grey small">{commonNames[commonNames.length - 1]}</span>
                      </div>
                    ) : null}
                    {cert.isCA ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <span className="ui label olive tiny">CA</span>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {(cert.dnsNames || []).map((dnsName) => (
                      <div key={dnsName} style={{ marginBottom: '0.4em' }}>
                        <span className="ui label tiny basic">
                          <Keyword word={keyword} text={dnsName} />
                        </span>
                      </div>
                    ))}
                  </td>
                  <td>{info.endDay}</td>
                  {viewSize === 'normal' ? <td>{info.countServers}</td> : null}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {info.isExpired ? <span className="ui label red tiny basic">已过期</span> : <span className="ui label green tiny basic">有效中</span>}
                  </td>
                  <td>
                    {!info.isSelected ? (
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          setChecked([cert.id])
                        }}
                      >
                        选择
                      </a>
                    ) : (
                      <span>已选</span>
                    )}
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
