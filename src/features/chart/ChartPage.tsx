import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { MonthBar } from '../../ui/kit'
import { byCategory, inMonth, percents, totals } from '../../lib/stats'
import { fmt } from '../../lib/money'
import { monthOf, taipeiToday } from '../../lib/dates'
import { COLORS, CatIcon } from '../../ui/icons'
import type { Kind } from '../../lib/types'

const R = 70
const C = 2 * Math.PI * R

export function ChartPage({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const data = useData()
  const [kind, setKind] = useState<Kind>('out')
  const entries = useMemo(() => inMonth(data.entries, month), [data.entries, month])
  const slices = useMemo(() => byCategory(entries, data.categories, kind), [entries, data.categories, kind])
  const pct = percents(slices.map((s) => s.share))
  const t = totals(entries)
  const total = kind === 'out' ? t.out : t.in

  let offset = 0
  const arcs = slices.map((s) => {
    const len = s.share * C
    const a = { id: s.category.id, color: (COLORS[s.category.color] ?? COLORS.gray).chart, len, offset }
    offset += len
    return a
  })
  const label = slices.map((s, i) => `${s.category.name} ${pct[i]}%`).join('、')

  return (
    <div className="page chart-page">
      <MonthBar month={month} setMonth={setMonth} max={monthOf(taipeiToday())} />
      <div className="seg" role="group" aria-label="支出或收入">
        <button type="button" aria-pressed={kind === 'out'} className="seg-out" onClick={() => setKind('out')}>
          支出
        </button>
        <button type="button" aria-pressed={kind === 'in'} className="seg-in" onClick={() => setKind('in')}>
          收入
        </button>
      </div>

      {slices.length === 0 ? (
        <section className="card empty">
          <p className="empty-title">這個月還沒有{kind === 'out' ? '支出' : '收入'}</p>
          <p className="note">記帳之後，這裡會用圓餅圖告訴你錢花在哪。</p>
        </section>
      ) : (
        <>
          <section className="card donut-card">
            <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={`${kind === 'out' ? '支出' : '收入'} ${fmt(total)} 元：${label}`}>
              <g transform="rotate(-90 110 110)" fill="none" strokeWidth="30">
                {arcs.map((a) => (
                  <circle
                    key={a.id}
                    cx="110"
                    cy="110"
                    r={R}
                    stroke={a.color}
                    strokeDasharray={`${Math.max(0, a.len - (arcs.length > 1 ? 1.5 : 0))} ${C}`}
                    strokeDashoffset={-a.offset}
                  />
                ))}
              </g>
              <text x="110" y="102" textAnchor="middle" className="donut-k">
                {kind === 'out' ? '支出' : '收入'}
              </text>
              <text x="110" y="128" textAnchor="middle" className="donut-v">
                {fmt(total)}
              </text>
            </svg>
          </section>
          <section className="card list" aria-label="分類">
            {slices.map((s, i) => (
              <div className="cat-row" key={s.category.id}>
                <CatIcon icon={s.category.icon} color={s.category.color} size={32} />
                <span className="cr-name">
                  {s.category.name}
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, s.share * 100)}%`, background: (COLORS[s.category.color] ?? COLORS.gray).chart }} />
                  </span>
                </span>
                <span className="cr-pct num">{pct[i].toFixed(1)}%</span>
                <span className="cr-amt num">{fmt(s.amount)}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
