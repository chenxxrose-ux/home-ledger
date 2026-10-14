// 在 LINE 群組打字記帳：「晚餐 320」「320 全聯」「+42000 薪水」「薪水 42000」
// 純函式（不碰資料庫），網站的單元測試和 LINE 機器人共用。

export type Cat = { id: string; kind: 'out' | 'in'; name: string; hidden: boolean }
export type Parsed = { kind: 'out' | 'in'; amount: number; title: string; category_id: string }

// 關鍵字 → 分類名稱（找不到的分類就跳過，最後用「其他」）
const OUT_WORDS: [string, string[]][] = [
  ['餐飲', ['早餐', '午餐', '晚餐', '宵夜', '點心', '下午茶', '飲料', '咖啡', '便當', '外送', '火鍋', '麵', '飯', '吃', '餐', '小吃', '滷味', '麥當勞', '手搖']],
  ['日用品', ['全聯', '家樂福', '好市多', 'costco', '屈臣氏', '寶雅', '日用', '衛生紙', '洗衣', '超市', '大創', '生活用品']],
  ['汽車', ['加油', '油錢', '停車', '保養', '洗車', 'etc', '車貸', '牌照稅', '燃料稅', '汽車', '機車']],
  ['交通', ['捷運', '公車', '高鐵', '台鐵', '火車', '計程車', 'uber', '客運', '交通', '悠遊卡', '一卡通']],
  ['住房', ['房租', '房貸', '租金']],
  ['水電網路', ['電費', '水費', '瓦斯', '網路', '電話費', '手機費', '第四台']],
  ['醫療保健', ['看醫生', '診所', '醫院', '掛號', '藥', '保險', '牙', '保健']],
  ['卡費', ['卡費', '信用卡']],
  ['管理費', ['管理費']],
  ['安親班', ['安親', '補習', '學費', '才藝']],
  ['娛樂', ['電影', 'ktv', '旅遊', '遊戲', '門票', '展覽', '玩']],
]
const IN_WORDS: [string, string[]][] = [
  ['薪水', ['薪水', '薪資', '月薪']],
  ['獎金', ['獎金', '年終', '紅包']],
  ['投資', ['股利', '股息', '利息', '投資', '配息']],
]

const toHalf = (s: string) =>
  s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[＋]/g, '+').replace(/[，]/g, ',').replace(/　/g, ' ')

export function parseLine(text: string, cats: Cat[]): Parsed | null {
  let s = toHalf(String(text)).trim()
  // 開頭打「記」= 一定要記（沒對到分類就放「其他」）；沒打「記」只有對到分類或關鍵字才記，避免把聊天當成帳
  const forced = /^記\s*/.test(s)
  if (forced) s = s.replace(/^記\s*/, '')
  if (!s || s.length > 40 || s.includes('\n')) return null
  // 金額在前：「+42000 薪水」「320 晚餐」；金額在後：「晚餐 320」「晚餐320元」
  let m = s.match(/^([+-]?)\s*(\d[\d,]*)\s*元?\s*(.*)$/)
  let sign = '', num = '', rest = ''
  if (m) [, sign, num, rest] = m
  else {
    m = s.match(/^(.*?)\s*([+-]?)\s*(\d[\d,]*)\s*元?$/)
    if (!m) return null
    ;[, rest, sign, num] = m
  }
  rest = rest.trim()
  if (!rest || /\d/.test(rest)) return null // 只有數字、或混了別的數字 → 多半是聊天，不記
  if (!/^\d{1,3}(,\d{3})*$|^\d+$/.test(num)) return null
  const amount = Number(num.replace(/,/g, ''))
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000000) return null
  const title = rest.slice(0, 30)
  const low = title.toLowerCase()
  const live = cats.filter((c) => !c.hidden)
  const byName = (kind: 'out' | 'in', name: string) => live.find((c) => c.kind === kind && c.name === name)

  // 1. 直接打分類名稱 2. 關鍵字 3. 其他
  const exact = live.filter((c) => low.includes(c.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]
  let kind: 'out' | 'in' = sign === '+' ? 'in' : 'out'
  let cat: Cat | undefined
  if (exact && (sign === '' || exact.kind === kind)) {
    cat = exact
    kind = exact.kind
  }
  if (!cat) {
    const lists = sign === '+' ? [IN_WORDS] : sign === '-' ? [OUT_WORDS] : [IN_WORDS, OUT_WORDS]
    outer: for (const list of lists) {
      for (const [name, words] of list) {
        if (words.some((w) => low.includes(w))) {
          const k = list === IN_WORDS ? 'in' : 'out'
          const c = byName(k, name)
          if (c) {
            cat = c
            kind = k
            break outer
          }
        }
      }
    }
  }
  if (!cat && !forced && !sign) return null // 打了 + 或 − 也算確定要記
  if (!cat) cat = kind === 'in' ? byName('in', '其他收入') ?? live.find((c) => c.kind === 'in') : byName('out', '其他') ?? live.find((c) => c.kind === 'out')
  if (!cat) return null
  return { kind, amount, title: title === cat.name ? '' : title, category_id: cat.id }
}

export const fmt = (n: number) => n.toLocaleString('en-US')
