import { PageHeader } from '../../../components/PageHeader'

export function AcmeMenu({ active }: { active: 'task' | 'create' | 'user' | 'account' }) {
  return (
    <PageHeader
      items={[
        { name: '所有任务', href: '/servers/certs/acme', active: active === 'task' },
        { name: '[新申请]', href: '/servers/certs/acme/create', active: active === 'create' },
        { name: 'ACME用户', href: '/servers/certs/acme/users', active: active === 'user' },
        { name: '服务商账号', href: '/servers/certs/acme/accounts', active: active === 'account' },
      ]}
    />
  )
}
