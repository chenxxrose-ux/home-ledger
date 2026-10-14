import { describe, expect, it } from 'vitest'
import { parseLine, type Cat } from '../../supabase/functions/hl-line/parse'

const cats: Cat[] = [
  ['餐飲', 'out'], ['日用品', 'out'], ['汽車', 'out'], ['醫療保健', 'out'], ['其他', 'out'], ['寵物', 'out'],
  ['薪水', 'in'], ['其他收入', 'in'],
].map(([name, kind]) => ({ id: name, name, kind: kind as 'out' | 'in', hidden: false }))

describe('LINE 打字記帳', () => {
  it('名稱在前或金額在前都可以', () => {
    expect(parseLine('晚餐 320', cats)).toEqual({ kind: 'out', amount: 320, title: '晚餐', category_id: '餐飲' })
    expect(parseLine('320 晚餐', cats)).toMatchObject({ amount: 320, category_id: '餐飲' })
    expect(parseLine('全聯1,280元', cats)).toMatchObject({ amount: 1280, title: '全聯', category_id: '日用品' })
    expect(parseLine('加油　８００', cats)).toMatchObject({ amount: 800, category_id: '汽車' })
  })
  it('收入', () => {
    expect(parseLine('薪水 42000', cats)).toEqual({ kind: 'in', amount: 42000, title: '', category_id: '薪水' })
    expect(parseLine('+500 賣二手', cats)).toMatchObject({ kind: 'in', category_id: '其他收入' })
  })
  it('自己加的分類也認得', () => {
    expect(parseLine('寵物 600', cats)).toMatchObject({ category_id: '寵物', title: '' })
  })
  it('聊天不會被當成帳', () => {
    expect(parseLine('等等 5', cats)).toBeNull()
    expect(parseLine('320', cats)).toBeNull()
    expect(parseLine('明天 3 點吃飯 2 個人', cats)).toBeNull()
    expect(parseLine('好喔', cats)).toBeNull()
  })
  it('開頭打「記」一定記', () => {
    expect(parseLine('記 雜支 50', cats)).toMatchObject({ amount: 50, title: '雜支', category_id: '其他' })
  })
  it('金額範圍', () => {
    expect(parseLine('晚餐 0', cats)).toBeNull()
    expect(parseLine('晚餐 1000000000', cats)).toBeNull()
  })
})
