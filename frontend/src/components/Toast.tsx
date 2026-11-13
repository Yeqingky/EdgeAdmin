import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

const ToastContext = createContext<{ show: (message: string, type?: ToastItem['type']) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = nextId.current++
    setItems((value) => [...value, { id, message, type }])
    window.setTimeout(() => {
      setItems((value) => value.filter((item) => item.id !== id))
    }, 2600)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {items.map((item) => (
          <div key={item.id} className={`toast-item ${item.type}`}>
            {item.type === 'success' ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return value.show
}
