import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'
import { useConfirm } from '../../components/Confirm'
import { useToast } from '../../components/Toast'
import { LoadingBlock } from '../../components/LoadingBlock'
import { ServerPageLayout, ServerTopMenu, type LeftMenuItem } from './common'

interface ServerData {
  server: { id: number; name: string; clusterId: number }
}

export function ServerDeletePage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const query = useQuery({
    queryKey: ['servers-core', 'server-basic', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<ServerData>('/servers/server/delete', { serverId }),
  })

  const remove = useMutation({
    mutationFn: () => apiPost('/servers/server/delete', { serverId }),
    onSuccess: () => {
      toast('删除成功')
      navigate('/servers')
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要删除的网站.</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const server = query.data.server
  const menu: LeftMenuItem[] = [{ name: '删除网站', url: `/servers/server/delete?serverId=${serverId}`, isActive: true }]

  async function removeServer() {
    if (!(await confirm({ message: '确定要删除当前网站吗?请慎重操作,删除后无法恢复!', danger: true, confirmText: '删除' }))) {
      return
    }
    remove.mutate()
  }

  return (
    <div>
      <ServerTopMenu serverId={server.id} serverName={server.name} current="delete" />
      <ServerPageLayout menu={menu}>
        <div style={{ maxWidth: '40em' }}>
          <div className="ui message warning">
            请慎重操作,删除后无法恢复!当前网站:{server.name}
          </div>
          <button
            className={`ui button red large fluid${remove.isPending ? ' loading disabled' : ''}`}
            type="button"
            onClick={() => void removeServer()}
          >
            删除当前网站
          </button>
        </div>
      </ServerPageLayout>
    </div>
  )
}
