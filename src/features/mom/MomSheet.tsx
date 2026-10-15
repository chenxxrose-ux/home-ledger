import { useMemo, useState } from 'react'
import { useData, useStore } from '../data/store'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'
import { momOwed, runningTotal } from '../../lib/stats'
import { fmt } from '../../lib/money'
import { formatDay, taipeiDateOf, taipeiToday } from '../../lib/dates'
import type { Entry } from '../../lib/types'

/** 媽媽代繳：每一筆的日期、累計欠媽媽多少；還給媽媽了就按一下，可以復原 */
export function MomSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (e: Entry) => void }) {
  const data = useData()
  const { actions, online } = useStore()
  const toast = useToast()
  const today = taipeiToday()
  const { busy, error, submit } = useSubmit()
  const [confirm, setConfirm] = useState(false)
  const owed = useMemo(() => runningTotal(momOwed(data.entries)), [data.entries])
  const total = owed.length ? owed[owed.length - 1].total : 0
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  const name = (e: Entry) => e.title || cat(e.category_id)?.name || '未分類'

  async function repay() {
    const ok = await submit(async () => {
      const r = await actions.momRepay()
      toast({ text: `已還給媽媽 ${fmt(r.amount)} 元（${r.n} 筆）`, action: { label: '復原', run: () => actions.momUnrepay(r.id) } })
    })
    if (ok) setConfirm(false)
  }

  return (
    <Sheet title="媽媽代繳" onClose={onClose}>
      <div className="stack mom">
        <section className="card mom-hero" aria-label="欠媽媽">
          <span className="sh-label">{owed.length ? '欠媽媽・還沒還' : '都還給媽媽了'}</span>
          <span className="sh-amt num">{fmt(total)}</span>
          <span className="note">{owed.length ? `${owed.length} 筆・從 ${formatDay(owed[0].day, today)} 開始累計` : '之後媽媽幫忙繳的，記的時候打開「媽媽代繳」就會累計在這裡。'}</span>
          {owed.length > 0 && (
            <button type="button" className="btn primary block" disabled={!online || busy} onClick={() => setConfirm(true)}>
              還給媽媽了
            </button>
          )}
        </section>

        {owed.length > 0 && (
          <section aria-label="媽媽代繳的帳">
            <div className="mom-head">
              <h2 className="sec">媽媽代繳的帳</h2>
              <span className="note">累計</span>
            </div>
            <div className="card list">
              {owed.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className="mom-row"
                  onClick={() => {
                    onClose()
                    onOpen(e)
                  }}
                >
                  <span className="mr-day num">{formatDay(e.day, today)}</span>
                  <span className="mr-name">{name(e)}</span>
                  <span className="mr-amt num">{fmt(e.amount)}</span>
                  <span className="mr-total num">{fmt(e.total)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {data.momRepays.length > 0 && (
          <section aria-label="還給媽媽的紀錄">
            <h2 className="sec">還給媽媽的紀錄</h2>
            <div className="card list">
              {data.momRepays.map((r) => (
                <div key={r.id} className="mom-row static">
                  <span className="mr-day num">{formatDay(taipeiDateOf(r.created_at), today)}</span>
                  <span className="mr-name">還了 {r.n} 筆</span>
                  <span className="mr-amt num">{fmt(r.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {confirm && (
        <Sheet title="還給媽媽" dialog onClose={() => setConfirm(false)}>
          <div className="stack">
            <p className="confirm-text">
              把這 <b>{owed.length}</b> 筆、共 <b className="num">{fmt(total)}</b> 元標成已經還給媽媽？
            </p>
            <p className="note">累計會從 0 重新開始，這次還的會留在「還給媽媽的紀錄」。</p>
            <ErrorNote error={error} />
            <button type="button" className="btn primary block" disabled={busy} onClick={() => void repay()}>
              {busy ? '儲存中…' : '還給媽媽了'}
            </button>
            <button type="button" className="btn secondary block" onClick={() => setConfirm(false)}>
              取消
            </button>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}
