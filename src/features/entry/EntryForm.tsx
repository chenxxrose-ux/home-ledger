import { useMemo, useState } from 'react'
import { useData, useStore } from '../data/store'
import { AppError } from '../data/errors'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'
import { CatIcon, UiIcon } from '../../ui/icons'
import { formatTyping, parseAmount } from '../../lib/money'
import { formatDay, taipeiToday } from '../../lib/dates'
import type { Entry, Kind } from '../../lib/types'

/** 記一筆／修改一筆。entry 有值 = 修改 */
export function EntryForm({ kind: initialKind, entry, day, onClose }: { kind?: Kind; entry?: Entry; day?: string; onClose: () => void }) {
  const data = useData()
  const { actions } = useStore()
  const toast = useToast()
  const { busy, error, setError, submit } = useSubmit()
  const today = taipeiToday()

  const [kind, setKind] = useState<Kind>(entry?.kind ?? initialKind ?? 'out')
  const [amount, setAmount] = useState(entry ? entry.amount.toLocaleString('en-US') : '')
  const [title, setTitle] = useState(entry?.title ?? '')
  const [catId, setCatId] = useState<string | null>(entry?.category_id ?? null)
  const [date, setDate] = useState(entry?.day ?? day ?? today)
  const [note, setNote] = useState(entry?.note ?? '')
  const [repeat, setRepeat] = useState(false)
  const rule = entry?.rule_id ? data.rules.find((r) => r.id === entry.rule_id) : undefined
  const [alsoRule, setAlsoRule] = useState(true)

  const cats = useMemo(
    () => data.categories.filter((c) => c.kind === kind && (!c.hidden || c.id === catId)),
    [data.categories, kind, catId],
  )

  function switchKind(k: Kind) {
    if (k === kind) return
    setKind(k)
    setCatId(null)
  }

  async function save() {
    const ok = await submit(async () => {
      const n = parseAmount(amount)
      if (n == null || n === undefined || n <= 0) throw new AppError('請輸入金額', 'validation')
      if (n > 100000000) throw new AppError('金額太大了，請確認一下', 'validation')
      if (!catId) throw new AppError('請選一個分類', 'validation')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('請選日期', 'validation')
      const input = { kind, amount: n, title: title.trim(), category_id: catId, day: date, note: note.trim() }
      if (entry) {
        await actions.updateEntry(entry, input, Boolean(rule && rule.stopped_at == null && alsoRule))
        toast({ text: '已修改' })
      } else {
        await actions.addEntry(input, repeat)
        toast({ text: repeat ? `已記下來，之後每月 ${Number(date.slice(8))} 號自動記一筆` : '已記下來' })
      }
    })
    if (ok) onClose()
  }

  async function remove() {
    if (!entry) return
    const ok = await submit(async () => {
      await actions.deleteEntry(entry.id)
      toast({ text: '已刪除', action: { label: '復原', run: () => actions.restoreEntry(entry.id) } })
    })
    if (ok) onClose()
  }

  async function stopRule() {
    if (!rule) return
    const ok = await submit(async () => {
      await actions.stopRule(rule.id)
      toast({ text: '已停止每月重複，之後不會再自動記', action: { label: '復原', run: () => actions.resumeRule(rule.id) } })
    })
    if (ok) onClose()
  }

  const accent = kind === 'out' ? 'out' : 'in'

  return (
    <Sheet title={entry ? '修改這一筆' : '記一筆'} onClose={onClose} full>
      <form
        className={`entry-form ${accent}`}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="seg big" role="group" aria-label="支出或收入">
          <button type="button" aria-pressed={kind === 'out'} className="seg-out" onClick={() => switchKind('out')}>
            支出
          </button>
          <button type="button" aria-pressed={kind === 'in'} className="seg-in" onClick={() => switchKind('in')}>
            收入
          </button>
        </div>

        <label className="amount-field">
          <span className="sr">金額</span>
          <span className="cur">$</span>
          <input
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(formatTyping(e.target.value))
              setError(null)
            }}
            autoFocus={!entry}
          />
        </label>

        <label className="field-row">
          <span className="sr">名稱</span>
          <input
            className="input"
            maxLength={30}
            placeholder={kind === 'out' ? '名稱（例如：午餐、房貸），可不填' : '名稱（例如：10 月薪水），可不填'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <fieldset className="cats">
          <legend className="sec">分類</legend>
          <div className="cat-grid">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cat-btn"
                aria-pressed={catId === c.id}
                onClick={() => {
                  setCatId(c.id)
                  setError(null)
                }}
              >
                <CatIcon icon={c.icon} color={c.color} size={40} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="card list">
          <label className="row">
            <span className="row-label">日期</span>
            <span className="row-value">
              <input className="date-in" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              <span className="date-text" aria-hidden="true">
                {formatDay(date, today)}
                {date === today ? ' 今天' : ''}
              </span>
            </span>
          </label>
          {!entry && (
            <label className="row">
              <span className="row-label grow">
                每月重複
                <small>{repeat ? `每月 ${Number(date.slice(8))} 號自動記一筆（房貸、車貸、保險…）` : '房貸、車貸、保險這種每個月都有的'}</small>
              </span>
              <input type="checkbox" className="switch" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            </label>
          )}
          {rule && (
            <div className="row">
              <span className="row-label grow">
                <span className="inline-ic">
                  <UiIcon name="repeat" size={16} /> {rule.stopped_at ? '每月重複已停止' : `每月 ${rule.dom} 號自動記`}
                </span>
                {!rule.stopped_at && (
                  <label className="check">
                    <input type="checkbox" checked={alsoRule} onChange={(e) => setAlsoRule(e.target.checked)} />
                    以後每個月也改成這樣
                  </label>
                )}
              </span>
            </div>
          )}
          <label className="row">
            <span className="row-label">備註</span>
            <input className="row-input" maxLength={200} placeholder="可不填" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        <ErrorNote error={error} />

        <div className="form-actions">
          <button type="submit" className={`btn block ${accent}`} disabled={busy}>
            {busy ? '儲存中…' : entry ? '儲存' : '記下來'}
          </button>
          {entry && (
            <div className="row-btns">
              <button type="button" className="btn secondary" onClick={() => void remove()} disabled={busy}>
                刪除這一筆
              </button>
              {rule && !rule.stopped_at && (
                <button type="button" className="btn secondary" onClick={() => void stopRule()} disabled={busy}>
                  停止每月重複
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </Sheet>
  )
}
