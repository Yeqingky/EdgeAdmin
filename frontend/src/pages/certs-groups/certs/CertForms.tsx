import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable } from '../../../components/form'
import { SubmitRow, UserSelector, postForm, postFormWithCsrf } from '../shared'

export interface CertConfig {
  id: number
  isOn: boolean
  name: string
  description?: string
  dnsNames?: string[]
  commonNames?: string[]
  isCA: boolean
  isACME?: boolean
  timeBeginAt?: number
  timeEndAt?: number
  certData?: string | null
  keyData?: string | null
}

export interface CertDetailInfo {
  id: number
  name: string
  description: string
  isOn: boolean
  isAvailable: boolean
  commonNames: string[]
  dnsNames: string[]
  beginTime: string
  endTime: string
  isCA: boolean
  certString: string
  keyString: string
}

export interface CertServerRef {
  id: number
  isOn: boolean
  name: string
  type: string
}

export interface CertDetailData {
  info: CertDetailInfo
  servers: CertServerRef[] | null
}

export function CertDetailView({ certId }: { certId: number }) {
  const query = useQuery({
    queryKey: ['cert-detail', certId],
    queryFn: () => apiGet<CertDetailData>('/servers/certs/certPopup', { certId }),
  })
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const { info, servers } = query.data
  const commonNames = info.commonNames || []
  return (
    <table className="ui table definition selectable">
      <tbody>
        <tr>
          <td className="title">证书说明</td>
          <td>{info.name}</td>
        </tr>
        {info.description ? (
          <tr>
            <td>详细说明</td>
            <td>{info.description}</td>
          </tr>
        ) : null}
        <tr>
          <td>证书状态</td>
          <td>
            {info.isAvailable ? <span className="ui label small green basic">有效中</span> : <span className="ui label small red basic">已过期</span>}
          </td>
        </tr>
        <tr>
          <td>发行信息</td>
          <td>
            {commonNames.map((commonName, index) => (
              <div key={`${commonName}-${index}`} style={{ paddingLeft: `${index * 1.2}em` }}>
                {commonName}
              </div>
            ))}
          </td>
        </tr>
        <tr>
          <td>域名</td>
          <td>
            {(info.dnsNames || []).map((dnsName) => (
              <span key={dnsName} className="ui label small basic" style={{ marginBottom: '0.3em' }}>
                {dnsName}
              </span>
            ))}
          </td>
        </tr>
        <tr>
          <td>有效期</td>
          <td>
            {info.beginTime} - {info.endTime}
          </td>
        </tr>
        <tr>
          <td>引用网站</td>
          <td>
            {!servers || servers.length === 0 ? (
              <span className="disabled">暂时没有引用此证书的网站。</span>
            ) : (
              <div>
                {servers.map((server) => (
                  <a key={server.id} href={`#/servers/server?serverId=${server.id}`} className="ui label small basic">
                    {server.name}
                  </a>
                ))}
              </div>
            )}
          </td>
        </tr>
        <tr>
          <td>证书文件下载</td>
          <td>
            <a href={`/servers/certs/downloadZip?certId=${info.id}`} target="_blank" rel="noreferrer">
              [ZIP下载]
            </a>{' '}
            &nbsp;
            <a href={`/servers/certs/downloadCert?certId=${info.id}`} target="_blank" rel="noreferrer">
              [证书下载]
            </a>{' '}
            &nbsp;
            {!info.isCA ? (
              <a href={`/servers/certs/downloadKey?certId=${info.id}`} target="_blank" rel="noreferrer">
                [私钥下载]
              </a>
            ) : null}
          </td>
        </tr>
        <tr>
          <td>证书预览</td>
          <td>
            <pre className="pre-box" style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace", whiteSpace: 'pre-wrap' }}>
              {info.certString}
            </pre>
            <div style={{ marginTop: '1em' }}>
              <a href={`/servers/certs/viewCert?certId=${info.id}`} target="_blank" rel="noreferrer">
                [浏览器新窗口打开]
              </a>
            </div>
          </td>
        </tr>
        {!info.isCA ? (
          <tr>
            <td>私钥预览</td>
            <td>
              <pre className="pre-box" style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace", whiteSpace: 'pre-wrap' }}>
                {info.keyString}
              </pre>
              <div style={{ marginTop: '1em' }}>
                <a href={`/servers/certs/viewKey?certId=${info.id}`} target="_blank" rel="noreferrer">
                  [浏览器新窗口打开]
                </a>
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

interface UploadData {
  userId: number
}

export function UploadCertForm({
  userId: initialUserId = 0,
  onDone,
}: {
  userId?: number
  onDone?: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [userId, setUserId] = useState(initialUserId)
  const [isCA, setIsCA] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [certText, setCertText] = useState('')
  const [keyText, setKeyText] = useState('')

  const dataQuery = useQuery({
    queryKey: ['cert-upload-data'],
    queryFn: () => apiGet<UploadData>('/servers/certs/uploadPopup', {}),
  })
  useEffect(() => {
    if (dataQuery.data && dataQuery.data.userId > 0) {
      setUserId(dataQuery.data.userId)
    }
  }, [dataQuery.data])

  const mutation = useMutation({
    mutationFn: () =>
      postForm<unknown>('/servers/certs/uploadPopup', {
        userId,
        textMode,
        name,
        isCA,
        description,
        isOn,
        certFile: certFile || undefined,
        keyFile: keyFile || undefined,
        certText,
        keyText,
      }),
    onSuccess: async () => {
      toast('上传成功')
      await queryClient.invalidateQueries({ queryKey: ['certs'] })
      onDone?.()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('请输入证书说明', 'error')
      return
    }
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <tbody>
          <FormRow title={<span className="title">证书说明 *</span>}>
            <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            <p className="comment">可以简单说明证书的用途。</p>
          </FormRow>
          <FormRow title="所属用户">
            <UserSelector userId={userId} onChange={setUserId} />
            <p className="comment">可选项，当前证书所属用户。</p>
          </FormRow>
          <FormRow title="证书类型 *">
            <select className="ui dropdown auto-width" value={isCA ? '1' : '0'} onChange={(event) => setIsCA(event.target.value === '1')}>
              <option value="0">加密证书</option>
              <option value="1">CA证书</option>
            </select>
          </FormRow>
          <FormRow
            title={
              <span>
                {textMode ? '输入证书内容' : '选择证书文件'} *
              </span>
            }
          >
            {textMode ? (
              <textarea
                rows={6}
                spellCheck={false}
                placeholder="-----BEGIN CERTIFICATE-----"
                value={certText}
                onChange={(event) => setCertText(event.target.value)}
                style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: '0.7em' }}
              />
            ) : (
              <input
                type="file"
                accept="application/x-pem-file, application/pkcs10, application/x-pkcs12, application/x-x509-user-cert, application/x-x509-ca-cert, application/pkix-cert, .pem"
                onChange={(event) => setCertFile(event.target.files?.[0] || null)}
              />
            )}
            <p className="comment">
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setTextMode(!textMode)
                }}
              >
                [{textMode ? '上传文件' : '输入内容'}]
              </a>
              。文件内容中通常含有"-----BEGIN CERTIFICATE-----"类似的信息{textMode ? '，可以直接拖动证书文件到输入框' : ''}。
            </p>
          </FormRow>
          {!isCA ? (
            <FormRow
              title={
                <span>
                  {textMode ? '输入私钥内容' : '选择私钥文件'} *
                </span>
              }
            >
              {textMode ? (
                <textarea
                  rows={6}
                  spellCheck={false}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  value={keyText}
                  onChange={(event) => setKeyText(event.target.value)}
                  style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: '0.7em' }}
                />
              ) : (
                <input
                  type="file"
                  accept="application/pkcs8, application/x-pem-file, .key, .pem"
                  onChange={(event) => setKeyFile(event.target.files?.[0] || null)}
                />
              )}
              <p className="comment">
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setTextMode(!textMode)
                  }}
                >
                  [{textMode ? '上传文件' : '输入内容'}]
                </a>
                。文件内容中通常含有"-----BEGIN RSA PRIVATE KEY-----"类似的信息{textMode ? '，可以直接拖动私钥文件到输入框' : ''}。
              </p>
            </FormRow>
          ) : null}
          <FormRow title="详细说明">
            <textarea rows={3} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormRow>
          <FormRow title="启用当前证书">
            <Checkbox checked={isOn} onChange={setIsOn} />
          </FormRow>
        </tbody>
      </FormTable>
      <SubmitRow submitting={mutation.isPending}>上传</SubmitRow>
    </form>
  )
}

