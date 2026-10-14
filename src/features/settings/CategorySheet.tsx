import { useState } from 'react'
import { useData, useStore } from '../data/store'
import { AppError } from '../data/errors'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'
import { CatIcon, COLOR_KEYS, COLOR_LABEL, COLORS, Icon, ICON_KEYS, ICON_LABEL } from '../../ui/icons'
import type { Category, Kind } from '../../lib/types'

/** 新增／修改分類。記一筆的「＋新增」也用這個，存好就直接選起來（onSaved） */
export function CategorySheet({
  kind,
  category,
  onClose,
  onSaved,
}: {
  kind: Kind
  category: Category | null
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const data = useData()
  const { actions } = useStore()
  const toast = useToast()
  const { busy, error, submit } = useSubmit()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'star')
  const [color, setColor] = useState(category?.color ?? 'blue')
  const k = category?.kind ?? kind

  async function save() {
    const ok = await submit(async () => {
      const n = name.trim()
      if (!n) throw new AppError('請輸入分類名稱', 'validation')
      if (n.length > 8) throw new AppError('分類名稱最多 8 個字', 'validation')
      if (data.categories.some((c) => c.kind === k && c.name === n && c.id !== category?.id))
        throw new AppError('已經有這個分類了', 'validation')
      if (category) await actions.updateCategory(category.id, { name: n, icon, color })
      else {
        const sort = Math.max(0, ...data.categories.filter((c) => c.kind === k).map((c) => c.sort)) + 1
        const id = await actions.addCategory({ kind: k, name: n, icon, color, sort })
        onSaved?.(id)
      }
      toast({ text: category ? '已修改分類' : '已新增分類' })
    })
    if (ok) onClose()
  }

  async function toggleHidden() {
    if (!category) return
    const ok = await submit(async () => {
      await actions.updateCategory(category.id, { hidden: !category.hidden })
      toast({ text: category.hidden ? `「${category.name}」又可以選了` : `「${category.name}」不會再出現在記一筆，以前記的不受影響` })
    })
    if (ok) onClose()
  }

  return (
    <Sheet title={category ? '修改分類' : `新增${k === 'out' ? '支出' : '收入'}分類`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="cat-preview">
          <CatIcon icon={icon} color={color} size={48} />
          <input className="input grow" maxLength={8} placeholder="分類名稱" value={name} onChange={(e) => setName(e.target.value)} aria-label="分類名稱" />
        </div>
        <fieldset>
          <legend className="sec">圖示</legend>
          <div className="pick-grid">
            {ICON_KEYS.map((key) => (
              <button key={key} type="button" className="pick" aria-pressed={icon === key} aria-label={ICON_LABEL[key] ?? key} onClick={() => setIcon(key)}>
                <Icon name={key} size={22} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="sec">顏色</legend>
          <div className="pick-grid">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="pick swatch"
                aria-pressed={color === key}
                aria-label={COLOR_LABEL[key] ?? key}
                style={{ background: COLORS[key].chart }}
                onClick={() => setColor(key)}
              />
            ))}
          </div>
        </fieldset>
        <ErrorNote error={error} />
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? '儲存中…' : '儲存'}
        </button>
        {category && (
          <button type="button" className="btn secondary block" disabled={busy} onClick={() => void toggleHidden()}>
            {category.hidden ? '恢復這個分類' : '不用這個分類了'}
          </button>
        )}
      </form>
    </Sheet>
  )
}
