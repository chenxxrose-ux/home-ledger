import { useState } from 'react'
import { useData, useStore } from '../data/store'
import { supabase } from '../data/supabase'
import { AppError } from '../data/errors'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'
import { CatIcon, COLOR_KEYS, COLOR_LABEL, COLORS, Icon, ICON_KEYS, ICON_LABEL, UiIcon } from '../../ui/icons'
import { fmt } from '../../lib/money'
import { deviceHasPasskey, passkeySupported, registerFaceId } from '../auth/passkey'
import type { Category, Kind } from '../../lib/types'
import { LineSection } from '../line/LineSection'

export function SettingsPage() {
  const data = useData()
  const { actions } = useStore()
  const toast = useToast()
  const rules = data.rules.filter((r) => !r.stopped_at)
  const stopped = data.rules.filter((r) => r.stopped_at)
  const [kind, setKind] = useState<Kind>('out')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [showStopped, setShowStopped] = useState(false)
  const rowSubmit = useSubmit()
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  const cats = data.categories.filter((c) => c.kind === kind)

  return (
    <div className="page settings">
      <section aria-label="每月固定">
        <h2 className="sec">每月固定</h2>
        <div className="card list">
          {rules.length === 0 ? (
            <p className="note pad">還沒有。記一筆的時候打開「每月重複」，房貸、車貸、保險就會每個月自動記。</p>
          ) : (
            rules.map((r) => {
              const c = cat(r.category_id)
              return (
                <div className="rule-row" key={r.id}>
                  <CatIcon icon={c?.icon ?? 'dots'} color={c?.color ?? 'gray'} size={32} />
                  <span className="rr-text">
                    <span className="rr-name">{r.title || c?.name}</span>
                    <span className="rr-sub">每月 {r.dom} 號・{c?.name}</span>
                  </span>
                  <span className={`rr-amt num ${r.kind}`}>{fmt(r.amount)}</span>
                  <button
                    type="button"
                    className="btn small secondary"
                    disabled={rowSubmit.busy}
                    onClick={() =>
                      void rowSubmit.submit(async () => {
                        await actions.stopRule(r.id)
                        toast({ text: `「${r.title || c?.name}」不再每月自動記`, action: { label: '復原', run: () => actions.resumeRule(r.id) } })
                      })
                    }
                  >
                    停止
                  </button>
                </div>
              )
            })
          )}
        </div>
        <ErrorNote error={rowSubmit.error} />
        {stopped.length > 0 && (
          <button type="button" className="link-btn sec-link" onClick={() => setShowStopped((v) => !v)}>
            {showStopped ? '收起已停止的' : `已停止的（${stopped.length}）`}
          </button>
        )}
        {showStopped && (
          <div className="card list">
            {stopped.map((r) => {
              const c = cat(r.category_id)
              return (
                <div className="rule-row muted" key={r.id}>
                  <CatIcon icon={c?.icon ?? 'dots'} color={c?.color ?? 'gray'} size={32} />
                  <span className="rr-text">
                    <span className="rr-name">{r.title || c?.name}</span>
                    <span className="rr-sub">每月 {r.dom} 號・已停止</span>
                  </span>
                  <span className="rr-amt num">{fmt(r.amount)}</span>
                  <button
                    type="button"
                    className="btn small secondary"
                    disabled={rowSubmit.busy}
                    onClick={() => void rowSubmit.submit(() => actions.resumeRule(r.id))}
                  >
                    恢復
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section aria-label="分類">
        <h2 className="sec">分類</h2>
        <div className="seg" role="group" aria-label="支出或收入的分類">
          <button type="button" aria-pressed={kind === 'out'} className="seg-out" onClick={() => setKind('out')}>
            支出
          </button>
          <button type="button" aria-pressed={kind === 'in'} className="seg-in" onClick={() => setKind('in')}>
            收入
          </button>
        </div>
        <div className="card list" style={{ marginTop: 10 }}>
          {cats.map((c) => (
            <button type="button" className={`cat-edit-row${c.hidden ? ' muted' : ''}`} key={c.id} onClick={() => setEditing(c)}>
              <CatIcon icon={c.icon} color={c.color} size={32} />
              <span className="grow">{c.name}</span>
              {c.hidden && <span className="tag">不用了</span>}
              <UiIcon name="chevR" size={18} />
            </button>
          ))}
          <button type="button" className="cat-edit-row add" onClick={() => setEditing('new')}>
            <span className="add-ic">
              <UiIcon name="plus" size={18} />
            </span>
            <span className="grow">新增分類</span>
          </button>
        </div>
      </section>

      <LineSection />

      <Account me={data.me.name} />

      {editing && <CategorySheet kind={kind} category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Account({ me }: { me: string }) {
  const toast = useToast()
  const { busy, error, submit } = useSubmit()
  const [has, setHas] = useState(deviceHasPasskey)
  return (
    <section aria-label="帳號">
      <h2 className="sec">帳號</h2>
      <div className="card pad stack">
        <p className="row-label grow">目前登入：{me}</p>
        {passkeySupported() &&
          (has ? (
            <p className="note">這支手機已設定 Face ID 登入。</p>
          ) : (
            <button
              type="button"
              className="btn secondary block"
              disabled={busy}
              onClick={() =>
                void submit(async () => {
                  if (await registerFaceId()) {
                    setHas(true)
                    toast({ text: '已設定 Face ID 登入' })
                  }
                })
              }
            >
              {busy ? '設定中…' : '設定 Face ID 登入'}
            </button>
          ))}
        <ErrorNote error={error} />
        <button type="button" className="btn danger-ghost block" onClick={() => void supabase.auth.signOut()}>
          登出
        </button>
      </div>
    </section>
  )
}

function CategorySheet({ kind, category, onClose }: { kind: Kind; category: Category | null; onClose: () => void }) {
  const data = useData()
  const { actions } = useStore()
  const toast = useToast()
  const { busy, error, submit } = useSubmit()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'dots')
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
        await actions.addCategory({ kind: k, name: n, icon, color, sort })
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
