import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'
import { Modal, ServerSettingsShell, useServerId, type ServerSettingsBase } from './shared'

interface DnsData extends ServerSettingsBase {
  dnsName: string
  dnsDomain: string
  supportCNAME: boolean
  sharedCNAME: boolean
}

export function ServerDnsSettingsPage() {
  const serverId = useServerId()
  const toast = useToast()
  const confirm = useConfirm()
  const query = useQuery({
    queryKey: ['server-settings-dns', serverId],
    queryFn: () => apiGet<DnsData>('/servers/server/settings/dns', { serverId }),
    enabled: serverId > 0,
  })
  const [supportCNAME, setSupportCNAME] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cnameEditor, setCnameEditor] = useState<{ dnsName: string } | null>(null)

  useEffect(() => {
    if (query.data) {
      setSupportCNAME(query.data.supportCNAME)
    }
  }, [query.data])

  if (serverId <= 0) {
    return <div className="ui negative message">缺少serverId参数。</div>
  }
  if (query.isLoading || !query.data) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  const data = query.data
  const cname = `${data.dnsName}.${data.dnsDomain.length > 0 ? data.dnsDomain : '根域名'}`

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/dns', {
        csrfToken: await getCsrfToken(),
        serverId,
        supportCNAME: supportCNAME ? 1 : '',
      })
      toast('保存成功，请等待节点配置刷新')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function regenerate() {
    if (!(await confirm({ message: '确定要重新生成此服务的CNAME吗？' }))) {
      return
    }
    try {
      await apiPost('/servers/server/settings/dns/regenerateCNAME', { serverId })
      toast('已重新生成，正在刷新页面')
      window.location.reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <ServerSettingsShell data={data}>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title={data.sharedCNAME ? '共用CNAME' : '当前网站CNAME'}>
            <span id="cname-text">{cname}</span> &nbsp;
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                void navigator.clipboard?.writeText(cname)
                toast('已复制')
              }}
            >
              [复制]
            </a>{' '}
            &nbsp;
            {!data.sharedCNAME ? (
              <>
                <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); void regenerate() }}>
                  [重新生成]
                </a>{' '}
                &nbsp;
                <a href="" style={{ fontSize: '0.8em' }} onClick={(event) => { event.preventDefault(); setCnameEditor({ dnsName: data.dnsName }) }}>
                  [手动修改]
                </a>
              </>
            ) : null}
            <p className="comment">
              你需要为你的每个<a href={`/servers/server/settings/serverNames?serverId=${serverId}`}>网站域名</a>设置一个CNAME解析，值为上面内容。
            </p>
            {data.dnsDomain.length === 0 ? (
              <p>
                <span className="red">
                  你尚未为当前网站所在集群指定CNAME根域名，可以在{' '}
                  <a href={`/clusters/cluster/settings/dns?clusterId=${data.server.clusterId}`}>[这里]</a> 修改。
                </span>
              </p>
            ) : null}
          </FormRow>
          <FormRow title="支持任意域名CNAME">
            <Checkbox checked={supportCNAME} onChange={setSupportCNAME} />
            <p className="comment">
              选中后表示允许任意域名使用此服务的CNAME直接访问此服务。需要节点服务器可以正确解析DNS记录。在严格匹配域名时才会生效。此选项可能导致安全问题，请谨慎开启。
            </p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>

      {cnameEditor ? (
        <CnameEditor
          serverId={serverId}
          dnsName={cnameEditor.dnsName}
          onClose={() => setCnameEditor(null)}
          onSaved={() => {
            setCnameEditor(null)
            window.location.reload()
          }}
        />
      ) : null}
    </ServerSettingsShell>
  )
}

function CnameEditor({ serverId, dnsName, onClose, onSaved }: { serverId: number; dnsName: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(dnsName)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/servers/server/settings/dns/updateCNAMEPopup', {
        csrfToken: await getCsrfToken(),
        serverId,
        dnsName: name,
      })
      toast('保存成功')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="修改服务CNAME" onClose={onClose} width="35em">
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="CNAME *">
            <TextInput type="text" maxLength={30} value={name} onChange={(event) => setName(event.target.value)} />
            <p className="comment">英文字母、数字的组合，最长30个字符。</p>
          </FormRow>
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </Modal>
  )
}
