import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { useToast } from '../../components/Toast'
import { postFormValues } from './common'

interface GroupFormData {
  type?: string
  group?: { id: number; name: string; description: string; isOn: boolean; code: string }
}

export function WafCreateGroupPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const type = searchParams.get('type') || 'inbound'
  const query = useQuery({
    queryKey: ['waf-create-group', type],
    queryFn: () => apiGet<GroupFormData>('/servers/components/waf/createGroupPopup', { type }),
  })
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入分组名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postFormValues('/servers/components/waf/createGroupPopup', {
        firewallPolicyId,
        type,
        name,
        code,
        description,
        isOn: isOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/servers/components/waf/groups?firewallPolicyId=${firewallPolicyId}&type=${type}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>添加分组</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">分组名称 *</td>
              <td>
                <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                <p className="comment">给分组起一个容易识别的名称</p>
              </td>
            </tr>
            <tr>
              <td>代号</td>
              <td>
                <input type="text" maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} />
                <p className="comment">可选项,在导入时可以合并相同代号的分组.</p>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setMoreOptions((current) => !current)
                  }}
                >
                  {moreOptions ? '[收起选项]' : '[更多选项]'}
                </a>
              </td>
            </tr>
            {moreOptions ? (
              <>
                <tr>
                  <td>分组描述</td>
                  <td>
                    <textarea maxLength={200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td>启用当前分组</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
                      <label />
                    </div>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

export function WafUpdateGroupPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const groupId = Number(searchParams.get('groupId') || 0) || 0
  const firewallPolicyId = Number(searchParams.get('firewallPolicyId') || 0) || 0
  const type = searchParams.get('type') || 'inbound'
  const query = useQuery({
    queryKey: ['waf-update-group', groupId],
    queryFn: () => apiGet<GroupFormData>('/servers/components/waf/updateGroupPopup', { groupId }),
    enabled: groupId > 0,
  })
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [isOn, setIsOn] = useState(true)
  const [moreOptions, setMoreOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data?.group) {
      setName(query.data.group.name)
      setCode(query.data.group.code)
      setDescription(query.data.group.description)
      setIsOn(query.data.group.isOn)
    }
  }, [query.data])

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  async function submit() {
    if (!name.trim()) {
      toast('请输入分组名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postFormValues('/servers/components/waf/updateGroupPopup', {
        groupId,
        name,
        code,
        description,
        isOn: isOn ? 1 : '',
      })
      toast('保存成功')
      if (firewallPolicyId > 0) {
        navigate(`/servers/components/waf/group?firewallPolicyId=${firewallPolicyId}&type=${type}&groupId=${groupId}`)
      } else {
        navigate(-1)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>修改分组</h3>
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">分组名称 *</td>
              <td>
                <input type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                <p className="comment">给分组起一个容易识别的名称</p>
              </td>
            </tr>
            <tr>
              <td>代号</td>
              <td>
                <input type="text" maxLength={100} value={code} onChange={(event) => setCode(event.target.value)} />
                <p className="comment">可选项,在导入时可以合并相同代号的分组.</p>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setMoreOptions((current) => !current)
                  }}
                >
                  {moreOptions ? '[收起选项]' : '[更多选项]'}
                </a>
              </td>
            </tr>
            {moreOptions ? (
              <>
                <tr>
                  <td>分组描述</td>
                  <td>
                    <textarea maxLength={200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td>启用当前分组</td>
                  <td>
                    <div className="ui checkbox">
                      <input type="checkbox" checked={isOn} onChange={(event) => setIsOn(event.target.checked)} />
                      <label />
                    </div>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
        <div style={{ marginTop: '1em' }}>
          <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
