import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from '../features/data/supabase'
import { LedgerProvider, useStore } from '../features/data/store'
import { Login } from '../features/auth/Login'
import { HomePage } from '../features/home/HomePage'
import { ListPage } from '../features/list/ListPage'
import { ChartPage } from '../features/chart/ChartPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { EntryForm } from '../features/entry/EntryForm'
import { ToastProvider } from '../ui/kit'
import { UiIcon } from '../ui/icons'
import { formatTaipeiTime, monthOf, taipeiToday } from '../lib/dates'
import type { Entry, Kind } from '../lib/types'

type Tab = 'home' | 'list' | 'chart' | 'settings'
const TABS: { key: Tab; label: string; icon: 'homeTab' | 'list' | 'pie' | 'gear' }[] = [
  { key: 'home', label: '主畫面', icon: 'homeTab' },
  { key: 'list', label: '列表', icon: 'list' },
  { key: 'chart', label: '圖表', icon: 'pie' },
  { key: 'settings', label: '設定', icon: 'gear' },
]
const TITLE: Record<Tab, string> = { home: '偶們家', list: '列表', chart: '圖表', settings: '設定' }

function readTab(): Tab {
  const h = location.hash.replace('#', '')
  return h === 'list' || h === 'chart' || h === 'settings' ? h : 'home'
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!configured) {
    return (
      <main className="login">
        <h1>偶們家記帳</h1>
        <div className="banner error">網站尚未設定資料庫連線。</div>
      </main>
    )
  }
  if (session === undefined) return <p className="loading">載入中…</p>
  if (!session)
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    )

  return (
    <ToastProvider>
      <LedgerProvider key={session.user.id} session={session}>
        <Shell />
      </LedgerProvider>
    </ToastProvider>
  )
}

type Form = { kind?: Kind; entry?: Entry; day?: string } | null

function Shell() {
  const { state, online, actions } = useStore()
  const [tab, setTabState] = useState<Tab>(readTab)
  const [month, setMonth] = useState(() => monthOf(taipeiToday()))
  const [form, setForm] = useState<Form>(null)

  useEffect(() => {
    const onHash = () => setTabState(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setTab = (t: Tab) => {
    history.replaceState(null, '', t === 'home' ? location.pathname : `#${t}`)
    setTabState(t)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>{TITLE[tab]}</h1>
      </header>

      {!online && (
        <div className="banner warn" role="status">
          目前離線。畫面是最後載入的資料，恢復連線前不能記帳。
        </div>
      )}
      {online && state.status === 'ready' && state.stale && (
        <div className="banner warn" role="status">
          無法取得最新資料，顯示的是 {formatTaipeiTime(state.data.loadedAt)} 的內容。{' '}
          <button type="button" className="link-btn" onClick={() => void actions.refresh()}>
            重試
          </button>
        </div>
      )}

      {state.status === 'loading' && <p className="loading">載入中…</p>}
      {state.status === 'error' && (
        <div className="banner error" role="alert">
          載入失敗：{state.message}{' '}
          <button type="button" className="link-btn" onClick={() => void actions.refresh()}>
            重試
          </button>
        </div>
      )}
      {state.status === 'not-member' && (
        <div className="banner error" role="alert">
          這個帳號還沒加入偶們家記帳。請用阿寶或草莓的帳號登入。{' '}
          <button type="button" className="link-btn" onClick={() => void supabase.auth.signOut()}>
            登出
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <main>
          {tab === 'home' && (
            <HomePage month={month} setMonth={setMonth} onAdd={(kind) => setForm({ kind })} onOpen={(entry) => setForm({ entry })} />
          )}
          {tab === 'list' && (
            <ListPage month={month} setMonth={setMonth} onOpen={(entry) => setForm({ entry })} onAddOn={(day) => setForm({ kind: 'out', day })} />
          )}
          {tab === 'chart' && <ChartPage month={month} setMonth={setMonth} />}
          {tab === 'settings' && <SettingsPage />}
        </main>
      )}

      {form && state.status === 'ready' && (
        <EntryForm key={form.entry?.id ?? 'new'} kind={form.kind} entry={form.entry} day={form.day} onClose={() => setForm(null)} />
      )}

      <nav className="tabbar" aria-label="主選單">
        {TABS.map((t) => (
          <button key={t.key} type="button" aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
            <UiIcon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
