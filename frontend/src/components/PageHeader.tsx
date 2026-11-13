import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface PageMenuItem {
  name: string
  href?: string
  active?: boolean
  onClick?: () => void
  hidden?: boolean
  disabled?: boolean
}

export function PageHeader({ items, children }: { items?: PageMenuItem[]; children?: ReactNode }) {
  if ((!items || items.length === 0) && !children) {
    return null
  }
  return (
    <div className="ui menu text blue first-menu">
      {items?.map((item, index) => {
        if (item.hidden) {
          return null
        }
        if (item.name === '[|]') {
          return (
            <span key={`divider-${index}`} className="disabled item">
              |
            </span>
          )
        }
        const className = `item${item.active ? ' active' : ''}`
        if (item.disabled) {
          return (
            <span key={`${item.name}-${index}`} className="disabled item">
              {item.name}
            </span>
          )
        }
        if (item.href && item.href.startsWith('/') && !item.onClick) {
          return (
            <Link key={item.name} className={className} to={item.href}>
              {item.name}
            </Link>
          )
        }
        return (
          <a
            key={item.name}
            className={className}
            href={item.href || ''}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault()
                item.onClick()
              }
            }}
          >
            {item.name}
          </a>
        )
      })}
      {children}
    </div>
  )
}
