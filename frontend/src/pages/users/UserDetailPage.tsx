import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, getCsrfToken } from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/Confirm'
import { LoadingBlock } from '../../components/LoadingBlock'
import { StatusLabel } from '../../components/StatusLabel'
import { FormRow, FormTable } from '../../components/form'
import { UserTabs } from './UserTabs'

interface UserDetail {
  user: {
    id: number
    username: string
    fullname: string
    email: string
    verifiedEmail: string
    tel: string
    remark: string
    mobile: string
    isOn: boolean
    cluster?: { id: number; name: string }
    countAccessKeys: number
    isRejected: boolean
    rejectReason: string
    isVerified: boolean
    registeredIP: string
    registeredRegion: string
    bandwidthAlgo: string
  }
  otp?: { isOn: boolean; params: { secret: string } }
}

export function UserDetailPage() {
  const [params] = useSearchParams()
  const userId = Number(params.get('userId') || 0)
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const query = useQuery({ queryKey: ['user-detail', userId], queryFn: () => apiGet<UserDetail>('/users/user', { userId }) })
  const [moreOtp, setMoreOtp] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyResult, setVerifyResult] = useState('pass')
  const [rejectReason, setRejectReason] = useState('')

  if (userId <= 0) {
    return <div className="ui negative message">缺少userId参数。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }
  const { user, otp } = query.data

  async function submitVerify() {
    if (verifyResult !== 'pass' && !(await confirm({ message: '确定提交审核结果吗？', danger: true }))) {
      return
    }
    try {
      await apiPost('/users/verifyPopup', {
        csrfToken: await getCsrfToken(),
        userId,
        result: verifyResult,
        rejectReason,
      })
      toast('操作成功')
      setVerifyOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['user-detail', userId] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  return (
    <div>
      <UserTabs userId={user.id} active="index" />
      <FormTable>
        <FormRow title="状态">
          {!user.isVerified ? (
            <span className="red">
              信息未审核 &nbsp;
              <a href="" onClick={(event) => { event.preventDefault(); setVerifyOpen(true) }}>[审核]</a>
            </span>
          ) : user.isRejected ? (
            <span className="red">
              已拒绝 &nbsp;
              <a href="" onClick={(event) => { event.preventDefault(); setVerifyOpen(true) }}>[重新审核]</a>
            </span>
          ) : (
            <StatusLabel isOn={user.isOn} />
          )}
          {user.isVerified && user.isRejected && user.rejectReason ? <p className="comment">拒绝原因：{user.rejectReason}</p> : null}
        </FormRow>
        <FormRow title="用户名">{user.username}</FormRow>
        <FormRow title="全名">{user.fullname}</FormRow>
        <FormRow title="关联集群">
          {user.cluster ? (
            <span>
              {user.cluster.name} <a href={`#/clusters/cluster?clusterId=${user.cluster.id}`}>查看</a>
            </span>
          ) : (
            <span className="disabled">没有设置。</span>
          )}
        </FormRow>
        <FormRow title="手机号">{user.mobile || <span className="disabled">没有设置。</span>}</FormRow>
        <FormRow title="联系电话">{user.tel || <span className="disabled">没有设置。</span>}</FormRow>
        <FormRow title="常用电子邮箱">{user.email || <span className="disabled">没有设置。</span>}</FormRow>
        <FormRow title="已绑定电子邮箱">{user.verifiedEmail || <span className="disabled">没有设置。</span>}</FormRow>
        <FormRow title="备注">{user.remark || <span className="disabled">没有设置。</span>}</FormRow>
        <FormRow title="带宽算法">
          {user.bandwidthAlgo === 'secondly' ? '峰值带宽' : user.bandwidthAlgo === 'avg' ? '平均带宽' : <span className="disabled">使用默认。</span>}
        </FormRow>
        <FormRow title="注册IP">
          {!user.registeredIP ? (
            <span className="disabled">-</span>
          ) : (
            <span>
              {user.registeredIP}
              {user.registeredRegion ? <span className="grey small">（{user.registeredRegion}）</span> : null}
            </span>
          )}
        </FormRow>
      </FormTable>

      <h3>OTP认证</h3>
      <FormTable>
        <FormRow title="状态">
          {otp?.isOn ? <span className="green">已启用</span> : <span className="disabled">未启用</span>}
        </FormRow>
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
              <img alt="qrcode" src={`/users/otpQrcode?userId=${user.id}`} />
              <p className="comment">
                <a href={`/users/otpQrcode?userId=${user.id}&download=true`}>[下载]</a> 可以通过二维码快速添加OTP认证信息到认证App中。
              </p>
            </FormRow>
            <FormRow title="密钥">{otp.params.secret}</FormRow>
          </>
        ) : null}
      </FormTable>

      {verifyOpen ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', width: '32em' }}>
            <div className="header">审核</div>
            <div className="content">
              <div className="ui form">
                <FormTable>
                  <FormRow title="审核结果">
                    <select className="ui dropdown" value={verifyResult} onChange={(event) => setVerifyResult(event.target.value)}>
                      <option value="pass">通过</option>
                      <option value="reject">拒绝</option>
                      <option value="delete">拒绝并删除</option>
                    </select>
                  </FormRow>
                  {verifyResult !== 'pass' ? (
                    <FormRow title="拒绝原因">
                      <textarea rows={2} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                    </FormRow>
                  ) : null}
                </FormTable>
              </div>
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => setVerifyOpen(false)}>取消</button>
              <button className={`ui button ${verifyResult === 'pass' ? 'primary' : 'red'}`} onClick={() => void submitVerify()}>提交</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
