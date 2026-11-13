import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function FormTable({ children }: { children: ReactNode }) {
  return <table className="ui table definition selectable">{children}</table>
}

export function FormRow({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <tr>
      <td className="title">{title}</td>
      <td>{children}</td>
    </tr>
  )
}

export function Checkbox({ label, checked, onChange }: { label?: ReactNode; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="ui checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <label>{label}</label>
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="ui dropdown" {...props} />
}

export function SubmitButton({ submitting, children = '保存' }: { submitting?: boolean; children?: ReactNode }) {
  return (
    <div style={{ marginTop: '1em' }}>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        {children}
      </button>
    </div>
  )
}
