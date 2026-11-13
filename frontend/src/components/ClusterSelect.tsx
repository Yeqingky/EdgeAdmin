import { useQuery } from '@tanstack/react-query'
import { apiPost } from '../api/client'

interface ClusterOption {
  id: number
  name: string
}

export function ClusterSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const query = useQuery({
    queryKey: ['cluster-options'],
    queryFn: () => apiPost<{ clusters: ClusterOption[] }>('/clusters/options'),
  })
  return (
    <select
      className="ui dropdown"
      style={{ maxWidth: '10em' }}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      <option value={0}>[选择集群]</option>
      {(query.data?.clusters || []).map((cluster) => (
        <option key={cluster.id} value={cluster.id}>
          {cluster.name}
        </option>
      ))}
    </select>
  )
}
