import { useMemo } from 'react'
import { useData } from '../data/store'
import { MonthBar } from '../../ui/kit'
import { cumulative, inMonth, todos, totals, unsettled } from '../../lib/stats'
import { usePaid } from '../shared/usePaid'
import { useRemove } from '../shared/useRemove'
import { fmt } from '../../lib/money'
import { daysInMonth, formatDay, monthOf, parseYmd, shiftMonth, taipeiToday } from '../../lib/dates'
import { TrendChart } from './TrendChart'
import { EntryRow } from '../shared/EntryRow'
import { UiIcon } from '../../ui/icons'
import type { Entry, Kind } from '../../lib/types'

export function HomePage({
  month,
  setMonth,
  onAdd,
  onOpen,
  onSettle,
}: {
  month: string
  setMonth: (m: string) => void
  onAdd: (k: Kind) => void
  onOpen: (e: Entry) => void
  onSettle: () => void
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
  const pend = useMemo(() => unsettled(data.entries, today), [data.entries, today])
  const pendOut = pend.reduce((a, e) => a + (e.kind === 'out' ? e.amount : 0), 0)
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  const todo = useMemo(() => todos(data.entries), [data.entries])
  const todoOut = todo.reduce((a, e) => a + (e.kind === 'out' ? e.amount : 0), 0)
  const paid = usePaid()
  const remove = useRemove()

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

      {todo.length > 0 && (
        <section aria-label="待繳">
          <div className="todo-head">
            <h2 className="sec">待繳 {todo.length} 筆</h2>
            <span className="note num">共 {fmt(todoOut)} 元・繳了就勾右邊的圈</span>
          </div>
          <div className="card list">
            {todo.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                category={cat(e.category_id)}
                sub={formatDay(e.day, today)}
                onOpen={() => onOpen(e)}
                onPaid={() => paid(e, e.title || cat(e.category_id)?.name || '')}
                onDelete={() => remove(e, e.title || cat(e.category_id)?.name || '')}
              />
            ))}
          </div>
        </section>
      )}

      {pend.length > 0 && (
        <button type="button" className="card settle-mini" onClick={onSettle} aria-label={`還沒結算，累計支出 ${fmt(pendOut)} 元，${pend.length} 筆，看結算`}>
          <span className="er-text">
            <span className="sm-label">還沒結算・累計支出</span>
            <span className="note">{pend.length} 筆{data.settlements[0] ? `・第 ${data.settlements[0].no} 次結算之後` : ''}</span>
          </span>
          <span className="num sm-amt">{fmt(pendOut)}</span>
          <UiIcon name="chevR" size={18} />
        </button>
      )}

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
                <EntryRow
                  key={e.id}
                  entry={e}
                  category={cat(e.category_id)}
                  sub={formatDay(e.day, today)}
                  onOpen={() => onOpen(e)}
                  onPaid={() => paid(e, e.title || cat(e.category_id)?.name || '')}
                onDelete={() => remove(e, e.title || cat(e.category_id)?.name || '')}
                />
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
