// 統計：月份加總、分類、累計趨勢、月曆。純函式，不碰畫面或資料庫。
import type { Category, Entry, Kind } from './types'
import { daysInMonth, parseYmd, shiftMonth, ymd } from './dates'

export const live = (e: Entry) => !e.deleted_at

export function inMonth(entries: Entry[], month: string): Entry[] {
  return entries.filter((e) => live(e) && e.day.startsWith(month + '-'))
}

export type Totals = { in: number; out: number; net: number }

export function totals(entries: Entry[]): Totals {
  let i = 0
  let o = 0
  for (const e of entries) {
    if (!live(e)) continue
    if (e.kind === 'in') i += e.amount
    else o += e.amount
  }
  return { in: i, out: o, net: i - o }
}

export type CatSlice = { category: Category; amount: number; share: number; count: number }

/** 某月某種（支出／收入）依分類加總，大到小；share 是 0–1 */
export function byCategory(entries: Entry[], categories: Category[], kind: Kind): CatSlice[] {
  const sum = new Map<string, { amount: number; count: number }>()
  for (const e of entries) {
    if (!live(e) || e.kind !== kind) continue
    const s = sum.get(e.category_id) ?? { amount: 0, count: 0 }
    s.amount += e.amount
    s.count += 1
    sum.set(e.category_id, s)
  }
  const total = [...sum.values()].reduce((a, b) => a + b.amount, 0)
  const out: CatSlice[] = []
  for (const [id, s] of sum) {
    const category = categories.find((c) => c.id === id)
    if (!category) continue
    out.push({ category, amount: s.amount, count: s.count, share: total ? s.amount / total : 0 })
  }
  return out.sort((a, b) => b.amount - a.amount || a.category.sort - b.category.sort)
}

/** 百分比四捨五入到 0.1，而且加起來剛好 100（最大餘數法） */
export function percents(shares: number[]): number[] {
  if (shares.length === 0) return []
  const raw = shares.map((s) => s * 1000)
  const floor = raw.map(Math.floor)
  let left = 1000 - floor.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - floor[i], i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (left <= 0) break
    floor[i] += 1
    left -= 1
  }
  return floor.map((n) => n / 10)
}

/** 每天累計支出：index 0 = 1 號；upTo 之後的日子是 null（不畫） */
export function cumulative(entries: Entry[], month: string, kind: Kind, upTo: number | null): (number | null)[] {
  const n = daysInMonth(month)
  const perDay = new Array<number>(n).fill(0)
  for (const e of inMonth(entries, month)) {
    if (e.kind !== kind) continue
    perDay[parseYmd(e.day).d - 1] += e.amount
  }
  let run = 0
  return perDay.map((v, i) => {
    run += v
    return upTo != null && i + 1 > upTo ? null : run
  })
}

/** 每天的收支（收入 − 支出），沒有資料的日子不放 */
export function dailyNet(entries: Entry[], month: string): Map<string, { in: number; out: number }> {
  const m = new Map<string, { in: number; out: number }>()
  for (const e of inMonth(entries, month)) {
    const v = m.get(e.day) ?? { in: 0, out: 0 }
    if (e.kind === 'in') v.in += e.amount
    else v.out += e.amount
    m.set(e.day, v)
  }
  return m
}

/** 月曆格子：週一開頭，每格是日期字串，前後補上個月、下個月的日子 */
export function calendar(month: string): { day: string; inMonth: boolean }[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 0 = 日
  const lead = (first + 6) % 7
  const n = daysInMonth(month)
  const cells: { day: string; inMonth: boolean }[] = []
  const prev = shiftMonth(month, -1)
  const prevN = daysInMonth(prev)
  const [py, pm] = prev.split('-').map(Number)
  for (let i = lead; i > 0; i--) cells.push({ day: ymd(py, pm, prevN - i + 1), inMonth: false })
  for (let d = 1; d <= n; d++) cells.push({ day: ymd(y, m, d), inMonth: true })
  const next = shiftMonth(month, 1)
  const [ny, nm] = next.split('-').map(Number)
  let d = 1
  while (cells.length % 7 !== 0) cells.push({ day: ymd(ny, nm, d++), inMonth: false })
  const weeks: { day: string; inMonth: boolean }[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 一個月的列表：依日期新到舊，同一天依建立時間新到舊 */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => (a.day === b.day ? b.created_at.localeCompare(a.created_at) : b.day.localeCompare(a.day)))
}

/** 小數字的月曆標示：12,345 → 1.2萬；999 → 999 */
export function short(n: number): string {
  if (n >= 100000) return `${Math.round(n / 10000)}萬`
  if (n >= 10000) return `${(Math.round(n / 1000) / 10).toString()}萬`
  return n.toLocaleString('en-US')
}

/** 還沒結算的（到 upto 那天為止） */
export function unsettled(entries: Entry[], upto: string): Entry[] {
  return sortEntries(entries.filter((e) => live(e) && !e.settlement_id && !e.todo && e.day <= upto))
}

/** 待繳的帳（先記起來、還沒繳），日子早的在前 */
export function todos(entries: Entry[]): Entry[] {
  return entries.filter((e) => live(e) && e.todo).sort((a, b) => a.day.localeCompare(b.day) || a.created_at.localeCompare(b.created_at))
}
