import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { daysInMonth, formatDay, monthOf, shiftMonth, taipeiToday, ymd, parseYmd } from '../src/lib/dates'

// 驗收流程：阿寶、草莓兩支手機同時用同一本帳（iPhone 尺寸）
const MOCK = 'http://localhost:54321'
const today = taipeiToday()
const month = monthOf(today)
const { y, m } = parseYmd(today)
const prev = shiftMonth(month, -1)
const shots = process.env.SHOTS_DIR

test.describe.configure({ mode: 'serial' })

let bao: Page
let berry: Page
let baoCtx: BrowserContext
let berryCtx: BrowserContext

async function login(browser: Browser, email: string) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('密碼').fill('test-password')
  await page.getByRole('button', { name: '登入', exact: true }).click()
  await expect(page.getByRole('heading', { name: '偶們家', level: 1 })).toBeVisible()
  return { ctx, page }
}

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const r = await fetch(`${MOCK}/__test/sql`, { method: 'POST', body: JSON.stringify({ sql: query, params }) })
  return r.json()
}

async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false })
}

async function add(page: Page, o: { kind?: '支出' | '收入'; amount: string; title?: string; cat: string; day?: string; repeat?: boolean }) {
  await page.getByRole('button', { name: o.kind === '收入' ? '＋ 收入' : '− 支出' }).click()
  const sheet = page.getByRole('dialog', { name: '記一筆' })
  await sheet.getByLabel('金額').fill(o.amount)
  if (o.title) await sheet.getByLabel('名稱').fill(o.title)
  await sheet.getByRole('button', { name: o.cat, exact: true }).click()
  if (o.day) await sheet.getByLabel('日期').fill(o.day)
  if (o.repeat) await sheet.getByLabel(/每月重複/).check()
  await sheet.getByRole('button', { name: '記下來' }).click()
  await expect(sheet).toBeHidden()
}

test.beforeAll(async ({ browser }) => {
  ;({ ctx: baoCtx, page: bao } = await login(browser, 'bao@test.local'))
  ;({ ctx: berryCtx, page: berry } = await login(browser, 'berry@test.local'))
})

test.afterAll(async () => {
  await baoCtx?.close()
  await berryCtx?.close()
})

test('沒資料時說明這頁要做什麼', async () => {
  await expect(bao.getByText('這裡是你們兩個人的生活帳')).toBeVisible()
  await expect(bao.getByRole('button', { name: '− 支出' })).toBeVisible()
  await shot(bao, '01-主畫面-沒資料')
})

test('沒填金額、沒選分類會提醒，輸入不會不見', async () => {
  await bao.getByRole('button', { name: '− 支出' }).click()
  const sheet = bao.getByRole('dialog', { name: '記一筆' })
  await sheet.getByLabel('名稱').fill('午餐')
  await sheet.getByRole('button', { name: '記下來' }).click()
  await expect(sheet.getByRole('alert')).toHaveText('請輸入金額')
  await sheet.getByLabel('金額').fill('1200')
  await expect(sheet.getByLabel('金額')).toHaveValue('1,200')
  await sheet.getByRole('button', { name: '記下來' }).click()
  await expect(sheet.getByRole('alert')).toHaveText('請選一個分類')
  await expect(sheet.getByLabel('名稱')).toHaveValue('午餐')
  await shot(bao, '02-記一筆-錯誤')
  await sheet.getByRole('button', { name: '取消' }).click()
  await expect(sheet).toBeHidden()
})

test('記支出、收入、每月重複；另一支手機自動出現', async () => {
  const d14 = ymd(y, m, Math.min(14, daysInMonth(month)))
  await add(bao, { amount: '5478', title: '保險', cat: '醫療保健', day: d14, repeat: true })
  await add(bao, { amount: '180', title: '午餐', cat: '餐飲' })
  await add(bao, { kind: '收入', amount: '42000', title: '薪水', cat: '薪水' })
  // 上個月也有一些，趨勢圖才有得比
  await sql(
    `insert into hl_entries (kind, amount, title, category_id, day) select 'out', 30000, '房貸', id, $1 from hl_categories where name = '住房'`,
    [`${prev}-05`],
  )
  await sql(
    `insert into hl_entries (kind, amount, title, category_id, day) select 'out', 9000, '卡費', id, $1 from hl_categories where name = '卡費'`,
    [`${prev}-20`],
  )
  await bao.reload()
  const summary = bao.getByRole('region', { name: '這個月的收支' })
  await expect(summary).toContainText('42,000')
  await expect(summary).toContainText('5,658')
  await expect(summary).toContainText('36,342')
  await expect(berry.getByRole('region', { name: '這個月的收支' })).toContainText('5,658', { timeout: 10000 })
  await expect(bao.getByRole('region', { name: '最近記的' }).getByRole('button', { name: /保險/ })).toBeVisible()
  await shot(bao, '03-主畫面')
})

