import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AppError } from './errors'
import type { Category, Entry, Kind, Member, Rule, Settlement } from '../../lib/types'
import { taipeiToday } from '../../lib/dates'
import { notifyLine, tellLine } from '../line/api'

export type Data = {
  me: Member
  members: Member[]
  categories: Category[]
  rules: Rule[]
  entries: Entry[]
  settlements: Settlement[]
  loadedAt: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not-member' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Data; stale: boolean }

export type EntryInput = {
  kind: Kind
  amount: number
  title: string
  category_id: string
  day: string
  note: string
  /** 待繳：先記起來、還沒繳 */
  todo: boolean
}

const CACHE_KEY = 'home-ledger-cache-v2'

function readCache(userId: string): Data | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { userId: string; data: Data }
    return parsed.userId === userId ? parsed.data : null
  } catch {
    return null
  }
}

function writeCache(userId: string, data: Data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, data }))
  } catch {
    /* 無痕模式等情況存不了，不影響使用 */
  }
}

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

async function fetchAll(userId: string): Promise<Data | null> {
  const members = await must(supabase.from('hl_members').select('user_id,name,sort').order('sort'))
  const me = (members as Member[]).find((m) => m.user_id === userId)
  if (!me) return null
  // 每月固定先補上這個月的（兩支手機同時打開也不會重複）
  await must(supabase.rpc('hl_run_rules', { p_today: taipeiToday() }))
  const [categories, rules, entries, settlements] = await Promise.all([
    must(supabase.from('hl_categories').select('id,kind,name,icon,color,sort,hidden').order('sort')),
    must(supabase.from('hl_rules').select('id,kind,amount,title,category_id,dom,start_day,stopped_at').order('dom')),
    must(supabase.from('hl_entries').select('*').order('day', { ascending: false })),
    must(supabase.from('hl_settlements').select('id,no,upto,out_total,in_total,n,created_by,created_at').is('voided_at', null).order('no', { ascending: false })),
  ])
  return {
    me,
    members: members as Member[],
    categories: categories as Category[],
    rules: rules as Rule[],
    entries: entries as Entry[],
    settlements: (settlements as Settlement[]).map((x) => ({ ...x, out_total: Number(x.out_total), in_total: Number(x.in_total) })),
    loadedAt: new Date().toISOString(),
  }
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function useLedger(session: Session) {
  const userId = session.user.id
  const [state, setState] = useState<LoadState>(() => {
    const cached = readCache(userId)
    return cached ? { status: 'ready', data: cached, stale: true } : { status: 'loading' }
  })
  const online = useOnline()
  const seq = useRef(0)

  const refresh = useCallback(async () => {
    const mine = ++seq.current
    try {
      const data = await fetchAll(userId)
      if (mine !== seq.current) return
      if (!data) return setState({ status: 'not-member' })
      writeCache(userId, data)
      setState({ status: 'ready', data, stale: false })
    } catch (err) {
      if (mine !== seq.current) return
      setState((s) =>
        s.status === 'ready' ? { ...s, stale: true } : { status: 'error', message: err instanceof Error ? err.message : String(err) },
      )
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 對方手機改了 → 自動更新
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 300)
    }
    const ch = supabase
      .channel('home-ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hl_entries' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hl_categories' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hl_rules' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hl_settlements' }, later)
      .subscribe()
    const onVisible = () => document.visibilityState === 'visible' && later()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', later)
    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(ch)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', later)
    }
  }, [refresh])

  const guard = useCallback(() => {
    if (!navigator.onLine) throw new AppError('目前離線，資料沒有儲存。恢復連線後再試一次。', 'network')
  }, [])

  const actions = useMemo(
    () => ({
      refresh,
      /** repeatDom = 設成每月固定，每月幾號（null = 不重複） */
      async addEntry(input: EntryInput, repeatDom: number | null) {
        guard()
        const id = crypto.randomUUID()
        await must(
          supabase.rpc('hl_add_entry', {
            p_id: id,
            p_kind: input.kind,
            p_amount: input.amount,
            p_title: input.title,
            p_category: input.category_id,
            p_day: input.day,
            p_note: input.note,
            p_repeat: false,
          }),
        )
        if (input.todo) await must(supabase.from('hl_entries').update({ todo: true }).eq('id', id))
        if (repeatDom) await must(supabase.rpc('hl_make_rule', { p_entry: id, p_dom: repeatDom }))
        notifyLine(id)
        await refresh()
        return id
      },
      /** alsoRule = 以後每個月也一樣（只有每月固定的那筆會用到） */
      async updateEntry(entry: Entry, input: EntryInput, alsoRule: boolean, repeatDom: number | null = null) {
        guard()
        await must(supabase.from('hl_entries').update(input).eq('id', entry.id))
        const { kind, amount, title, category_id, day } = entry
        tellLine({ op: 'changed', id: entry.id, before: { kind, amount, title, category_id, day } })
        if (repeatDom && !entry.rule_id) await must(supabase.rpc('hl_make_rule', { p_entry: entry.id, p_dom: repeatDom }))
        if (alsoRule && entry.rule_id) {
          await must(
            supabase
              .from('hl_rules')
              .update({ kind: input.kind, amount: input.amount, title: input.title, category_id: input.category_id })
              .eq('id', entry.rule_id),
          )
        }
        await refresh()
      },
      async settle(upto: string) {
        guard()
        const r = (await must(supabase.rpc('hl_settle', { p_upto: upto }))) as { id: string }
        tellLine({ op: 'settled', id: r.id })
        await refresh()
        return r as unknown as { id: string; no: number; out_total: number; in_total: number; n: number }
      },
      async unsettle(id: string) {
        guard()
        await must(supabase.rpc('hl_unsettle', { p_id: id }))
        tellLine({ op: 'unsettled', id })
        await refresh()
      },
      /** 待繳的勾一下 = 繳了（paid=false 是復原） */
      async setPaid(id: string, paid: boolean) {
        guard()
        await must(supabase.from('hl_entries').update({ todo: !paid }).eq('id', id))
        await refresh()
      },
      async deleteEntry(id: string) {
        guard()
        await must(supabase.from('hl_entries').update({ deleted_at: new Date().toISOString() }).eq('id', id))
        tellLine({ op: 'changed', id })
        await refresh()
      },
      async restoreEntry(id: string) {
        guard()
        await must(supabase.from('hl_entries').update({ deleted_at: null }).eq('id', id))
        await refresh()
      },
      async stopRule(id: string) {
        guard()
        await must(supabase.from('hl_rules').update({ stopped_at: new Date().toISOString() }).eq('id', id))
        await refresh()
      },
      async resumeRule(id: string) {
        guard()
        await must(supabase.from('hl_rules').update({ stopped_at: null }).eq('id', id))
        await refresh()
      },
      async addCategory(c: { kind: Kind; name: string; icon: string; color: string; sort: number }) {
        guard()
        const id = crypto.randomUUID()
        await must(supabase.from('hl_categories').insert({ id, ...c }))
        await refresh()
        return id
      },
      async updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'hidden'>>) {
        guard()
        await must(supabase.from('hl_categories').update(patch).eq('id', id))
        await refresh()
      },
    }),
    [guard, refresh],
  )

  return { state, online, actions }
}

type Store = ReturnType<typeof useLedger>
const Ctx = createContext<Store | null>(null)

export function LedgerProvider({ session, children }: { session: Session; children: ReactNode }) {
  const store = useLedger(session)
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

/** 只在資料已載入的畫面使用 */
export function useData(): Data {
  const { state } = useStore()
  if (state.status !== 'ready') throw new Error('data not ready')
  return state.data
}
