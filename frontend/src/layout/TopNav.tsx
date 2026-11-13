import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, Languages, Leaf, LogOut, Palette, User } from 'lucide-react'
import type { SessionData } from '../api/types'
import { apiPost } from '../api/client'
import { SESSION_KEY } from '../api/session'

export function TopNav({ session }: { session: SessionData }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [messageCount, setMessageCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      apiPost<{ count: number }>('/messages/badge')
        .then((data) => {
          if (!cancelled) {
            setMessageCount(data.count || 0)
          }
        })
        .catch(() => undefined)
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  async function switchTheme() {
    try {
      const data = await apiPost<{ theme: string }>('/ui/theme')
      queryClient.setQueryData(SESSION_KEY, { ...session, teaTheme: data.theme })
    } catch {
      // ignore
    }
  }

  async function switchLang() {
    try {
      await apiPost('/settings/lang/switch')
      window.location.reload()
    } catch {
      // ignore
    }
  }

  async function logout() {
    await fetch('/logout', { credentials: 'include' })
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  const theme = session.teaTheme || 'theme2'

  return (
    <div className={`ui menu top-nav blue inverted small borderless ${theme}`}>
      <a href="/spa/#/dashboard" className="item">
        {session.teaLogoFileId > 0 ? (
          <img alt="logo" src={`/ui/image/${session.teaLogoFileId}`} style={{ width: 'auto', height: '1.6em' }} />
        ) : (
          <Leaf size={16} />
        )}
        &nbsp; {session.teaTitle}&nbsp;
        {session.teaShowVersion ? (
          <sup>
            v{session.teaVersion}
            {session.teaVersion.split('.').length === 4 ? (
              <span title="当前版本为测试版，再次感谢您参与测试"> beta</span>
            ) : null}
          </sup>
        ) : null}
      </a>

      <div className="right menu">
        <a href="/spa/#/messages" className="item" title="消息">
          {messageCount > 0 ? <Bell size={14} /> : <Bell size={14} className="disabled" />}
          <span>消息({messageCount})</span>
        </a>
        <a href="/spa/#/settings/profile" className="item" title="个人信息">
          {session.teaUsername ? (
            <>
              <User size={14} />
              <span>{session.teaUsername}</span>
            </>
          ) : (
            <User size={14} />
          )}
        </a>
        <a href="" className="item" title="切换语言" onClick={(event) => { event.preventDefault(); void switchLang() }}>
          <Languages size={14} />
        </a>
        <a href="" className="item" title="切换界面风格" onClick={(event) => { event.preventDefault(); void switchTheme() }}>
          <Palette size={14} />
        </a>
        <a href="" className="item" title="安全退出登录" onClick={(event) => { event.preventDefault(); void logout() }}>
          <LogOut size={14} />
          <span>退出登录</span>
        </a>
      </div>
    </div>
  )
}
