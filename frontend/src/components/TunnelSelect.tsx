import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'

interface TunnelOption {
  id: number
  name: string
}

interface TunnelSelectProps {
  value: number
  onChange: (id: number) => void
  serverId?: number
  clusterId?: number
  userId?: number
}

export function TunnelSelect({ value, onChange, serverId = 0, clusterId = 0, userId = 0 }: TunnelSelectProps) {
  const query = useQuery({
    queryKey: ['tunnel-options', serverId, clusterId, userId],
    queryFn: () => apiGet<{ tunnels: TunnelOption[] }>('/servers/tunnelOptions', { serverId, clusterId, userId }),
  })

  return (
    <>
      <select className="ui dropdown auto-width" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {value > 0 && query.data && !query.data.tunnels.some((tunnel) => tunnel.id === value) ? <option value={value} disabled>不可用</option> : null}
        <option value={0}>直连</option>
        {(query.data?.tunnels || []).map((tunnel) => <option key={tunnel.id} value={tunnel.id}>{tunnel.name}</option>)}
      </select>
      {query.isError ? <span className="red">隧道列表加载失败</span> : null}
    </>
  )
}
