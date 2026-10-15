export type Kind = 'out' | 'in'

export type Member = { user_id: string; name: string; sort: number }

export type Category = {
  id: string
  kind: Kind
  name: string
  icon: string
  color: string
  sort: number
  hidden: boolean
}

export type Rule = {
  id: string
  kind: Kind
  amount: number
  title: string
  category_id: string
  dom: number
  start_day: string
  stopped_at: string | null
}

export type Entry = {
  id: string
  kind: Kind
  amount: number
  title: string
  category_id: string
  day: string
  note: string
  rule_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  /** 在網站記的是 app，在 LINE 群組打字記的是 line */
  via?: 'app' | 'line'
  settlement_id?: string | null
  /** 待繳：先記起來、還沒繳 */
  todo?: boolean
  /** 媽媽代繳：媽媽先幫忙繳的，累計欠媽媽多少 */
  mom?: boolean
  /** 還給媽媽了（哪一次） */
  mom_repay_id?: string | null
}

/** 還給媽媽的紀錄 */
export type MomRepay = {
  id: string
  amount: number
  n: number
  created_by: string | null
  created_at: string
}

export type Settlement = {
  id: string
  no: number
  upto: string
  out_total: number
  in_total: number
  n: number
  created_by: string | null
  created_at: string
}
