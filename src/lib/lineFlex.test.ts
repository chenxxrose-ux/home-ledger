import { describe, expect, it } from 'vitest'
import { entryFlex, entryLink, settleFlex, settleLink } from '../../supabase/functions/hl-line/flex'

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

describe('記一筆的卡片', () => {
  const e = {
    id: card.id, kind: 'out' as const, by: '阿寶', amount: 3188, cat: '其他', title: '台哥大分期', day: '2026-10-14',
    note: '', monthly: true, monthOut: 12345, monthIn: 0,
  }
  it('大金額、明細、按鈕連到那一筆', () => {
    const m = entryFlex(e, SITE, SITE + 'line-out.png')
    const s = JSON.stringify(m)
    expect(m.altText).toBe('阿寶記了一筆支出 3,188 元：台哥大分期')
    expect(s).toContain('支出記帳')
    expect(s).toContain('NT$3,188')
    expect(s).toContain('10/14（三）')
    expect(s).toContain('其他・台哥大分期')
    expect(s).toContain('每月固定')
    expect(s).toContain('10 月到現在：支出 12,345・收入 0')
    expect(s).toContain(entryLink(SITE, e.id))
    expect(s).not.toContain('備註')
  })
  it('收入用藍色、沒有名稱就只寫分類', () => {
    const s = JSON.stringify(entryFlex({ ...e, kind: 'in', cat: '薪水', title: '', monthly: false, note: '十月' }, SITE, ''))
    expect(s).toContain('收入記帳')
    expect(s).toContain('"薪水"')
    expect(s).toContain('"備註"')
    expect(s).not.toContain('每月固定')
  })
})
