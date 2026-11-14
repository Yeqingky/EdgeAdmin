import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { MenuSubItem, SessionData } from '../api/types'
import { menuIcon, subItemIcon } from './icons'

// 展开嵌套的子菜单, 只保留可点击的叶子项
function flattenSubItems(items?: MenuSubItem[]): MenuSubItem[] {
  if (!items) {
    return []
  }
  const result: MenuSubItem[] = []
  for (const item of items) {
    if (item.name === '-' || item.isOn === false) {
      continue
    }
    if (item.subItems && item.subItems.length > 0) {
      result.push(...flattenSubItems(item.subItems))
    } else if (item.url) {
      result.push(item)
    }
  }
  return result
}

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
      for (const item of flattenSubItems(module.subItems)) {
        const score = activeScore(item.url || '')
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
          let activeSubItem: MenuSubItem | null = null
          let activeSubItemScore = -1
          for (const item of flattenSubItems(module.subItems)) {
            const score = activeScore(item.url || '')
            if (score > activeSubItemScore) {
              activeSubItem = item
              activeSubItemScore = score
            }
          }
          function renderSubItem(item: MenuSubItem, key: string): React.ReactNode {
            if (item.name === '-') {
              return <div key={key} className="item separator" />
            }
            if (item.isOn === false) {
              return null
            }
            if (item.subItems && item.subItems.length > 0) {
              return (
                <div key={key} className="sub-group">
                  <div className="item sub-group-title">{item.name}</div>
                  {item.subItems.map((child, childIndex) => renderSubItem(child, `${key}-${childIndex}`))}
                </div>
              )
            }
            const ItemIcon = subItemIcon(item.icon)
            return (
              <Link key={key} className={`item${activeSubItem === item ? ' active' : ''}`} to={item.url || '#'}>
                {ItemIcon ? <ItemIcon size={13} className="icon" /> : null}
                <span>{item.name}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ui label tiny red">{item.badge < 100 ? item.badge : '99+'}</span>
                ) : null}
              </Link>
            )
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
                  {module.subItems!.map((item, index) => renderSubItem(item, `${module.code}-${index}`))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
