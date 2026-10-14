import { describe, expect, it } from 'vitest'
import { byCategory, calendar, cumulative, dailyNet, inMonth, percents, short, totals, unsettled } from './stats'
import type { Category, Entry } from './types'

const cat = (id: string, sort = 0): Category => ({ id, kind: 'out', name: id, icon: 'dots', color: 'gray', sort, hidden: false })
let n = 0
const e = (day: string, amount: number, kind: 'in' | 'out' = 'out', category_id = 'a', deleted = false): Entry => ({
  id: String(++n),
  kind,
  amount,
  title: '',
  category_id,
  day,
  note: '',
  rule_id: null,
  created_by: null,
  created_at: `2026-10-01T00:00:0${n % 10}Z`,
  updated_at: '',
  deleted_at: deleted ? '2026-10-02T00:00:00Z' : null,
})

describe('stats', () => {
  const data = [
    e('2026-10-14', 5478, 'out', 'med'),
    e('2026-10-15', 13800, 'out', 'home'),
    e('2026-10-15', 5000, 'out', 'home'),
    e('2026-10-28', 11100, 'out', 'car'),
    e('2026-10-05', 40000, 'in', 'pay'),
    e('2026-10-06', 999, 'out', 'med', true),
    e('2026-09-30', 100, 'out', 'med'),
  ]
  it('只算這個月、沒刪掉的', () => {
    const m = inMonth(data, '2026-10')
    expect(m).toHaveLength(5)
    expect(totals(m)).toEqual({ in: 40000, out: 35378, net: 4622 })
  })
  it('分類加總大到小', () => {
    const s = byCategory(inMonth(data, '2026-10'), [cat('med'), cat('home'), cat('car')], 'out')
    expect(s.map((x) => [x.category.id, x.amount])).toEqual([
      ['home', 18800],
      ['car', 11100],
      ['med', 5478],
    ])
  })
  it('百分比加起來 100', () => {
    const p = percents([1 / 3, 1 / 3, 1 / 3])
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    expect(p).toEqual([33.4, 33.3, 33.3])
  })
  it('累計支出，今天之後不畫', () => {
    const c = cumulative(data, '2026-10', 'out', 20)
    expect(c[12]).toBe(0)
    expect(c[13]).toBe(5478)
    expect(c[14]).toBe(24278)
    expect(c[19]).toBe(24278)
    expect(c[20]).toBeNull()
    expect(c).toHaveLength(31)
  })
  it('每天收支', () => {
    expect(dailyNet(data, '2026-10').get('2026-10-15')).toEqual({ in: 0, out: 18800 })
  })
  it('月曆週一開頭', () => {
    const w = calendar('2026-10')
    expect(w[0][0]).toEqual({ day: '2026-09-28', inMonth: false })
    expect(w[0][3]).toEqual({ day: '2026-10-01', inMonth: true })
    expect(w[w.length - 1][6]).toEqual({ day: '2026-11-01', inMonth: false })
    expect(w).toHaveLength(5)
    expect(calendar('2026-02')[0][0].day).toBe('2026-01-26')
  })
  it('月曆上的短數字', () => {
    expect(short(999)).toBe('999')
    expect(short(25195)).toBe('2.5萬')
    expect(short(146453)).toBe('15萬')
  })
})

describe('結算', () => {
  const base = { title: '', note: '', rule_id: null, created_by: null, created_at: '2026-10-01T00:00:00Z', updated_at: '', category_id: 'c', kind: 'out' as const }
  const es: Entry[] = [
    { ...base, id: '1', amount: 11100, day: '2026-10-28', deleted_at: null },
    { ...base, id: '2', amount: 754, day: '2026-10-05', deleted_at: null },
    { ...base, id: '3', amount: 180, day: '2026-10-03', deleted_at: null },
    { ...base, id: '4', amount: 99, day: '2026-10-02', deleted_at: null, settlement_id: 's1' },
    { ...base, id: '5', amount: 50, day: '2026-10-01', deleted_at: '2026-10-02T00:00:00Z' },
  ]
  it('累計到今天為止、還沒結算、沒刪掉的', () => {
    expect(unsettled(es, '2026-10-14').map((e) => e.id)).toEqual(['2', '3'])
  })
})
