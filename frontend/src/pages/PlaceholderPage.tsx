import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export function PlaceholderPage() {
  const location = useLocation()
  return (
    <div className="ui message">
      <Construction size={16} /> 页面 {location.pathname} 正在迁移中。
    </div>
  )
}
