import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { apiGet, apiPostForm } from '../../../api/client'
import { useSession } from '../../../api/session'
import { useToast } from '../../../components/Toast'
import { LoadingBlock } from '../../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable } from '../../../components/form'
import { CertSelector, Modal, SettingsTabs, StringListEditor, type SSLCertSummary } from '../common'

interface ServerConfig {
  http: { on: boolean; listen: string[] }
  https: { on: boolean; listen: string[]; cert: string; key: string }
}

interface ServerSettingsData {
  serverIsChanged: boolean
  serverConfig: ServerConfig
}

interface UpdateHTTPSData {
  serverConfig: ServerConfig
  certConfigs: SSLCertSummary[]
}

export function ServerSettingsPage() {
  const session = useSession()
  const query = useQuery({
    queryKey: ['settings-server'],
    queryFn: () => apiGet<ServerSettingsData>('/settings/server'),
  })
  const [httpVisible, setHTTPVisible] = useState(false)
  const [httpsVisible, setHTTPSVisible] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const data = query.data
  const demo = session.data?.teaDemoEnabled ?? false

  return (
    <div>
      <SettingsTabs kind="basic" active="server" />

      {data.serverIsChanged ? (
        <div>
          <div className="margin" />
          <div className="ui warning message">
            服务配置已修改,请在命令行下重启后生效(<span className="ui label basic small">edge-admin restart</span>).
          </div>
        </div>
      ) : null}

      <h3>
        通过HTTP访问管理平台{' '}
        {demo ? (
          <span>[演示版无法修改]</span>
        ) : (
          <a href="" onClick={(event) => { event.preventDefault(); setHTTPVisible(true) }}>
            修改
          </a>
        )}
      </h3>

      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>状态</td>
            <td>
              {data.serverConfig.http.on ? <span className="green">已启用</span> : <span className="red">已停用</span>}
            </td>
          </tr>
          <tr>
            <td className="title">绑定地址</td>
            <td>
              {data.serverConfig.http.listen.map((listen, index) => (
                <span key={`${listen}-${index}`} className="ui label tiny basic">
                  {listen}
                </span>
              ))}
              <p className="ui comment">访问当前管理系统的HTTP地址;如果地址中的IP是0.0.0.0,表示服务器的所有IP都可以访问.</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="ui divider" />

      <h3>
        通过HTTPS访问管理平台{' '}
        {demo ? (
          <span>[演示版无法修改]</span>
        ) : (
          <a href="" onClick={(event) => { event.preventDefault(); setHTTPSVisible(true) }}>
            修改
          </a>
        )}
      </h3>
      <table className="ui table definition selectable">
        <tbody>
          <tr>
            <td>状态</td>
            <td>
              {data.serverConfig.https.on ? <span className="green">已启用</span> : <span className="red">已停用</span>}
            </td>
          </tr>
          <tr>
            <td className="title">绑定地址</td>
            <td>
              {data.serverConfig.https.listen.map((listen, index) => (
                <span key={`${listen}-${index}`} className="ui label tiny basic">
                  {listen}
                </span>
              ))}
              <p className="ui comment">访问当前管理系统的HTTPS地址;如果地址中的IP是0.0.0.0,表示服务器的所有IP都可以访问.</p>
            </td>
          </tr>
          <tr>
            <td>
              证书文件<span className="small">(Cert)</span>
            </td>
            <td>
              {data.serverConfig.https.cert.length > 0 ? data.serverConfig.https.cert : <span className="disabled">还没有设置证书</span>}
            </td>
          </tr>
          <tr>
            <td>
              私钥文件<span className="small">(Key)</span>
            </td>
            <td>
              {data.serverConfig.https.key.length > 0 ? data.serverConfig.https.key : <span className="disabled">还没有设置私钥</span>}
            </td>
          </tr>
        </tbody>
      </table>

      {httpVisible ? <UpdateHTTPModal onClose={() => setHTTPVisible(false)} /> : null}
      {httpsVisible ? <UpdateHTTPSModal onClose={() => setHTTPSVisible(false)} /> : null}
    </div>
  )
}

function UpdateHTTPModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings-server-update-http'],
    queryFn: () => apiGet<{ serverConfig: ServerConfig }>('/settings/server/updateHTTPPopup'),
  })
  const [on, setOn] = useState(false)
  const [listens, setListens] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setOn(query.data.serverConfig.http.on)
      setListens(query.data.serverConfig.http.listen ?? [])
    }
  }, [query.data])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (listens.length === 0) {
      toast('请输入绑定地址', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('isOn', on ? '1' : '0')
      for (const listen of listens) {
        form.append('listens', listen)
      }
      await apiPostForm('/settings/server/updateHTTPPopup', form)
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['settings-server'] })
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="修改HTTP设置" onClose={onClose} width="45em">
      {query.isLoading ? (
        <p className="comment">正在加载中...</p>
      ) : (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="启用HTTP">
              <Checkbox checked={on} onChange={setOn} />
            </FormRow>
            <FormRow title="绑定地址">
              <StringListEditor values={listens} onChange={setListens} placeholder="127.0.0.1:7777" maxLength={100} />
              <p className="comment" style={{ marginBottom: 0 }}>
                地址格式为:&quot;IP:端口&quot;,比如:&quot;127.0.0.1:7777&quot;.
              </p>
              <p className="comment">如果地址中的IP是0.0.0.0,表示服务器的所有IP都可以用来使用访问此服务.</p>
            </FormRow>
          </FormTable>
          <div style={{ marginTop: '1em' }}>
            <button className="ui button" type="button" onClick={onClose}>
              取消
            </button>
            <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
              保存
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function UpdateHTTPSModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings-server-update-https'],
    queryFn: () => apiGet<UpdateHTTPSData>('/settings/server/updateHTTPSPopup'),
  })
  const [on, setOn] = useState(false)
  const [listens, setListens] = useState<string[]>([])
  const [certs, setCerts] = useState<SSLCertSummary[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setOn(query.data.serverConfig.https.on)
      setListens(query.data.serverConfig.https.listen ?? [])
      setCerts(query.data.certConfigs ?? [])
    }
  }, [query.data])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (listens.length === 0) {
      toast('请输入绑定地址', 'error')
      return
    }
    if (on && certs.length === 0) {
      toast('要启用HTTPS,需要先选择或上传一个可用的证书', 'error')
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.set('isOn', on ? '1' : '0')
      for (const listen of listens) {
        form.append('listens', listen)
      }
      form.set('certIdsJSON', JSON.stringify(certs.map((cert) => cert.id)))
      await apiPostForm('/settings/server/updateHTTPSPopup', form)
      toast('保存成功')
      await queryClient.invalidateQueries({ queryKey: ['settings-server'] })
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="修改HTTPS配置" onClose={onClose} width="50em">
      {query.isLoading ? (
        <p className="comment">正在加载中...</p>
      ) : (
        <form className="ui form" onSubmit={submit}>
          <FormTable>
            <FormRow title="启用HTTPS">
              <Checkbox checked={on} onChange={setOn} />
            </FormRow>
            <FormRow title="绑定地址">
              <StringListEditor values={listens} onChange={setListens} placeholder="127.0.0.1:7778" maxLength={100} />
              <p className="comment" style={{ marginBottom: 0 }}>
                每行一个地址,地址格式为:&quot;IP:端口&quot;,比如:&quot;127.0.0.1:7778&quot;.
              </p>
              <p className="comment">如果地址中的IP是0.0.0.0,表示服务器的所有IP都可以用来使用访问此服务.</p>
            </FormRow>
            {on ? (
              <FormRow title="选择证书文件">
                <CertSelector certs={certs} onChange={setCerts} />
              </FormRow>
            ) : null}
          </FormTable>
          <div style={{ marginTop: '1em' }}>
            <button className="ui button" type="button" onClick={onClose}>
              取消
            </button>
            <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
              保存
            </button>
          </div>
        </form>
      )}
      <p className="comment">
        <Pencil size={11} /> 修改证书相关信息后,需要重启管理系统才能生效.
      </p>
    </Modal>
  )
}


export function UpdateHTTPPopupPage() {
  const navigate = useNavigate()
  return <UpdateHTTPModal onClose={() => navigate('/settings/server')} />
}

export function UpdateHTTPSPopupPage() {
  const navigate = useNavigate()
  return <UpdateHTTPSModal onClose={() => navigate('/settings/server')} />
}
