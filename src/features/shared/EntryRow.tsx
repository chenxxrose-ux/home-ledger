import type { Category, Entry } from '../../lib/types'
import { CatIcon, UiIcon } from '../../ui/icons'
import { fmt } from '../../lib/money'

/** 一筆帳：圖示、名稱（沒填就用分類）、分類／備註、金額。待繳的右邊有一個圈，勾了就是繳了（onPaid） */
export function EntryRow({
  entry,
  category,
  sub,
  tag,
  onOpen,
  onPaid,
}: {
  entry: Entry
  category?: Category
  sub?: string
  tag?: string
  onOpen: () => void
  onPaid?: () => void
}) {
  const name = entry.title || category?.name || '未分類'
  const detail = [sub, entry.title && entry.title !== category?.name ? category?.name : '', entry.note].filter(Boolean).join('・')
  const row = (
    <button type="button" className={`entry-row${entry.todo ? ' todo' : ''}`} onClick={onOpen}>
      <CatIcon icon={category?.icon ?? 'dots'} color={category?.color ?? 'gray'} />
      <span className="er-text">
        <span className="er-name">
          <span className="er-title">{name}</span>
          {entry.rule_id && (
            <span className="er-repeat" role="img" aria-label="每月重複">
              <UiIcon name="repeat" size={14} width={2.4} />
            </span>
          )}
        </span>
        {detail && <span className="er-sub">{detail}</span>}
      </span>
      <span className="er-end">
        <span className={`er-amt num ${entry.kind}`}>
          {entry.kind === 'in' ? '+' : ''}
          {fmt(entry.amount)}
        </span>
        {entry.todo ? <span className="tag todo">{entry.kind === 'in' ? '未收到' : '待繳'}</span> : tag && <span className="tag">{tag}</span>}
      </span>
    </button>
  )
  if (!entry.todo || !onPaid) return row
  return (
    <div className="entry-wrap">
      {row}
      <button type="button" className="paid-btn" aria-label={`勾選${entry.kind === 'in' ? '已收到' : '已繳'}：${name} ${fmt(entry.amount)} 元`} onClick={onPaid}>
        <span className="paid-ring" />
      </button>
    </div>
  )
}
