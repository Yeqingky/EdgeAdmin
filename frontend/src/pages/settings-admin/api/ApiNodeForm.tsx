import { useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { apiPost } from '../../../api/client'
import { useToast } from '../../../components/Toast'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../../components/form'
import {
  AddressListEditor,
  CertSelector,
  Modal,
  type NetworkAddress,
  type SSLCertSummary,
} from '../common'

export interface ApiNodeData {
  id: number
  name: string
  description: string
  isOn: boolean
  listens: NetworkAddress[]
  restIsOn: boolean
  restListens: NetworkAddress[]
  certs: SSLCertSummary[]
  sslPolicyId: number
  accessAddrs: NetworkAddress[]
  isPrimary: boolean
}

export function ApiNodeForm({ node, onSaved }: { node?: ApiNodeData; onSaved: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(node?.name ?? '')
  const [description, setDescription] = useState(node?.description ?? '')
  const [isOn, setIsOn] = useState(node?.isOn ?? true)
  const [isPrimary, setIsPrimary] = useState(node?.isPrimary ?? false)
  const [listens, setListens] = useState<NetworkAddress[]>(node?.listens ?? [])
  const [accessAddrs, setAccessAddrs] = useState<NetworkAddress[]>(node?.accessAddrs ?? [])
  const [restIsOn, setRestIsOn] = useState(node?.restIsOn ?? false)
  const [restListens, setRestListens] = useState<NetworkAddress[]>(node?.restListens ?? [])
  const [certs, setCerts] = useState<SSLCertSummary[]>(node?.certs ?? [])
  const [moreVisible, setMoreVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const hasHTTPS =
    listens.some((address) => address.protocol.toLowerCase().startsWith('https')) ||
    (restIsOn && restListens.some((address) => address.protocol.toLowerCase().startsWith('https')))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.length === 0) {
      toast('请输入API节点名称', 'error')
      return
    }
    if (listens.length === 0) {
      toast('请添加至少一个进程监听地址', 'error')
      return
    }
    if (restIsOn && restListens.length === 0) {
      toast('请至少添加一个HTTP API监听端口', 'error')
      return
    }
    if (accessAddrs.length === 0) {
      toast('请添加至少一个外部访问地址', 'error')
      return
    }
    if (hasHTTPS && certs.length === 0) {
      toast('请添加至少一个证书', 'error')
      return
    }
    setSubmitting(true)
    try {
      await apiPost(node ? '/settings/api/node/update' : '/settings/api/node/createPopup', {
        nodeId: node?.id ?? 0,
        name,
        description,
        isOn: isOn ? 1 : 0,
        isPrimary: isPrimary ? 1 : 0,
        sslPolicyId: node?.sslPolicyId ?? 0,
        listensJSON: JSON.stringify(listens),
        restIsOn: restIsOn ? 1 : 0,
        restListensJSON: JSON.stringify(restListens),
        certIdsJSON: JSON.stringify(certs.map((cert) => cert.id)),
        accessAddrsJSON: JSON.stringify(accessAddrs),
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
    <form className="ui form" onSubmit={submit}>
      <FormTable>
        <FormRow title="节点名称 *">
          <TextInput type="text" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
        </FormRow>
        <FormRow title="GRPC监听端口 *">
          <AddressListEditor addresses={listens} onChange={setListens} />
          <p className="comment">通过GRPC访问API节点进程监听的网络端口.</p>
        </FormRow>
        {hasHTTPS ? (
          <FormRow title="HTTPS证书 *">
            <CertSelector certs={certs} onChange={setCerts} />
          </FormRow>
        ) : null}
        <FormRow title="GRPC 外部访问地址 *">
          <AddressListEditor addresses={accessAddrs} onChange={setAccessAddrs} />
          <p className="comment">
            边缘节点和管理平台等外部节点访问API节点的网络地址,需要保证其他节点能够通过此地址访问到API节点服务.
            <strong>访问地址里的端口号和监听端口通常一致,除非你做了端口转发.</strong>
          </p>
        </FormRow>
        <tr>
          <td colSpan={2}>
            <a href="" style={{ fontWeight: 'normal' }} onClick={(event) => { event.preventDefault(); setMoreVisible(!moreVisible) }}>
              {moreVisible ? '收起选项' : '更多选项'} {moreVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </a>
          </td>
        </tr>
        {moreVisible ? (
          <>
            <FormRow title={<span className={restIsOn ? 'color-border' : undefined}>开启HTTP API端口</span>}>
              <Checkbox label="启用HTTP API" checked={restIsOn} onChange={setRestIsOn} />
              <p className="comment">启用后用户可以通过HTTP API调用服务接口.</p>
            </FormRow>
            {restIsOn ? (
              <FormRow title={<span className="color-border">HTTP API监听端口 *</span>}>
                <AddressListEditor addresses={restListens} onChange={setRestListens} />
                <p className="comment">HTTP API节点进程监听的网络端口,需要和当前节点的GRPC端口不同.</p>
              </FormRow>
            ) : null}
            <FormRow title="描述">
              <textarea value={description} maxLength={200} rows={3} onChange={(event) => setDescription(event.target.value)} />
            </FormRow>
            {node ? (
              <FormRow title="主节点">
                <Checkbox checked={isPrimary} onChange={setIsPrimary} />
                <p className="comment">设置为主节点后,主要的后台任务会在此节点上运行.</p>
              </FormRow>
            ) : null}
            <FormRow title="启用当前节点">
              <Checkbox checked={isOn} onChange={setIsOn} />
            </FormRow>
          </>
        ) : null}
      </FormTable>
      <SubmitButton submitting={submitting} />
    </form>
  )
}

export function CreateApiNodeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return (
    <Modal title="添加API节点" onClose={onClose} width="50em">
      <ApiNodeForm onSaved={onSaved} />
    </Modal>
  )
}
