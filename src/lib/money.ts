// 金額一律新台幣「元」整數

/** 5478 → "5,478" */
export function fmt(n: number): string {
  return Math.abs(n).toLocaleString('en-US')
}

/** 帶正負號：−53,773 / +3,000 / 0 */
export function fmtSigned(n: number): string {
  if (n === 0) return '0'
  return `${n < 0 ? '−' : '+'}${fmt(n)}`
}

/** 解析使用者輸入的金額；空白回傳 null，不合法回傳 undefined */
export function parseAmount(input: string): number | null | undefined {
  const t = input.replace(/[,\s元$＄]/g, '')
  if (t === '') return null
  if (!/^\d+$/.test(t)) return undefined
  const n = Number(t)
  return Number.isSafeInteger(n) ? n : undefined
}

/** 打字時即時加千分位：12000 → 12,000 */
export function formatTyping(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
  return digits === '' ? '' : Number(digits).toLocaleString('en-US')
}
