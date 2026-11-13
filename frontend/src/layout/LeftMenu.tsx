import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { SessionData } from '../api/types'
import { menuIcon } from './icons'

export function LeftMenu({ session }: { session: SessionData }) {
  const location = useLocation()
  const theme = session.teaTheme || 'theme2'
  const current = location.pathname
  const activeModule = session.teaModules.find(
    (module) => module.code.length > 0 && (current === `/${module.code}` || current.startsWith(`/${module.code}/`)),
  )
  const [openCodes, setOpenCodes] = useState<Record<string, boolean>>(() =>
    activeModule?.code ? { [activeModule.code]: true } : {},
  )
  useEffect(() => {
    if (activeModule?.code) {
      setOpenCodes((codes) => (codes[activeModule.code] ? codes : { ...codes, [activeModule.code]: true }))
    }
  }, [activeModule?.code])

  return (
    <div className={`main-menu ${theme}`}>
      <div className="ui labeled menu vertical blue inverted tiny borderless">
        <div className="item" />
        {session.teaModules.map((module) => {
          if (module.isOn === false) {
            return null
          }
          if (!module.code) {
            return <div key={`separator-${module.name}`} className="item separator" />
          }
          const Icon = menuIcon(module.code)
          const isActive = activeModule?.code === module.code
          const firstUrl = module.subItems?.[0]?.url || `/${module.code}`
          const hasSubItems = !!module.subItems && module.subItems.length > 0
          const isOpen = !!openCodes[module.code]
          function toggleOpen(event: React.MouseEvent | React.KeyboardEvent) {
            event.preventDefault()
            event.stopPropagation()
            setOpenCodes((codes) => ({ ...codes, [module.code]: !codes[module.code] }))
          }
          return (
            <div key={module.code}>
              <Link className={`item module-item${isActive ? ' active expend' : ''}`} to={firstUrl}>
                <Icon size={16} />
                <span className="module-name">{module.name}</span>
                {module.subtitle ? <div className="subtitle">{module.subtitle}</div> : null}
                {hasSubItems ? (
                  <span
                    className={`expand-arrow${isOpen ? ' open' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={isOpen ? '收起' : '展开'}
                    onClick={toggleOpen}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        toggleOpen(event)
                      }
                    }}
                  >
                    <ChevronRight size={14} />
                  </span>
                ) : null}
              </Link>
              {isOpen && hasSubItems ? (
                <div className="sub-items">
                  {module.subItems!.map((item, index) =>
                    item.name === '-' ? (
                      <div key={`${module.code}-separator-${index}`} className="item separator" />
                    ) : item.isOn === false ? null : (
                      <Link
                        key={`${module.code}-${item.code}-${item.url}`}
                        className={`item${current === item.url ? ' active' : ''}`}
                        to={item.url}
                      >
                        <span>{item.name}</span>
                        {item.badge && item.badge > 0 ? (
                          <span className="ui label tiny red">{item.badge < 100 ? item.badge : '99+'}</span>
                        ) : null}
                      </Link>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
