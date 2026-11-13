import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../../api/client'
import { useConfirm } from '../../../components/Confirm'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { LegacyPagination } from '../../../components/LegacyPagination'
import { PageHeader } from '../../../components/PageHeader'
import {
  AdminUserCell,
  Keyword,
  Modal,
  UserSelector,
  type AdminUser,
} from '../shared'
import { BatchUploadForm, CertDetailView, UpdateCertForm, UploadCertForm, type CertConfig } from './CertForms'

interface CertInfo {
  isOn: boolean
  beginDay: string
  endDay: string
  isExpired: boolean
  isAvailable: boolean
  countServers: number
  user: AdminUser
}

interface CertsData {
  type: string
  keyword: string
  userType: string
  searchingUserId: number
  user: AdminUser
  countAll: number
  countCA: number
  countAvailable: number
  countExpired: number
  count7Days: number
  count30Days: number
  certs: CertConfig[]
  certInfos: CertInfo[]
  page: string
}

type ModalState =
  | { type: 'none' }
  | { type: 'upload' }
  | { type: 'batch' }
  | { type: 'detail'; certId: number }
  | { type: 'update'; certId: number }

export function CertsPage({ initialModal }: { initialModal?: 'upload' | 'batch' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const toast = useToast()

  const type = searchParams.get('type') || ''
  const userType = searchParams.get('userType') || ''
  const keyword = searchParams.get('keyword') || ''
  const userId = Number(searchParams.get('userId') || 0) || 0
  const page = Number(searchParams.get('page') || 1) || 1

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [userIdInput, setUserIdInput] = useState(userId)
  const [modal, setModal] = useState<ModalState>(initialModal ? { type: initialModal } : { type: 'none' })

  useEffect(() => {
    setKeywordInput(keyword)
    setUserIdInput(userId)
  }, [keyword, userId])

  const query = useQuery({
    queryKey: ['certs', type, userType, keyword, userId, page],
    queryFn: () => apiGet<CertsData>('/servers/certs', { type, userType, keyword, userId, page }),
  })

  const remove = useMutation({
    mutationFn: (certId: number) => apiPost('/servers/certs/delete', { certId }),
    onSuccess: async () => {
      toast('删除成功')
      await queryClient.invalidateQueries({ queryKey: ['certs'] })
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

  function buildQuery(overrides: Record<string, string | number>): URLSearchParams {
    const next = new URLSearchParams()
    const values: Record<string, string | number> = {
      type,
      userType,
      keyword,
      userId,
      ...overrides,
    }
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && String(value).length > 0 && String(value) !== '0') {
        next.set(key, String(value))
      }
    }
    return next
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearchParams(buildQuery({ keyword: keywordInput, userId: userIdInput, page: 1 }))
  }

  async function deleteCert(cert: CertConfig) {
    if (!(await confirm({ message: '确定要删除此证书吗？', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate(cert.id)
  }

  const closeModal = () => setModal({ type: 'none' })

  return (
    <div>
      <PageHeader
        items={[
          { name: `所有证书(${data.countAll})`, href: `#/servers/certs?${buildQuery({ type: '' }).toString()}`, active: type === '' },
          { name: `CA证书(${data.countCA})`, href: `#/servers/certs?${buildQuery({ type: 'ca' }).toString()}`, active: type === 'ca' },
          { name: `有效证书(${data.countAvailable})`, href: `#/servers/certs?${buildQuery({ type: 'available' }).toString()}`, active: type === 'available' },
          { name: `过期证书(${data.countExpired})`, href: `#/servers/certs?${buildQuery({ type: 'expired' }).toString()}`, active: type === 'expired' },
          { name: `7天内过期(${data.count7Days})`, href: `#/servers/certs?${buildQuery({ type: '7days' }).toString()}`, active: type === '7days' },
          { name: `30天内过期(${data.count30Days})`, href: `#/servers/certs?${buildQuery({ type: '30days' }).toString()}`, active: type === '30days' },
        ]}
      >
        <a
          className="item"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            setModal({ type: 'upload' })
          }}
        >
          [上传证书]
        </a>
        <a
          className="item"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            setModal({ type: 'batch' })
          }}
        >
          [批量上传]
        </a>
      </PageHeader>

      <form className="ui form" onSubmit={submitSearch}>
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              placeholder="域名、说明等关键词"
              style={{ width: '12em' }}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </div>
          <div className="ui field">
            <UserSelector userId={userIdInput} onChange={setUserIdInput} />
          </div>
          <div className="ui field">
            <button type="submit" className="ui button">
              搜索
            </button>
            &nbsp;
            {keyword.length > 0 || userId > 0 ? (
              <a
                href="#/servers/certs"
                onClick={(event) => {
                  event.preventDefault()
                  setKeywordInput('')
                  setUserIdInput(0)
                  setSearchParams(buildQuery({ keyword: '', userId: 0, page: 1 }))
                }}
              >
                [清除条件]
              </a>
            ) : null}
          </div>
        </div>
      </form>

      {data.searchingUserId === 0 ? (
        <div>
          <div className="ui menu text basic tiny blue" style={{ marginBottom: 0 }}>
            <a
              className={`item${userType === '' ? ' active' : ''}`}
              href={`#/servers/certs?${buildQuery({ userType: '' }).toString()}`}
            >
              管理员证书
            </a>
            <a
              className={`item${userType === 'user' ? ' active' : ''}`}
              href={`#/servers/certs?${buildQuery({ userType: 'user' }).toString()}`}
            >
              用户证书
            </a>
          </div>
          <div className="ui divider" style={{ marginTop: 0 }} />
        </div>
      ) : null}

      {data.certs.length === 0 ? (
        <p className="comment">
          {data.searchingUserId > 0 ? '当前用户下' : ''}暂时还没有相关的证书。
        </p>
      ) : (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th>证书说明</th>
              <th>顶级发行组织</th>
              <th>域名</th>
              <th>生效日期</th>
              <th>过期日期</th>
              <th className="center">引用网站</th>
              <th>所属用户</th>
              <th className="center">状态</th>
              <th className="three op">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.certs.map((cert, index) => {
              const info = data.certInfos[index] || {
                isOn: false,
                beginDay: '',
                endDay: '',
                isExpired: true,
                isAvailable: false,
                countServers: 0,
                user: { id: 0 },
              }
              const commonNames = cert.commonNames || []
              return (
                <tr key={cert.id}>
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
                  <td>{info.beginDay}</td>
                  <td>{info.endDay}</td>
                  <td className="center">{info.countServers}</td>
                  <td>
                    <AdminUserCell user={info.user} />
                  </td>
                  <td className="center" style={{ whiteSpace: 'nowrap' }}>
                    {!info.isOn ? (
                      <span className="ui label red tiny basic">未启用</span>
                    ) : info.isExpired ? (
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
                        setModal({ type: 'detail', certId: cert.id })
                      }}
                    >
                      详情
                    </a>{' '}
                    &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        setModal({ type: 'update', certId: cert.id })
                      }}
                    >
                      修改
                    </a>{' '}
                    &nbsp;
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        void deleteCert(cert)
                      }}
                    >
                      删除
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <LegacyPagination html={data.page} />

      {modal.type === 'upload' ? (
        <Modal title="上传证书" onClose={closeModal} width="45em">
          <UploadCertForm userId={userId} onDone={closeModal} />
        </Modal>
      ) : null}
      {modal.type === 'batch' ? (
        <Modal title="批量上传证书" onClose={closeModal} width="45em">
          <BatchUploadForm userId={userId} onDone={() => closeModal()} />
        </Modal>
      ) : null}
      {modal.type === 'detail' ? (
        <Modal title="证书详情" onClose={closeModal} width="52em">
          <CertDetailView certId={modal.certId} />
        </Modal>
      ) : null}
      {modal.type === 'update' ? (
        <Modal title="修改证书" onClose={closeModal} width="45em">
          <UpdateCertForm certId={modal.certId} onDone={closeModal} />
        </Modal>
      ) : null}
    </div>
  )
}
