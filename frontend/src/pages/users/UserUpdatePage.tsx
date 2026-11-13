import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { ClusterSelect } from '../../components/ClusterSelect'
import { Checkbox, FormRow, FormTable, Select, SubmitButton, TextInput } from '../../components/form'
import { UserTabs } from './UserTabs'

interface User {
  id: number
  username: string
  fullname: string
  email: string
  tel: string
  remark: string
  mobile: string
  isOn: boolean
  bandwidthAlgo: string
  otpLoginIsOn: boolean
}

interface UpdateData {
  user: User
  clusterId: number
}

export function UserUpdatePage() {
  const [params] = useSearchParams()
  const userId = Number(params.get('userId') || 0)
  const navigate = useNavigate()
  const toast = useToast()
  const query = useQuery({ queryKey: ['user-update', userId], queryFn: () => apiGet<UpdateData>('/users/update', { userId }) })
  const [user, setUser] = useState<User | null>(null)
  const [clusterId, setClusterId] = useState(0)
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [passwordEditing, setPasswordEditing] = useState(false)
  const [more, setMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (query.data) {
      setUser(query.data.user)
      setClusterId(query.data.clusterId)
      setMore(Boolean(query.data.user.mobile || query.data.user.tel || query.data.user.email || query.data.user.remark))
    }
  }, [query.data])

  if (userId <= 0) {
    return <div className="ui negative message">缺少userId参数.</div>
  }
  if (query.isLoading || !user) {
    return <LoadingBlock />
  }
  if (query.isError) {
    return <div className="ui negative message">加载失败</div>
  }

  function update<K extends keyof User>(key: K, value: User[K]) {
    setUser((current) => (current ? { ...current, [key]: value } : current))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/users/update', {
        csrfToken: await getCsrfToken(),
        userId: user.id,
        username: user.username,
        pass1,
        pass2,
        fullname: user.fullname,
        mobile: user.mobile,
        tel: user.tel,
        email: user.email,
        remark: user.remark,
        isOn: user.isOn ? 1 : '',
        clusterId,
        bandwidthAlgo: user.bandwidthAlgo,
        otpOn: user.otpLoginIsOn ? 1 : '',
      })
      toast('保存成功')
      navigate(`/users/user?userId=${user.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <UserTabs userId={user.id} active="update" />
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="用户名 *">
            <TextInput value={user.username} maxLength={100} onChange={(event) => update('username', event.target.value)} />
            <p className="comment">用户名只能是英文,数字,下划线的组合.</p>
          </FormRow>
          <FormRow title="密码">
            <a href="" onClick={(event) => { event.preventDefault(); setPasswordEditing((value) => !value) }}>修改密码</a>
            {passwordEditing ? (
              <div style={{ marginTop: '0.6em' }}>
                <input type="password" value={pass1} maxLength={100} onChange={(event) => setPass1(event.target.value)} />
                <p className="comment">留空表示不修改.</p>
              </div>
            ) : null}
          </FormRow>
          {passwordEditing ? (
            <FormRow title="确认密码">
              <input type="password" value={pass2} maxLength={100} onChange={(event) => setPass2(event.target.value)} />
            </FormRow>
          ) : null}
          <FormRow title="全名 *">
            <TextInput value={user.fullname} maxLength={100} onChange={(event) => update('fullname', event.target.value)} />
          </FormRow>
          <FormRow title="关联集群 *">
            <ClusterSelect value={clusterId} onChange={setClusterId} />
          </FormRow>
          <tr>
            <td colSpan={2}>
              <a href="" onClick={(event) => { event.preventDefault(); setMore((value) => !value) }}>更多选项</a>
            </td>
          </tr>
          {more ? (
            <>
              <FormRow title="手机号">
                <TextInput value={user.mobile} maxLength={11} onChange={(event) => update('mobile', event.target.value)} />
              </FormRow>
              <FormRow title="联系电话">
                <TextInput value={user.tel} maxLength={100} onChange={(event) => update('tel', event.target.value)} />
              </FormRow>
              <FormRow title="电子邮箱">
                <TextInput value={user.email} maxLength={100} onChange={(event) => update('email', event.target.value)} />
              </FormRow>
              <FormRow title="OTP认证">
                <Checkbox label="启用OTP" checked={user.otpLoginIsOn} onChange={(checked) => update('otpLoginIsOn', checked)} />
              </FormRow>
              <FormRow title="备注">
                <textarea rows={3} value={user.remark} onChange={(event) => update('remark', event.target.value)} />
              </FormRow>
              <FormRow title="带宽算法">
                <Select value={user.bandwidthAlgo} onChange={(event) => update('bandwidthAlgo', event.target.value)}>
                  <option value="">[使用默认]</option>
                  <option value="secondly">峰值带宽</option>
                  <option value="avg">平均带宽</option>
                </Select>
              </FormRow>
              <FormRow title="启用当前用户">
                <Checkbox checked={user.isOn} onChange={(checked) => update('isOn', checked)} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