test('每月重複：下個月一打開就自動記，而且不會重複', async () => {
  const rules = await sql<{ id: string; dom: number }>(`select id, dom from hl_rules`)
  expect(rules).toHaveLength(1)
  // 假裝規則是上上個月開始的 → 補上上個月和上上個月
  const start = `${shiftMonth(month, -2)}-${String(rules[0].dom).padStart(2, '0')}`
  await sql(`update hl_rules set start_day = $1`, [start])
  await bao.reload()
  await berry.reload()
  await expect(bao.getByRole('region', { name: '這個月的收支' })).toContainText('5,658')
  const n = await sql<{ n: number }>(`select count(*)::int as n from hl_entries where rule_id is not null and deleted_at is null`)
  expect(n[0].n).toBe(3)
})

test('列表：月曆每天的金額，點一天看那天的', async () => {
  await bao.getByRole('button', { name: '列表' }).click()
  await expect(bao.getByRole('heading', { name: '列表', level: 1 })).toBeVisible()
  const d14 = ymd(y, m, Math.min(14, daysInMonth(month)))
  await expect(bao.getByRole('button', { name: new RegExp(`^${formatDay(d14, today).replace(/[()（）]/g, '.')}，支出`) })).toContainText(d14 === today ? '−5,658' : '−5,478')
  await shot(bao, '04-列表')
  await bao.getByRole('button', { name: new RegExp(`^${formatDay(d14, today).replace(/[()（）]/g, '.')}`) }).click()
  await expect(bao.getByRole('button', { name: '＋ 記在這天' })).toBeVisible()
  await expect(bao.locator('.entry-row')).toHaveCount(d14 === today ? 3 : 1)
})

test('修改一筆、以後每月也一樣；刪除可以復原', async () => {
  await bao.locator('.entry-row', { hasText: '保險' }).click()
  const sheet = bao.getByRole('dialog', { name: '修改這一筆' })
  await expect(sheet.getByLabel('金額')).toHaveValue('5,478')
  await sheet.getByLabel('金額').fill('5500')
  await sheet.getByRole('button', { name: '儲存' }).click()
  await expect(sheet).toBeHidden()
  const r = await sql<{ amount: number }>(`select amount from hl_rules`)
  expect(r[0].amount).toBe(5500)

  await bao.locator('.cal-cell.on').click() // 取消選取的日子
  await bao.locator('.entry-row', { hasText: '午餐' }).click()
  await bao.getByRole('dialog', { name: '修改這一筆' }).getByRole('button', { name: '刪除這一筆' }).click()
  await expect(bao.getByRole('status').filter({ hasText: '已刪除' })).toBeVisible()
  await expect(bao.locator('.entry-row', { hasText: '午餐' })).toHaveCount(0)
  await bao.getByRole('button', { name: '復原' }).click()
  await expect(bao.locator('.entry-row', { hasText: '午餐' })).toHaveCount(1)
})

test('圖表：錢花在哪', async () => {
  await bao.getByRole('button', { name: '圖表' }).click()
  await expect(bao.getByRole('img', { name: /支出 5,680 元/ })).toBeVisible()
  await expect(bao.locator('.cat-row').first()).toContainText('醫療保健')
  await shot(bao, '05-圖表')
  await bao.getByRole('button', { name: '收入', exact: true }).click()
  await expect(bao.locator('.cat-row')).toContainText('薪水')
})

test('設定：每月固定、分類', async () => {
  await bao.getByRole('button', { name: '設定' }).click()
  await expect(bao.locator('.rule-row')).toContainText('保險')
  await expect(bao.locator('.rule-row')).toContainText('5,500')
  await shot(bao, '06-設定')
  await bao.getByRole('button', { name: '新增分類' }).click()
  const sheet = bao.getByRole('dialog', { name: '新增支出分類' })
  await sheet.getByLabel('分類名稱').fill('寵物')
  await sheet.getByRole('button', { name: '寵物' }).click()
  await sheet.getByRole('button', { name: '儲存' }).click()
  await expect(sheet).toBeHidden()
  await expect(bao.locator('.cat-edit-row', { hasText: '寵物' })).toBeVisible()
})

test('離線時看得到資料，但不能記帳', async () => {
  await bao.getByRole('button', { name: '主畫面' }).click()
  await baoCtx.setOffline(true)
  await expect(bao.getByText('目前離線')).toBeVisible()
  await bao.getByRole('button', { name: '− 支出' }).click()
  const sheet = bao.getByRole('dialog', { name: '記一筆' })
  await sheet.getByLabel('金額').fill('99')
  await sheet.getByRole('button', { name: '餐飲', exact: true }).click()
  await sheet.getByRole('button', { name: '記下來' }).click()
  await expect(sheet.getByRole('alert')).toContainText('目前離線')
  await expect(sheet.getByLabel('金額')).toHaveValue('99')
  await shot(bao, '07-離線')
  await baoCtx.setOffline(false)
  await sheet.getByRole('button', { name: '記下來' }).click()
  await expect(sheet).toBeHidden()
})

test('記一筆的畫面', async () => {
  await bao.getByRole('button', { name: '− 支出' }).click()
  const sheet = bao.getByRole('dialog', { name: '記一筆' })
  await sheet.getByLabel('金額').fill('13800')
  await sheet.getByLabel('名稱').fill('房屋')
  await sheet.getByRole('button', { name: '住房', exact: true }).click()
  await sheet.getByLabel(/每月重複/).check()
  await shot(bao, '08-記一筆')
  await sheet.getByRole('button', { name: '取消' }).click()
})
