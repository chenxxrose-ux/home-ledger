import { useEffect, useMemo, useState } from 'react'
import { useData, useStore } from '../data/store'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'
import { EntryRow } from '../shared/EntryRow'
import { UiIcon } from '../../ui/icons'
import { sortEntries, unsettled } from '../../lib/stats'
import { fmt } from '../../lib/money'
import { formatDay, taipeiDateOf, taipeiToday } from '../../lib/dates'
import type { Entry, Settlement } from '../../lib/types'

// 結算：記下來的帳一直累計，按「結算」就變成第 N 次結算，像你們現在用的 App
export function SettlePage({ onOpen }: { onOpen: (e: Entry) => void }) {
  const data = useData()
  const { actions, online } = useStore()
  const toast = useToast()
  const today = taipeiToday()
  const [confirm, setConfirm] = useState(false)
  const [viewing, setViewing] = useState<Settlement | null>(null)
  // 從 LINE 結算卡片點進來（#settle/<id>）→ 直接打開那一次
  useEffect(() => {
    const m = /^#settle\/([0-9a-f-]{36})$/.exec(location.hash)
    if (!m) return
    history.replaceState(null, '', '#settle')
    const s = data.settlements.find((x) => x.id === m[1])
    if (s) setViewing(s)
    else toast({ text: '這次結算已經復原了，帳都回到「還沒結算」' })
  }, [])
  const { busy, error, submit } = useSubmit()
  const list = useMemo(() => unsettled(data.entries, today), [data.entries, today])
  const out = list.filter((e) => e.kind === 'out').reduce((a, e) => a + e.amount, 0)
  const inc = list.filter((e) => e.kind === 'in').reduce((a, e) => a + e.amount, 0)
  const last = data.settlements[0]
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  const settledOn = (s: Settlement) => formatDay(taipeiDateOf(s.created_at), today)

  async function settle() {
    const ok = await submit(async () => {
      const r = await actions.settle(today)
      toast({ text: `第 ${r.no} 次結算完成：${r.n} 筆，支出 ${fmt(r.out_total)} 元`, action: { label: '復原', run: () => actions.unsettle(r.id) } })
    })
    if (ok) setConfirm(false)
  }

  return (
    <div className="page settle">
      <section className="card settle-hero" aria-label="還沒結算">
        <span className="sh-label">還沒結算・累計支出</span>
        <span className="sh-amt num">{fmt(out)}</span>
        <span className="note">
          {list.length} 筆{inc > 0 ? `・收入 ${fmt(inc)}` : ''}・{last ? `第 ${last.no} 次結算 ${settledOn(last)} 之後記的` : '還沒結算過'}
        </span>
        <button type="button" className="btn primary block" disabled={!list.length || !online || busy} onClick={() => setConfirm(true)}>
          {list.length ? `結算這 ${list.length} 筆` : '沒有要結算的'}
        </button>
      </section>

      {list.length > 0 ? (
        <section aria-label="還沒結算的帳">
          <h2 className="sec">還沒結算的帳</h2>
          <div className="card list">
            {list.map((e) => (
              <EntryRow key={e.id} entry={e} category={cat(e.category_id)} sub={formatDay(e.day, today)} onOpen={() => onOpen(e)} />
            ))}
          </div>
        </section>
      ) : (
        <section className="card empty">
          <p className="empty-title">都結算好了</p>
          <p className="note">之後每記一筆都會累計在這裡，想結算的時候按「結算」。</p>
        </section>
      )}

      <section aria-label="結算紀錄">
        <h2 className="sec">結算紀錄</h2>
        {data.settlements.length === 0 ? (
          <p className="note pad">還沒有。結算過的每一次都會留在這裡，可以點進去看明細。</p>
        ) : (
          <div className="card list">
            {data.settlements.map((s) => (
              <button type="button" className="settle-row" key={s.id} onClick={() => setViewing(s)}>
                <span className="er-text">
                  <span className="er-title">第 {s.no} 次結算</span>
                  <span className="er-sub">
                    {settledOn(s)}・{s.n} 筆
                  </span>
                </span>
                <span className="num settle-amt">{fmt(s.out_total)}</span>
                <UiIcon name="chevR" size={18} />
              </button>
            ))}
          </div>
        )}
      </section>

      {confirm && (
        <Sheet title="結算" dialog onClose={() => setConfirm(false)}>
          <div className="stack">
            <p className="confirm-text">
              把到今天為止的 <b>{list.length}</b> 筆結算掉？
              <br />
              支出 <b className="num">{fmt(out)}</b> 元{inc > 0 ? `，收入 ${fmt(inc)} 元` : ''}
            </p>
            <p className="note">結算後會變成「第 {(last?.no ?? 0) + 1} 次結算」，帳不會不見，在結算紀錄裡看得到。</p>
            <ErrorNote error={error} />
            <button type="button" className="btn primary block" disabled={busy} onClick={() => void settle()}>
              {busy ? '結算中…' : '結算'}
            </button>
            <button type="button" className="btn secondary block" onClick={() => setConfirm(false)}>
              取消
            </button>
          </div>
        </Sheet>
      )}
      {viewing && <SettlementSheet s={viewing} onClose={() => setViewing(null)} onOpen={onOpen} />}
    </div>
  )
}

function SettlementSheet({ s, onClose, onOpen }: { s: Settlement; onClose: () => void; onOpen: (e: Entry) => void }) {
  const data = useData()
  const today = taipeiToday()
  const list = sortEntries(data.entries.filter((e) => e.settlement_id === s.id && !e.deleted_at))
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  return (
    <Sheet title={`第 ${s.no} 次結算｜${formatDay(taipeiDateOf(s.created_at), today)}`} onClose={onClose}>
      <div className="stack">
        <div className="settle-total">
          <span>{s.n} 筆・支出</span>
          <b className="num">{fmt(s.out_total)}</b>
        </div>
        {s.in_total > 0 && <p className="note num">收入 {fmt(s.in_total)}</p>}
        <div className="card list sheet-list">
          {list.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              category={cat(e.category_id)}
              sub={formatDay(e.day, today)}
              tag="已結算"
              onOpen={() => {
                onClose()
                onOpen(e)
              }}
            />
          ))}
        </div>
      </div>
    </Sheet>
  )
}
