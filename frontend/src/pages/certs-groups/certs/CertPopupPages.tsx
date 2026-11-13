import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CertDetailView, BatchUploadForm, UpdateCertForm, UploadCertForm } from './CertForms'
import { AcmeAccountCreateForm, AcmeAccountUpdateForm } from './AcmeAccountsPage'
import { AcmeUserCreateForm, AcmeUserUpdateForm } from './AcmeUsersPage'
import { UpdateAcmeTaskForm } from './CertsAcmePage'
import { useQueryNumber, useQueryValue } from '../shared'

function PopupBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function CertUploadPage() {
  const [searchParams] = useSearchParams()
  const userId = useQueryNumber(searchParams, 'userId')
  return (
    <PopupBox title="上传证书">
      <UploadCertForm userId={userId} />
    </PopupBox>
  )
}

export function CertBatchUploadPage() {
  const [searchParams] = useSearchParams()
  const userId = useQueryNumber(searchParams, 'userId')
  return (
    <PopupBox title="批量上传证书">
      <BatchUploadForm userId={userId} />
    </PopupBox>
  )
}

export function CertDetailPage() {
  const [searchParams] = useSearchParams()
  const certId = useQueryNumber(searchParams, 'certId')
  if (certId <= 0) {
    return <div className="ui negative message">缺少证书ID</div>
  }
  return (
    <PopupBox title="证书详情">
      <CertDetailView certId={certId} />
    </PopupBox>
  )
}

export function CertUpdatePage() {
  const [searchParams] = useSearchParams()
  const certId = useQueryNumber(searchParams, 'certId')
  if (certId <= 0) {
    return <div className="ui negative message">缺少证书ID</div>
  }
  return <UpdateCertForm certId={certId} />
}

export function AcmeUpdateTaskPage() {
  const [searchParams] = useSearchParams()
  const taskId = useQueryNumber(searchParams, 'taskId')
  if (taskId <= 0) {
    return <div className="ui negative message">缺少任务ID</div>
  }
  return (
    <PopupBox title="修改申请任务">
      <UpdateAcmeTaskForm taskId={taskId} onDone={() => undefined} />
    </PopupBox>
  )
}

export function AcmeUserCreatePage() {
  const [searchParams] = useSearchParams()
  const platformUserId = useQueryNumber(searchParams, 'platformUserId')
  const providerCode = useQueryValue(searchParams, 'providerCode')
  return (
    <PopupBox title="创建ACME用户">
      <AcmeUserCreateForm platformUserId={platformUserId} providerCode={providerCode} onDone={() => undefined} />
    </PopupBox>
  )
}

export function AcmeUserUpdatePage() {
  const [searchParams] = useSearchParams()
  const userId = useQueryNumber(searchParams, 'userId')
  if (userId <= 0) {
    return <div className="ui negative message">缺少用户ID</div>
  }
  return (
    <PopupBox title="修改ACME用户">
      <AcmeUserUpdateForm userId={userId} onDone={() => undefined} />
    </PopupBox>
  )
}

export function AcmeAccountCreatePage() {
  const [searchParams] = useSearchParams()
  const providerCode = useQueryValue(searchParams, 'providerCode')
  return (
    <PopupBox title="添加账号">
      <AcmeAccountCreateForm providerCode={providerCode} onDone={() => undefined} />
    </PopupBox>
  )
}

export function AcmeAccountUpdatePage() {
  const [searchParams] = useSearchParams()
  const accountId = useQueryNumber(searchParams, 'accountId')
  if (accountId <= 0) {
    return <div className="ui negative message">缺少账号ID</div>
  }
  return (
    <PopupBox title="修改账号">
      <AcmeAccountUpdateForm accountId={accountId} onDone={() => undefined} />
    </PopupBox>
  )
}
