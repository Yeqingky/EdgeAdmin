import { Loader2 } from 'lucide-react'

export function LoadingBlock({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="loading-block">
      <Loader2 className="spin" size={18} />
      <span>{text}</span>
    </div>
  )
}
