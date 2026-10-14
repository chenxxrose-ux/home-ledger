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
}
