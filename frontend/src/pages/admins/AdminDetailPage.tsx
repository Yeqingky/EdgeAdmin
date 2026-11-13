import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { FormRow, FormTable } from '../../components/form'
import { AdminTabs } from './AdminTabs'

interface AdminDetail {
  admin: {
    id: number
    fullname: string
    username: string
    isOn: boolean
    isSuper: boolean
    canLogin: boolean
    hasWeakPassword: boolean
    countAccessKeys: number
  }
  modules: { code: string; name: string }[]
  otp?: { isOn: boolean; params: { secret: string } }
}

export function AdminDetailPage() {
  const [params] = useSearchParams()
  const adminId = Number(params.get('adminId') || 0)
  const query = useQuery({ queryKey: ['admin-detail', adminId], queryFn: () => apiGet<AdminDetail>('/admins/admin', { adminId }) })
  const [moreOtp, setMoreOtp] = useState(false)

  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const { admin, modules, otp } = query.data

  return (
    <div>
      <AdminTabs adminId={admin.id} active="index" />
      <FormTable>
        <FormRow title="全名">{admin.fullname}</FormRow>
        <FormRow title="状态"><StatusLabel isOn={admin.isOn} /></FormRow>
        <FormRow title="登录用户名">{admin.username}</FormRow>
        <FormRow title="允许登录">
          {admin.canLogin ? <span className="green">Y</span> : <span className="disabled">N</span>}
        </FormRow>
        <FormRow title="超级管理员">
          {admin.isSuper ? <span className="green">Y</span> : <span className="disabled">N</span>}
        </FormRow>
        {!admin.isSuper ? (
          <FormRow title="权限">
            {modules.length > 0 ? (
              <div className="modules-box">
                {modules.map((module) => (
                  <div className="module-box" key={module.code}>{module.name}</div>
                ))}
              </div>
            ) : (
              <span className="disabled">暂时还没有可以管理的模块。</span>
            )}
          </FormRow>
        ) : null}
      </FormTable>

      <h3>OTP认证</h3>
      <FormTable>
        <FormRow title="状态">{otp?.isOn ? <span className="green">已启用</span> : <span className="disabled">未启用</span>}</FormRow>
        {otp?.isOn ? (
          <tr>
            <td colSpan={2}>
              <a href="" onClick={(event) => { event.preventDefault(); setMoreOtp((value) => !value) }}>更多信息</a>
            </td>
          </tr>
        ) : null}
        {otp?.isOn && moreOtp ? (
          <>
            <FormRow title="认证二维码">
              <img alt="qrcode" src={`/admins/otpQrcode?adminId=${admin.id}`} />
              <p className="comment">
                <a href={`/admins/otpQrcode?adminId=${admin.id}&download=true`}>[下载]</a> 可以通过二维码快速添加OTP认证信息到认证App中。
              </p>
            </FormRow>
            <FormRow title="密钥">{otp.params.secret}</FormRow>
          </>
        ) : null}
      </FormTable>
    </div>
  )
}
