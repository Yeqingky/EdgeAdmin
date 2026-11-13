import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { Keyword, Modal, postForm } from '../shared'
import { CertDetailView } from './CertForms'

interface OcspCert {
  id: number
  isOn: boolean
  dnsNames: string[] | null
  commonNames: string[] | null
  hasOCSP: boolean
  ocspIsUpdated: boolean
  ocspError: string
  isCA: boolean
  isACME: boolean
  name: string
  isExpired: boolean
  beginDay: string
  endDay: string
}

interface OcspData {
  keyword: string
  page: string
  certs: OcspCert[]
}

export function OcspPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const keyword = searchParams.get('keyword') || ''
  const page = Number(searchParams.get('page') || 1) || 1
  const [keywordInput, setKeywordInput] = useState(keyword)
  const [certIds, setCertIds] = useState<number[]>([])
  const [detailCertId, setDetailCertId] = useState(0)

  const query = useQuery({
    queryKey: ['certs-ocsp', keyword, page],
    queryFn: () => apiGet<OcspData>('/servers/certs/ocsp', { keyword, page }),
  })

  const reset = useMutation({
    mutationFn: (ids: number[]) => (ids.length === 0 ? apiPost('/servers/certs/ocsp/resetAll', {}) : postForm('/servers/certs/ocsp/reset', { certIds: ids })),
    onSuccess: async () => {
      toast('操作成功，将很快开始重试')
      setCertIds([])
      await queryClient.invalidateQueries({ queryKey: ['certs-ocsp'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const ignore = useMutation({
    mutationFn: (ids: number[]) => postForm('/servers/certs/ocsp/ignore', { certIds: ids }),
    onSuccess: async () => {
      toast('忽略成功')
      setCertIds([])
      await queryClient.invalidateQueries({ queryKey: ['certs-ocsp'] })
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
  const allChecked = data.certs.length > 0 && certIds.length === data.certs.length

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (keywordInput) {
      next.set('keyword', keywordInput)
    }
    setSearchParams(next)
  }

  function toggle(certId: number, checked: boolean) {
    setCertIds((current) => (checked ? [...current, certId] : current.filter((id) => id !== certId)))
  }

  return (
    <div>
      <div className="ui menu text blue first-menu">
        <a className="item active" href="/servers/certs">
          所有证书
        </a>
        <a className="item" href="/servers/certs/acme">
          申请证书
        </a>
        <a className="item active" href="/servers/certs/ocsp">
          OCSP
        </a>
      </div>

      <div className="margin" />

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="关键词"
              style={{ width: '10em' }}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <button className="ui button small">搜索</button>
            &nbsp;{' '}
            {keyword.length > 0 ? (
              <a
                href="/servers/certs/ocsp"
                onClick={(event) => {
                  event.preventDefault()
                  setKeywordInput('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>
      <div className="margin" />

      {data.certs.length > 0 ? (
        <div className="ui divider" />
      ) : null}
      {data.certs.length > 0 ? (
        <div className="ui fields inline">
          {certIds.length === 0 ? (
            <div className="ui field">
              <button className="ui button small basic" type="button" onClick={() => reset.mutate([])}>
                重试所有证书
              </button>
            </div>
          ) : null}
          {certIds.length > 0 ? (
            <div className="ui field">
              <button className="ui button small basic" type="button" onClick={() => reset.mutate(certIds)}>
                重试选中证书
              </button>
            </div>
          ) : null}
          {certIds.length > 0 ? (
            <div className="ui field">
              <button className="ui button small basic" type="button" onClick={() => ignore.mutate(certIds)}>
                忽略选中证书
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.certs.length === 0 ? <p className="comment">暂时没有OCSP日志。</p> : null}

      {data.certs.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '1em' }}>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) => setCertIds(event.target.checked ? data.certs.map((cert) => cert.id) : [])}
                  />
                  <label />
                </div>
              </th>
              <th>证书说明</th>
              <th>顶级发行组织</th>
              <th>域名</th>
              <th className="six wide">更新错误信息</th>
              <th className="center">状态</th>
              <th className="one op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.certs.map((cert) => {
              const commonNames = cert.commonNames || []
              return (
                <tr key={cert.id}>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={certIds.includes(cert.id)} onChange={(event) => toggle(cert.id, event.target.checked)} />
                      <label />
                    </div>
                  </td>
                  <td>
                    <Keyword word={keyword} text={cert.name} />
                    {cert.isCA ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <span className="ui label olive tiny basic">CA</span>
                      </div>
                    ) : null}
                    {cert.isACME ? (
                      <div style={{ marginTop: '0.5em' }}>
                        <span className="ui label olive tiny basic" title="通过ACME协议免费申请">
                          ACME
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td>{commonNames.length > 0 ? commonNames[commonNames.length - 1] : null}</td>
                  <td>
                    {(cert.dnsNames || []).map((dnsName) => (
                      <div key={dnsName} style={{ marginBottom: '0.4em' }}>
                        <span className="ui label tiny basic">
                          <Keyword word={keyword} text={dnsName} />
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ wordBreak: 'break-all' }}>
                    <span className="red">{cert.ocspError}</span>
                  </td>
                  <td className="center" style={{ whiteSpace: 'nowrap' }}>
                    {!cert.isOn ? (
                      <span className="ui label red tiny basic">未启用</span>
                    ) : cert.isExpired ? (
                      <span className="ui label red tiny basic">已过期</span>
                    ) : (
                      <span className="ui label green tiny basic">有效中</span>
                    )}
                  </td>
                  <td>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setDetailCertId(cert.id)
                      }}
                    >
                      详情
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      <LegacyPagination html={data.page} />

      {detailCertId > 0 ? (
        <Modal title="证书详情" onClose={() => setDetailCertId(0)} width="52em">
          <CertDetailView certId={detailCertId} />
        </Modal>
      ) : null}
    </div>
  )
}