interface UpdateData {
  certConfig: CertConfig
}

export function UpdateCertForm({ certId, onDone }: { certId: number; onDone?: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const dataQuery = useQuery({
    queryKey: ['cert-update', certId],
    queryFn: () => apiGet<UpdateData>('/servers/certs/updatePopup', { certId }),
  })
  const [config, setConfig] = useState<CertConfig | null>(null)
  const [textMode, setTextMode] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [keyFile, setKeyFile] = useState<File | null>(null)
  const [certText, setCertText] = useState('')
  const [keyText, setKeyText] = useState('')

  useEffect(() => {
    if (dataQuery.data) {
      setConfig(dataQuery.data.certConfig)
    }
  }, [dataQuery.data])

  const mutation = useMutation({
    mutationFn: () => {
      if (!config) {
        throw new Error('证书加载失败')
      }
      return postForm<unknown>('/servers/certs/updatePopup', {
        certId,
        textMode,
        name: config.name,
        isCA: config.isCA,
        description: config.description || '',
        isOn: config.isOn,
        certFile: certFile || undefined,
        keyFile: keyFile || undefined,
        certText,
        keyText,
      })
    },
    onSuccess: async () => {
      toast('修改成功')
      await queryClient.invalidateQueries({ queryKey: ['certs'] })
      onDone?.()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (dataQuery.isError) {
    return <div className="ui negative message">加载失败</div>
  }
  if (dataQuery.isLoading || !config) {
    return <LoadingBlock />
  }

  const dnsNames = config.dnsNames || []

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form className="ui form" onSubmit={submit}>
      <h3>
        修改证书
        {dnsNames.length > 0 ? (
          <span>
            &nbsp; （包含{dnsNames[0]}
            {dnsNames.length > 1 ? `等${dnsNames.length}个` : ''}域名）
          </span>
        ) : null}
      </h3>
      <FormTable>
        <tbody>
          <FormRow title={<span className="title">证书说明 *</span>}>
            <input
              type="text"
              maxLength={100}
              value={config.name}
              onChange={(event) => setConfig({ ...config, name: event.target.value })}
            />
            <p className="comment">可以简单说明证书的用途。</p>
          </FormRow>
          <FormRow title="证书类型">
            <select
              className="ui dropdown auto-width"
              value={config.isCA ? '1' : '0'}
              onChange={(event) => setConfig({ ...config, isCA: event.target.value === '1' })}
            >
              <option value="0">加密证书</option>
              <option value="1">CA证书</option>
            </select>
          </FormRow>
          <FormRow title={textMode ? '输入证书内容' : '选择证书文件'}>
            {textMode ? (
              <textarea
                rows={6}
                spellCheck={false}
                placeholder="-----BEGIN CERTIFICATE-----"
                value={certText}
                onChange={(event) => setCertText(event.target.value)}
                style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: '0.7em' }}
              />
            ) : (
              <input
                type="file"
                accept="application/x-pem-file, application/pkcs10, application/x-pkcs12, application/x-x509-user-cert, application/x-x509-ca-cert, application/pkix-cert, .pem"
                onChange={(event) => setCertFile(event.target.files?.[0] || null)}
              />
            )}
            <p className="comment">
              <a
                href=""
                onClick={(event) => {
                  event.preventDefault()
                  setTextMode(!textMode)
                }}
              >
                [{textMode ? '上传文件' : '输入内容'}]
              </a>
              。文件内容中通常含有"-----BEGIN CERTIFICATE-----"类似的信息{textMode ? '，留空表示不修改' : ''}。
            </p>
          </FormRow>
          {!config.isCA ? (
            <FormRow title={textMode ? '输入私钥内容' : '选择私钥文件'}>
              {textMode ? (
                <textarea
                  rows={6}
                  spellCheck={false}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  value={keyText}
                  onChange={(event) => setKeyText(event.target.value)}
                  style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: '0.7em' }}
                />
              ) : (
                <input
                  type="file"
                  accept="application/pkcs8, .key"
                  onChange={(event) => setKeyFile(event.target.files?.[0] || null)}
                />
              )}
              <p className="comment">
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setTextMode(!textMode)
                  }}
                >
                  [{textMode ? '上传文件' : '输入内容'}]
                </a>
                。留空表示不修改。
              </p>
            </FormRow>
          ) : null}
          <FormRow title="详细说明">
            <textarea
              rows={3}
              maxLength={200}
              value={config.description || ''}
              onChange={(event) => setConfig({ ...config, description: event.target.value })}
            />
          </FormRow>
          <FormRow title="启用当前证书">
            <Checkbox checked={config.isOn} onChange={(isOn) => setConfig({ ...config, isOn })} />
          </FormRow>
        </tbody>
      </FormTable>
      <SubmitRow submitting={mutation.isPending} />
    </form>
  )
}

