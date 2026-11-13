import type { ReactNode } from 'react'

export interface PageMenuItem {
  name: string
  href?: string
  active?: boolean
  onClick?: () => void
  hidden?: boolean
}

export function PageHeader({ items, children }: { items?: PageMenuItem[]; children?: ReactNode }) {
  if ((!items || items.length === 0) && !children) {
    return null
  }
  return (
    <div className="ui menu text blue first-menu">
      {items?.map((item) =>
        item.hidden ? null : (
          <a
            key={item.name}
            className={`item${item.active ? ' active' : ''}`}
            href={item.href}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault()
                item.onClick()
              }
            }}
          >
            {item.name}
          </a>
        ),
      )}
      {children}
    </div>
  )
}
