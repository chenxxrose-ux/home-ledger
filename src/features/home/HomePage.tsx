import { useMemo } from 'react'
import { useData } from '../data/store'
import { MonthBar } from '../../ui/kit'
import { cumulative, inMonth, totals } from '../../lib/stats'
import { fmt } from '../../lib/money'
import { daysInMonth, formatDay, monthOf, parseYmd, shiftMonth, taipeiToday } from '../../lib/dates'
import { TrendChart } from './TrendChart'
import { EntryRow } from '../shared/EntryRow'
import type { Entry, Kind } from '../../lib/types'

export function HomePage({
  month,
  setMonth,
  onAdd,
  onOpen,
}: {
  month: string
  setMonth: (m: string) => void
  onAdd: (k: Kind) => void
  onOpen: (e: Entry) => void
}) {
  const data = useData()
  const today = taipeiToday()
  const current = monthOf(today)
  const isCurrent = month === current
  const upTo = isCurrent ? parseYmd(today).d : null
  const prev = shiftMonth(month, -1)

  const t = useMemo(() => totals(inMonth(data.entries, month)), [data.entries, month])
  const thisLine = useMemo(() => cumulative(data.entries, month, 'out', upTo), [data.entries, month, upTo])
  const lastLine = useMemo(() => cumulative(data.entries, prev, 'out', null), [data.entries, prev])
  const recent = useMemo(
    () =>
      data.entries
        .filter((e) => !e.deleted_at)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [data.entries],
  )
  const hasAny = data.entries.some((e) => !e.deleted_at)
  const cat = (id: string) => data.categories.find((c) => c.id === id)

  // 跟上個月同一天比（上個月沒那麼多天就比到月底）
  const sameDay = upTo ?? daysInMonth(month)
  const lastAt = lastLine[Math.min(sameDay, lastLine.length) - 1] ?? 0
  const nowAt = thisLine[Math.min(sameDay, thisLine.length) - 1] ?? 0
  const lastHas = lastLine[lastLine.length - 1] !== 0
  const diff = nowAt - (lastAt ?? 0)

  return (
    <div className="page home">
      <MonthBar month={month} setMonth={setMonth} max={current} />

      <section className="card summary" aria-label="這個月的收支">
        <div className="sum-row">
          <span>收入</span>
          <span className="num in">{fmt(t.in)}</span>
        </div>
        <div className="sum-row">
          <span>支出</span>
          <span className="num out">{fmt(t.out)}</span>
        </div>
        <div className="sum-row total">
          <span>收支</span>
          <span className="num">{t.net < 0 ? '−' : ''}{fmt(t.net)}</span>
        </div>
      </section>

      {!hasAny ? (
        <section className="card empty">
          <p className="empty-title">這裡是你們兩個人的生活帳</p>
          <p className="note">花了錢就按下面的「− 支出」，打金額、選分類就記好了。房貸、車貸這種每個月都有的，打開「每月重複」只要記一次。</p>
        </section>
      ) : (
        <>
          <section className="card trend-card" aria-label="支出趨勢">
            <div className="card-head">
              <h2>支出趨勢</h2>
              <span className="legend">
                <span className="lg now">{isCurrent ? '這個月' : `${Number(month.slice(5))} 月`}</span>
                <span className="lg old">{`${Number(prev.slice(5))} 月`}</span>
              </span>
            </div>
            <TrendChart month={month} thisMonth={thisLine} lastMonth={lastLine} />
            {lastHas && (
              <p className="note num">
                {isCurrent ? '比上個月同期' : '比上個月'}
                {diff === 0 ? '花得一樣多' : diff > 0 ? `多花 ${fmt(diff)}` : `少花 ${fmt(-diff)}`}
              </p>
            )}
          </section>

          <section aria-label="最近記的">
            <h2 className="sec">最近記的</h2>
            <div className="card list">
              {recent.map((e) => (
                <EntryRow key={e.id} entry={e} category={cat(e.category_id)} sub={formatDay(e.day, today)} onOpen={() => onOpen(e)} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="fab-row">
        <button type="button" className="fab out" onClick={() => onAdd('out')}>
          − 支出
        </button>
        <button type="button" className="fab in" onClick={() => onAdd('in')}>
          ＋ 收入
        </button>
      </div>
    </div>
  )
}
