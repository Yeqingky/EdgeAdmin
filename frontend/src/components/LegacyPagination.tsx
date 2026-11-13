import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export function LegacyPagination({ html }: { html?: string }) {
  const navigate = useNavigate()
  const items = useMemo(() => {
    if (!html) {
      return []
    }
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return Array.from(doc.querySelectorAll('a')).map((anchor) => ({
      text: anchor.textContent || '',
      href: anchor.getAttribute('href') || '',
      active: anchor.classList.contains('active'),
    }))
  }, [html])

  if (items.length === 0) {
    return null
  }

  return (
    <div className="page">
      {items.map((item, index) =>
        item.href ? (
          <a
            key={`${item.text}-${index}`}
            href={`#${item.href}`}
            className={item.active ? 'active' : undefined}
            onClick={(event) => {
              event.preventDefault()
              const url = new URL(item.href, window.location.origin)
              navigate(`${url.pathname}${url.search}`)
            }}
          >
            {item.text}
          </a>
        ) : (
          <a key={`${item.text}-${index}`} className={item.active ? 'active' : undefined} onClick={(event) => event.preventDefault()}>
            {item.text}
          </a>
        ),
      )}
    </div>
  )
}