interface BatchData {
  userId: number
  maxFiles: number
}

export function BatchUploadForm({
  userId: initialUserId = 0,
  onDone,
}: {
  userId?: number
  onDone?: (count: number) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [userId, setUserId] = useState(initialUserId)

  const dataQuery = useQuery({
    queryKey: ['cert-batch-upload-data', initialUserId],
    queryFn: () => apiGet<BatchData>('/servers/certs/uploadBatchPopup', { userId: initialUserId }),
  })
  useEffect(() => {
    if (dataQuery.data) {
      if (dataQuery.data.userId > 0) {
        setUserId(dataQuery.data.userId)
      }
    }
  }, [dataQuery.data])

  const mutation = useMutation({
    mutationFn: () =>
      postFormWithCsrf<{ count: number }>('/servers/certs/uploadBatchPopup', {
        userId,
        certFiles: files,
      }),
    onSuccess: async (result) => {
      let message = `成功上传${result.count}个证书`
      if (userId > 0) {
        message += '；由于你选择了证书用户，所以只有此用户才能在用户系统中查看到这些证书。'
      }
      toast(message)
      await queryClient.invalidateQueries({ queryKey: ['certs'] })
      onDone?.(result.count)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (files.length === 0) {
      toast('请选择要上传的证书和私钥文件', 'error')
      return
    }
    mutation.mutate()
  }

  const maxFiles = dataQuery.data?.maxFiles || 0

  return (
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <tbody>
          <FormRow title={<span className="title">选择要上传的证书和私钥文件 *</span>}>
            <input
              type="file"
              multiple
              accept="application/x-pem-file, application/pkcs10, application/x-pkcs12, application/x-x509-user-cert, application/x-x509-ca-cert, application/pkix-cert, application/pkcs8, .key, .pem"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
            <p className="comment">
              点击后在弹出的文件选择框中支持多选；不用担心文件名和顺序问题，系统会自动匹配
              {maxFiles > 0 ? `；免费版本限制每次最多上传${maxFiles}个文件` : ''}。
            </p>
          </FormRow>
          <FormRow title="所属用户">
            <UserSelector userId={userId} onChange={setUserId} />
            <p className="comment">可选项，指定证书所属的用户；指定用户后，上传的证书管理员无法在管理系统查看，只能在用户系统查看。</p>
          </FormRow>
        </tbody>
      </FormTable>
      <SubmitRow submitting={mutation.isPending}>{mutation.isPending ? '上传中...' : '上传'}</SubmitRow>
    </form>
  )
}
