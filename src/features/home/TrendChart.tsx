import { daysInMonth } from '../../lib/dates'
import { fmt } from '../../lib/money'

/** 一個漂亮的上限：53,773 → 6 萬；146,453 → 15 萬 */
export function niceMax(v: number): number {
  if (v <= 0) return 1000
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const mag = 10 ** Math.floor(Math.log10(v))
  for (const s of steps) if (s * mag >= v) return s * mag
  return 10 * mag
}

function axisLabel(v: number): string {
  if (v === 0) return '0'
  if (v >= 10000) return `${Math.round((v / 10000) * 10) / 10}萬`
  return fmt(v)
}

const W = 330
const H = 150
const L = 0
const R = 290
const T = 10
const B = 128

/** 這個月和上個月的累計支出 */
export function TrendChart({
  month,
  thisMonth,
  lastMonth,
}: {
  month: string
  thisMonth: (number | null)[]
  lastMonth: (number | null)[]
}) {
  const n = daysInMonth(month)
  const max = niceMax(Math.max(0, ...thisMonth.map((v) => v ?? 0), ...lastMonth.map((v) => v ?? 0)))
  const x = (i: number) => L + (i / 30) * (R - L) // 1–31 號平均分布，大小月對齊
  const y = (v: number) => B - (v / max) * (B - T)

  // 階梯線：某天有花錢就往上跳
  const path = (vals: (number | null)[]) => {
    let d = `M${x(0)},${y(0)}`
    let prev = 0
    let last = 0
    vals.forEach((v, i) => {
      if (v == null) return
      last = i
      if (v !== prev) {
        d += ` L${x(i)},${y(prev)} L${x(i)},${y(v)}`
        prev = v
      }
    })
    return d + ` L${x(last)},${y(prev)}`
  }

  const lastIdx = thisMonth.reduce<number>((acc, v, i) => (v != null ? i : acc), -1)
  const grid = [0, 0.5, 1].map((f) => Math.round(max * f))
  const label = `累計支出：這個月 ${fmt(thisMonth[lastIdx] ?? 0)} 元`

  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={label}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={L} x2={R} y1={y(g)} y2={y(g)} stroke="var(--hair)" />
          <text x={R + 6} y={y(g) + 4} className="ax">
            {axisLabel(g)}
          </text>
        </g>
      ))}
      <path d={path(lastMonth)} fill="none" stroke="var(--line-old)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={path(thisMonth)} fill="none" stroke="var(--out)" strokeWidth={3} strokeLinejoin="round" />
      {lastIdx >= 0 && <circle cx={x(lastIdx)} cy={y(thisMonth[lastIdx] ?? 0)} r={4.5} fill="var(--out)" />}
      {[1, 11, 21, n].map((d) => (
        <text key={d} x={x(d - 1)} y={H + 12} className="ax" textAnchor={d === 1 ? 'start' : d === n ? 'end' : 'middle'}>
          {d}日
        </text>
      ))}
    </svg>
  )
}
