import { Link, useLocation } from 'react-router-dom'
import type { SessionData } from '../api/types'
import { menuIcon } from './icons'

export function LeftMenu({ session }: { session: SessionData }) {
  const location = useLocation()
  const theme = session.teaTheme || 'theme2'
  const current = location.pathname
  const activeModule = session.teaModules.find(
    (module) => module.code.length > 0 && (current === `/${module.code}` || current.startsWith(`/${module.code}/`)),
  )

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
          return (
            <div key={module.code}>
              <Link className={`item${isActive ? ' active expend' : ''}`} to={firstUrl}>
                <Icon size={16} />
                <span className="module-name">{module.name}</span>
                {module.subtitle ? <div className="subtitle">{module.subtitle}</div> : null}
              </Link>
              {isActive && module.subItems ? (
                <div className="sub-items">
                  {module.subItems.map((item, index) =>
                    item.name === '-' ? (
                      <div key={`${module.code}-separator-${index}`} className="item separator" />
                    ) : item.isOn === false ? null : (
                      <Link
                        key={`${module.code}-${item.code}-${item.url}`}
                        className={`item${current === item.url ? ' active' : ''}`}
                        to={item.url}
                      >
                        {current === item.url ? <i className="icon angle right" /> : null}
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
