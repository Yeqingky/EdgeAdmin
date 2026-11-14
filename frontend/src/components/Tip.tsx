import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

// 提示图标/文字, 悬浮或点击后显示提示内容
export function Tip({ content, children }: { content: string; children?: ReactNode }) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)
  const visible = hovered || open

  useEffect(() => {
    if (!open) {
      return
    }
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setHovered(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span
      ref={ref}
      className="tip"
      role="button"
      tabIndex={0}
      aria-label={content}
      aria-expanded={visible}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setOpen((value) => !value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setOpen((value) => !value)
        }
      }}
    >
      {children || <HelpCircle size={13} />}
      {visible ? (
        <span
          className="tip-bubble"
          role="tooltip"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
