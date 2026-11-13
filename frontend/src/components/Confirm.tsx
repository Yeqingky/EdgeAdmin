import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve })
    })
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])

  function close(result: boolean) {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
          <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto' }}>
            <div className="header">{state.options.title || '确认操作'}</div>
            <div className="content">
              <p>{state.options.message}</p>
            </div>
            <div className="actions">
              <button className="ui button" onClick={() => close(false)}>
                {state.options.cancelText || '取消'}
              </button>
              <button className={`ui button ${state.options.danger ? 'red' : 'primary'}`} onClick={() => close(true)}>
                {state.options.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const value = useContext(ConfirmContext)
  if (!value) {
    throw new Error('useConfirm must be used inside ConfirmProvider')
  }
  return value.confirm
}
