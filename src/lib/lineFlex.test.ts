import { describe, expect, it } from 'vitest'
import { settleFlex, settleLink } from '../../supabase/functions/hl-line/flex'

const SITE = 'https://chenxxrose-ux.github.io/home-ledger/'
const card = {
  id: '11111111-2222-4333-8444-555555555555', no: 5, by: '阿寶', settledOn: '2026-10-03', from: '2026-09-20', upto: '2026-10-03',
  n: 12, out: 12345, inc: 0, top: [{ name: '餐飲', amount: 3200 }, { name: '交通', amount: 800 }],
}

describe('結算卡片', () => {
  it('標題、期間、金額、明細連結', () => {
    const m = settleFlex(card, SITE, SITE + 'line-settle.png')
    const s = JSON.stringify(m)
    expect(m.altText).toBe('第 5 次結算：12 筆，支出 12,345 元')
    expect(s).toContain('第 5 次結算完成')
    expect(s).toContain('2026/10/03（六）')
    expect(s).toContain('9/20 ～ 10/3')
    expect(s).toContain('12,345 元')
    expect(s).toContain('餐飲 3,200・交通 800')
    expect(s).not.toContain('收入')
    expect(s).toContain(settleLink(SITE, card.id))
    expect(settleLink(SITE, card.id)).toBe(`${SITE}?openExternalBrowser=1#settle/${card.id}`)
  })
  it('有收入才顯示收入；同一天只寫一天', () => {
    const s = JSON.stringify(settleFlex({ ...card, inc: 500, from: '2026-10-03', top: [] }, SITE, ''))
    expect(s).toContain('500 元')
    expect(s).toContain('"帳的期間"')
    expect(s).not.toContain('～')
    expect(s).not.toContain('花最多')
  })
  it('LINE 規定：altText 400 字內、按鈕文字 40 字內', () => {
    const m = settleFlex(card, SITE, '')
    expect(m.altText.length).toBeLessThanOrEqual(400)
    for (const b of m.contents.footer.contents) expect(b.action.label.length).toBeLessThanOrEqual(40)
  })
})
