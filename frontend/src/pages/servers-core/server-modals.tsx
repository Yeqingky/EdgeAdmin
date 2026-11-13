import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Modal } from './common'

export interface OriginAddress {
  protocol: string
  host: string
  portRange: string
  minPort?: number
  maxPort?: number
}

export interface OriginItem {
  id: number
  isOn: boolean
  addr: OriginAddress
  addrSummary?: string
}

export interface ServerNameConfig {
  name: string
  type: string
  subNames?: string[]
}

export interface CertRef {
  id: number
  name: string
}

interface OriginModalProps {
  serverType: string
  onClose: () => void
  onCreated: (origin: OriginItem) => void
}

export function OriginModal({ serverType, onClose, onCreated }: OriginModalProps) {
  const toast = useToast()
  const isHTTP = serverType === 'httpProxy' || serverType === 'httpWeb'
  const [protocol, setProtocol] = useState(serverType === 'tcpProxy' ? 'tcp' : serverType === 'udpProxy' ? 'udp' : 'http')
  const [addr, setAddr] = useState('')
  const [host, setHost] = useState('')
  const [followPort, setFollowPort] = useState(false)
  const [http2Enabled, setHttp2Enabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addrError, setAddrError] = useState('')

  let portWarning = ''
  if (protocol === 'http' && (addr.endsWith(':443') || addr.endsWith(':8443'))) {
    portWarning = `${addr.endsWith(':443') ? '443' : '8443'}通常是HTTPS协议端口,请确认源站协议选择是否正确.`
  } else if (protocol === 'https' && (addr.endsWith(':80') || addr.endsWith(':8080'))) {
    portWarning = `${addr.endsWith(':80') ? '80' : '8080'}通常是HTTP协议端口,请确认源站协议选择是否正确.`
  }

  useEffect(() => {
    setAddrError('')
  }, [addr, protocol])

  async function submit() {
    setSubmitting(true)
    try {
      const data = await apiPost<{ origin: OriginItem }>('/servers/addOriginPopup', {
        protocol,
        addr,
        host,
        followPort: followPort ? 1 : '',
        http2Enabled: http2Enabled ? 1 : '',
      })
      toast('保存成功')
      onCreated(data.origin)
      onClose()
    } catch (error) {
      setAddrError(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="添加源站地址"
      onClose={onClose}
      width="45em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      <table className="ui table selectable definition">
        <tbody>
          <tr>
            <td className="title">源站协议 *</td>
            <td>
              {isHTTP ? (
                <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              ) : null}
              {serverType === 'tcpProxy' ? (
                <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                  <option value="tcp">TCP</option>
                  <option value="tls">TLS</option>
                </select>
              ) : null}
              {serverType === 'udpProxy' ? (
                <select className="ui dropdown auto-width" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                  <option value="udp">UDP</option>
                </select>
              ) : null}
            </td>
          </tr>
          <tr>
            <td className="title">源站地址 *</td>
            <td>
              <div className="ui input left labeled">
                <span className="ui label">{protocol.toLowerCase()}://</span>
                <input type="text" value={addr} onChange={(event) => setAddr(event.target.value)} />
              </div>
              {portWarning ? (
                <p className="comment">
                  <span className="red">{portWarning}</span>
                </p>
              ) : null}
              {addrError ? (
                <p className="comment">
                  <span className="red">{addrError}</span>
                </p>
              ) : null}
              <p className="comment">
                源站服务器地址,通常是一个IP(或域名)加端口,80和443端口可以省略
                {serverType === 'httpProxy' ? ',不需要加 http:// 或 https://' : ''}.
              </p>
            </td>
          </tr>
          {isHTTP || protocol === 'tls' ? (
            <tr>
              <td>回源主机名</td>
              <td>
                <input type="text" value={host} placeholder="比如example.com" maxLength={100} onChange={(event) => setHost(event.target.value)} />
                <p className="comment">
                  可选项.请求源站时的Host字段值,用于设置访问源站的站点域名
                  {isHTTP ? ',支持请求变量' : ''};如果用户访问的域名和源站域名不一致,请务必设置为源站域名.
                </p>
              </td>
            </tr>
          ) : null}
          <tr>
            <td>端口跟随</td>
            <td>
              <div className="ui checkbox">
                <input
                  type="checkbox"
                  id="origin-follow-port"
                  checked={followPort}
                  onChange={(event) => setFollowPort(event.target.checked)}
                />
                <label htmlFor="origin-follow-port" />
              </div>
              <p className="comment">选中后,表示源站的端口保持和用户访问的服务端口保持一致;此时的源站地址中的端口号可以任意填写.</p>
            </td>
          </tr>
          {protocol === 'https' ? (
            <tr>
              <td>支持HTTP/2</td>
              <td>
                <div className="ui checkbox">
                  <input
                    type="checkbox"
                    id="origin-http2"
                    checked={http2Enabled}
                    onChange={(event) => setHttp2Enabled(event.target.checked)}
                  />
                  <label htmlFor="origin-http2" />
                </div>
                <p className="comment">选中后,表示源站支持HTTP/2协议.</p>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Modal>
  )
}

interface PortModalProps {
  serverType: string
  onClose: () => void
  onCreated: (address: OriginAddress) => void
}

export function PortModal({ serverType, onClose, onCreated }: PortModalProps) {
  const toast = useToast()
  const optionsQuery = useQuery({
    queryKey: ['servers-core', 'port-options', serverType],
    queryFn: () =>
      apiGet<{ protocols: { code: string; name: string }[]; supportRange: boolean }>('/servers/addPortPopup', {
        serverType,
        supportRange: 0,
      }),
  })
  const protocols = optionsQuery.data?.protocols || []
  const [protocol, setProtocol] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!protocol && protocols.length > 0) {
      const first = protocols[0].code
      setProtocol(first)
      if (first === 'http') {
        setAddress('80')
      } else if (first === 'https') {
        setAddress('443')
      }
    }
  }, [protocols, protocol])

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const data = await apiPost<{ address: OriginAddress }>('/servers/addPortPopup', {
        supportRange: 1,
        protocol,
        address,
      })
      toast('保存成功')
      onCreated(data.address)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="添加端口绑定"
      onClose={onClose}
      width="40em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>网络协议</td>
            <td>
              <select
                className="ui dropdown auto-width"
                value={protocol}
                onChange={(event) => {
                  const code = event.target.value
                  setProtocol(code)
                  if (code === 'http') {
                    setAddress('80')
                  } else if (code === 'https') {
                    setAddress('443')
                  }
                }}
              >
                {protocols.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td className="title">端口 *</td>
            <td>
              <input type="text" value={address} onChange={(event) => setAddress(event.target.value)} />
              {error ? (
                <p className="comment">
                  <span className="red">{error}</span>
                </p>
              ) : null}
              <p className="comment">
                可以是一个数字端口(通常不超过65535),也可以是&quot;地址:端口&quot;的方式.支持端口范围,形式为
                <span className="ui label tiny basic">port1-port2</span>.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

interface ServerNameModalProps {
  onClose: () => void
  onCreated: (serverName: ServerNameConfig) => void
}

export function ServerNameModal({ onClose, onCreated }: ServerNameModalProps) {
  const toast = useToast()
  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [serverName, setServerName] = useState('')
  const [serverNames, setServerNames] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const data = await apiPost<{ serverName: ServerNameConfig }>('/servers/addServerNamePopup', {
        mode,
        serverName,
        serverNames,
      })
      toast('保存成功')
      onCreated(data.serverName)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="添加域名绑定"
      onClose={onClose}
      width="45em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className={`ui button primary${submitting ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void submit()}
          >
            保存
          </button>
        </>
      }
    >
      <table className="ui table selectable definition">
        <tbody>
          {mode === 'single' ? (
            <tr>
              <td className="title">单个域名 *</td>
              <td>
                <input type="text" maxLength={1024} value={serverName} onChange={(event) => setServerName(event.target.value)} />
                <p className="comment">
                  请输入单个域名,比如<span className="ui label tiny basic">example.com</span>,
                  <span className="ui label tiny basic">www.example.com</span>,<strong>不要</strong>包含
                  <span className="ui label tiny basic">http://</span>或
                  <span className="ui label tiny basic">https://</span>或端口号;也可以使用泛域名,比如
                  <span className="ui label tiny basic">*.example.com</span>.
                </p>
              </td>
            </tr>
          ) : (
            <tr>
              <td className="title">多个域名 *</td>
              <td>
                <textarea rows={5} value={serverNames} onChange={(event) => setServerNames(event.target.value)} />
                <p className="comment">每行一个域名,比如 example.com,www.example.com;也可以使用泛域名,比如 *.example.com.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {error ? <div className="ui negative message">{error}</div> : null}
      <div style={{ marginTop: '0.5em' }}>
        {mode === 'single' ? (
          <a href="" onClick={(event) => { event.preventDefault(); setMode('multiple') }}>
            [批量添加]
          </a>
        ) : (
          <a href="" onClick={(event) => { event.preventDefault(); setMode('single') }}>
            [单个添加]
          </a>
        )}
      </div>
    </Modal>
  )
}

interface SSLItem {
  id: number
  name: string
  commonName: string
  dnsNames: string[]
}

interface CertModalProps {
  userId: number
  domains: string[]
  initialCerts: CertRef[]
  onClose: () => void
  onApply: (certs: CertRef[]) => void
}

export function CertModal({ userId, domains, initialCerts, onClose, onApply }: CertModalProps) {
  const [keyword, setKeyword] = useState('')
  const [searchingDomains, setSearchingDomains] = useState(domains.length > 0)
  const [selected, setSelected] = useState<number[]>(initialCerts.map((cert) => cert.id))
  const [selectedCerts, setSelectedCerts] = useState<Record<number, CertRef>>(() => {
    const map: Record<number, CertRef> = {}
    for (const cert of initialCerts) {
      map[cert.id] = cert
    }
    return map
  })

  const query = useQuery({
    queryKey: ['servers-core', 'certs', keyword, searchingDomains, userId],
    queryFn: () =>
      apiGet<{ certs: SSLItem[]; selectedCertIds: string }>('/servers/certs/selectPopup', {
        viewSize: 'mini',
        userId,
        keyword,
        searchingDomains: searchingDomains ? domains.join(',') : '',
        searchingType: searchingDomains ? 'match' : 'all',
      }),
  })

  const certs = query.data?.certs || []

  return (
    <Modal
      title="选择证书"
      onClose={onClose}
      width="50em"
      footer={
        <>
          <button className="ui button" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="ui button primary"
            type="button"
            onClick={() => {
              onApply(selected.map((id) => selectedCerts[id]).filter(Boolean))
              onClose()
            }}
          >
            确定
          </button>
        </>
      }
    >
      <div className="ui fields inline">
        <div className="ui field">
          <input
            type="text"
            placeholder="证书名称,域名..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="ui field">
          <div className="ui checkbox">
            <input
              type="checkbox"
              id="cert-match-domains"
              checked={searchingDomains}
              disabled={domains.length === 0}
              onChange={(event) => setSearchingDomains(event.target.checked)}
            />
            <label htmlFor="cert-match-domains">匹配域名</label>
          </div>
        </div>
      </div>
      {query.isLoading ? <div className="ui active inline loader" /> : null}
      {certs.length === 0 && !query.isLoading ? <p className="comment">暂时还没有证书.</p> : null}
      {certs.length > 0 ? (
        <table className="ui table selectable celled">
          <thead>
            <tr>
              <th style={{ width: '2em' }} />
              <th>证书名称</th>
              <th>域名</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => (
              <tr key={cert.id}>
                <td>
                  <div className="ui checkbox">
                    <input
                      type="checkbox"
                      checked={selected.includes(cert.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelected((current) => [...current, cert.id])
                          setSelectedCerts((current) => ({ ...current, [cert.id]: { id: cert.id, name: cert.name } }))
                        } else {
                          setSelected((current) => current.filter((id) => id !== cert.id))
                        }
                      }}
                    />
                    <label />
                  </div>
                </td>
                <td>{cert.name}</td>
                <td>{(cert.dnsNames || []).join(', ') || cert.commonName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Modal>
  )
}
