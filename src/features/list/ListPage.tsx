import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { MonthBar } from '../../ui/kit'
import { calendar, dailyNet, inMonth, short, sortEntries } from '../../lib/stats'
import { fmt } from '../../lib/money'
import { formatDay, monthOf, parseYmd, taipeiToday } from '../../lib/dates'
import { EntryRow } from '../shared/EntryRow'
import { usePaid } from '../shared/usePaid'
import { useRemove } from '../shared/useRemove'
import type { Entry } from '../../lib/types'

const WK = ['一', '二', '三', '四', '五', '六', '日']

export function ListPage({
  month,
  setMonth,
  onOpen,
  onAddOn,
}: {
  month: string
  setMonth: (m: string) => void
  onOpen: (e: Entry) => void
  onAddOn: (day: string) => void
}) {
  const paid = usePaid()
  const remove = useRemove()
  const data = useData()
  const today = taipeiToday()
  const [picked, setPicked] = useState<string | null>(null)
  const sel = picked && picked.startsWith(month) ? picked : null

  const weeks = useMemo(() => calendar(month), [month])
  const perDay = useMemo(() => dailyNet(data.entries, month), [data.entries, month])
  const list = useMemo(() => sortEntries(inMonth(data.entries, month)), [data.entries, month])
  const shown = sel ? list.filter((e) => e.day === sel) : list
  const groups = useMemo(() => {
    const g: { day: string; items: Entry[] }[] = []
    for (const e of shown) {
      const last = g[g.length - 1]
      if (last && last.day === e.day) last.items.push(e)
      else g.push({ day: e.day, items: [e] })
    }
    return g
  }, [shown])
  const cat = (id: string) => data.categories.find((c) => c.id === id)

  return (
    <div className="page list-page">
      <MonthBar
        month={month}
        setMonth={(m) => {
          setMonth(m)
          setPicked(null)
        }}
        max={monthOf(today)}
      />

      <section className="card cal" aria-label="月曆">
        <div className="cal-row head">
          {WK.map((w, i) => (
            <span key={w} className={i >= 5 ? 'we' : ''}>
              {w}
            </span>
          ))}
        </div>
        {weeks.map((wk) => (
          <div className="cal-row" key={wk[0].day}>
            {wk.map((c, i) => {
              const v = perDay.get(c.day)
              const isToday = c.day === today
              return (
                <button
                  key={c.day}
                  type="button"
                  className={`cal-cell${c.inMonth ? '' : ' off'}${i >= 5 ? ' we' : ''}${sel === c.day ? ' on' : ''}${isToday ? ' today' : ''}`}
                  disabled={!c.inMonth}
                  aria-pressed={sel === c.day}
                  aria-label={`${formatDay(c.day, today)}${v ? `，支出 ${fmt(v.out)}，收入 ${fmt(v.in)}` : ''}`}
                  onClick={() => setPicked(sel === c.day ? null : c.day)}
                >
                  <span className="cal-d num">{parseYmd(c.day).d}</span>
                  {c.inMonth && v && v.out > 0 && <span className="cal-v out num">−{short(v.out)}</span>}
                  {c.inMonth && v && v.out === 0 && v.in > 0 && <span className="cal-v in num">+{short(v.in)}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </section>

      {sel && (
        <div className="day-head">
          <span>{formatDay(sel, today)}</span>
          <button type="button" className="link-btn" onClick={() => onAddOn(sel)}>
            ＋ 記在這天
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <section className="card empty">
          <p className="empty-title">{sel ? '這天沒有記帳' : '這個月還沒有記帳'}</p>
          <p className="note">{sel ? '按上面的「記在這天」補記一筆。' : '回主畫面按「− 支出」或「＋ 收入」記第一筆。'}</p>
        </section>
      ) : (
        groups.map((g) => {
          const v = perDay.get(g.day)
          return (
            <section key={g.day} aria-label={formatDay(g.day, today)}>
              {!sel && (
                <h2 className="sec split">
                  <span>{formatDay(g.day, today)}</span>
                  <span className="num">{v && v.out > 0 ? `支出 ${fmt(v.out)}` : ''}{v && v.in > 0 ? `${v.out > 0 ? '・' : ''}收入 ${fmt(v.in)}` : ''}</span>
                </h2>
              )}
              <div className="card list">
                {g.items.map((e) => (
                  <EntryRow key={e.id} entry={e} category={cat(e.category_id)} onOpen={() => onOpen(e)} onPaid={() => paid(e, e.title || cat(e.category_id)?.name || '')} onDelete={() => remove(e, e.title || cat(e.category_id)?.name || '')} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
