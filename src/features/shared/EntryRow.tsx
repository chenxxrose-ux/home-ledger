import type { Category, Entry } from '../../lib/types'
import { CatIcon, UiIcon } from '../../ui/icons'
import { fmt } from '../../lib/money'

/** 一筆帳：圖示、名稱（沒填就用分類）、分類／備註、金額 */
export function EntryRow({ entry, category, sub, tag, onOpen }: { entry: Entry; category?: Category; sub?: string; tag?: string; onOpen: () => void }) {
  const name = entry.title || category?.name || '未分類'
  const detail = [sub, entry.title && entry.title !== category?.name ? category?.name : '', entry.note].filter(Boolean).join('・')
  return (
    <button type="button" className="entry-row" onClick={onOpen}>
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
        {tag && <span className="tag">{tag}</span>}
      </span>
    </button>
  )
}
