import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { SessionData } from '../api/types'
import { menuIcon } from './icons'

export function LeftMenu({ session }: { session: SessionData }) {
  const location = useLocation()
  const theme = session.teaTheme || 'theme2'
  const current = location.pathname
  function pathOf(url: string) {
    try {
      return new URL(url, window.location.origin).pathname
    } catch {
      return ''
    }
  }
  function activeScore(url: string) {
    const path = pathOf(url)
    if (!path) {
      return -1
    }
    if (current === path) {
      return 100000 + path.length
    }
    const base = path.endsWith('/') ? path.slice(0, -1) : path
    if (base && current.startsWith(base + '/')) {
      return base.length
    }
    return -1
  }
  const activeModule = session.teaModules.find(
    (module) => module.code.length > 0 && (current === `/${module.code}` || current.startsWith(`/${module.code}/`)),
  )

  // 当前路径所属的分组 (按子菜单 URL 最长匹配)
  const currentGroupCode = useMemo(() => {
    let bestCode = ''
    let bestScore = -1
    for (const module of session.teaModules) {
      if (!module.code || module.isOn === false || !module.subItems || module.subItems.length === 0) {
        continue
      }
      for (const item of module.subItems) {
        if (item.name === '-' || item.isOn === false) {
          continue
        }
        const score = activeScore(item.url)
        if (score > bestScore) {
          bestScore = score
          bestCode = module.code
        }
      }
    }
    return bestScore >= 0 ? bestCode : ''
  }, [current, session.teaModules])

  // 当前分组可手动收起, 刷新或切换页面后自动展开
  const [currentCollapsed, setCurrentCollapsed] = useState(false)
  // 手动展开的另一个分组, 同时最多一个; 与当前分组合计最多两个
  const [openedCode, setOpenedCode] = useState('')
  useEffect(() => {
    setCurrentCollapsed(false)
    setOpenedCode((code) => (code === currentGroupCode ? '' : code))
  }, [currentGroupCode])

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
          const isOpen = module.code === currentGroupCode ? !currentCollapsed : openedCode === module.code
          let activeSubItem: NonNullable<typeof module.subItems>[number] | null = null
          let activeSubItemScore = -1
          if (module.subItems) {
            for (const item of module.subItems) {
              if (item.name === '-' || item.isOn === false) {
                continue
              }
              const score = activeScore(item.url)
              if (score > activeSubItemScore) {
                activeSubItem = item
                activeSubItemScore = score
              }
            }
          }
          function toggleOpen(event: React.MouseEvent | React.KeyboardEvent) {
            event.preventDefault()
            event.stopPropagation()
            if (module.code === currentGroupCode) {
              setCurrentCollapsed((collapsed) => !collapsed)
              return
            }
            setOpenedCode((code) => (code === module.code ? '' : module.code))
          }
          const content = (
            <>
              <Icon size={16} />
              <span className="module-name">{module.name}</span>
              {module.subtitle ? <div className="subtitle">{module.subtitle}</div> : null}
              {hasSubItems ? (
                <span className={`expand-arrow${isOpen ? ' open' : ''}`} aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              ) : null}
            </>
          )
          return (
            <div key={module.code}>
              {hasSubItems ? (
                <div
                  className={`item module-item${isActive ? ' active expend' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={toggleOpen}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      toggleOpen(event)
                    }
                  }}
                >
                  {content}
                </div>
              ) : (
                <Link className={`item module-item${isActive ? ' active expend' : ''}`} to={firstUrl}>
                  {content}
                </Link>
              )}
              {isOpen && hasSubItems ? (
                <div className="sub-items">
                  {module.subItems!.map((item, index) =>
                    item.name === '-' ? (
                      <div key={`${module.code}-separator-${index}`} className="item separator" />
                    ) : item.isOn === false ? null : (
                      <Link
                        key={`${module.code}-${item.code}-${item.url}`}
                        className={`item${activeSubItem === item ? ' active' : ''}`}
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
