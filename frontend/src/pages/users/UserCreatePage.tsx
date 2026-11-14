import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, getCsrfToken } from '../../api/client'
import { useSession } from '../../api/session'
import { useToast } from '../../components/Toast'
import { ClusterSelect } from '../../components/ClusterSelect'
import { Checkbox, FormRow, FormTable, SubmitButton, TextInput } from '../../components/form'

export function UserCreatePage() {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [fullname, setFullname] = useState('')
  const [clusterId, setClusterId] = useState(0)
  const [email, setEmail] = useState('')
  const [remark, setRemark] = useState('')
  const [otpOn, setOtpOn] = useState(false)
  const [featuresType, setFeaturesType] = useState('default')
  const [more, setMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/users/createPopup', {
        csrfToken: await getCsrfToken(),
        username,
        pass1,
        pass2,
        fullname,
        clusterId,
        featuresType,
        otpOn: otpOn ? 1 : '',
        email,
        remark,
      })
      toast('保存成功')
      navigate('/users')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h3>创建用户</h3>
      <form className="ui form" onSubmit={submit}>
        <FormTable>
          <FormRow title="用户名 *">
            <TextInput value={username} maxLength={100} onChange={(event) => setUsername(event.target.value)} autoFocus />
            <p className="comment">用户名只能是英文,数字,下划线的组合.</p>
          </FormRow>
          <FormRow title="密码 *">
            <input type="password" value={pass1} maxLength={100} onChange={(event) => setPass1(event.target.value)} />
          </FormRow>
          <FormRow title="确认密码 *">
            <input type="password" value={pass2} maxLength={100} onChange={(event) => setPass2(event.target.value)} />
          </FormRow>
          <FormRow title="全名 *">
            <TextInput value={fullname} maxLength={100} onChange={(event) => setFullname(event.target.value)} />
            <p className="comment">用户姓名或者公司名称等等.</p>
          </FormRow>
          <FormRow title="关联集群 *">
            <ClusterSelect value={clusterId} onChange={setClusterId} />
            <p className="comment">用户发布的网站会自动部署到此集群.</p>
          </FormRow>
          {session.data?.teaIsPlus ? (
            <FormRow title="开通功能">
              <label>
                <input type="radio" checked={featuresType === 'default'} onChange={() => setFeaturesType('default')} /> 默认功能
              </label>
              &nbsp;&nbsp;
              <label>
                <input type="radio" checked={featuresType === 'all'} onChange={() => setFeaturesType('all')} /> 全部功能
              </label>
            </FormRow>
          ) : null}
          <tr>
            <td colSpan={2}>
              <a href="" onClick={(event) => { event.preventDefault(); setMore((value) => !value) }}>更多选项</a>
            </td>
          </tr>
          {more ? (
            <>
              <FormRow title="电子邮箱">
                <TextInput value={email} maxLength={100} onChange={(event) => setEmail(event.target.value)} />
              </FormRow>
              <FormRow title="OTP认证">
                <Checkbox label="启用OTP" checked={otpOn} onChange={setOtpOn} />
              </FormRow>
              <FormRow title="备注">
                <textarea rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} />
              </FormRow>
            </>
          ) : null}
        </FormTable>
        <SubmitButton submitting={submitting} />
      </form>
    </div>
  )
}
