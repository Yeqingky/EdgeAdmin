import type { ReactNode } from 'react'
import { X } from 'lucide-react'

// 页面内弹窗（替代 legacy teaweb.popup）
export function Modal({ title, children, footer, onClose, width }: {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  width?: string
}) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex', zIndex: 1000 }}>
      <div
        className="ui modal transition visible active"
        style={{
          display: 'block',
          position: 'relative',
          margin: 'auto',
          width: width || '46em',
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        <div className="header">
          {title}
          <button className="ui button tiny right floated" type="button" onClick={onClose} style={{ marginTop: '-0.2em' }}>
            <X size={12} />
          </button>
        </div>
        <div className="content">{children}</div>
        <div className="actions">{footer}</div>
      </div>
    </div>
  )
}
