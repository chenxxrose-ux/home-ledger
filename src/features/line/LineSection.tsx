import { useCallback, useEffect, useState } from 'react'
import { lineCall, type LineStatus } from './api'
import { AppError, toAppError } from '../data/errors'
import { useStore } from '../data/store'
import { ErrorNote, Sheet, useSubmit, useToast } from '../../ui/kit'

// 設定 → LINE 群組：設定機器人 → 加進群組、配對 → 每記一筆就傳到群組
export function LineSection() {
  const { online } = useStore()
  const toast = useToast()
  const [status, setStatus] = useState<LineStatus | null>(null)
  const [loadError, setLoadError] = useState<AppError | null>(null)
  const [setup, setSetup] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const act = useSubmit()

  const load = useCallback(async () => {
    try {
      setStatus(await lineCall<LineStatus>({ op: 'status' }))
      setLoadError(null)
    } catch (e) {
      setLoadError(toAppError(e))
    }
  }, [])

  useEffect(() => {
    if (online) void load()
  }, [online, load])

  // 配對碼顯示中：每 4 秒看一下群組連上了沒
  useEffect(() => {
    if (!code || status?.group) return
    const t = setInterval(() => void load(), 4000)
    return () => clearInterval(t)
  }, [code, status?.group, load])

  useEffect(() => {
    if (code && status?.group) {
      setCode(null)
      toast({ text: `已連上「${status.group}」` })
    }
  }, [code, status?.group, toast])

  let body
  if (!online && !status) body = <p className="note">目前離線，連上網路後才能看 LINE 的設定。</p>
  else if (loadError && !status)
    body = (
      <>
        <ErrorNote error={loadError} />
        <button type="button" className="btn secondary block" onClick={() => void load()}>
          重試
        </button>
      </>
    )
  else if (!status) body = <p className="note">載入中…</p>
  else if (!status.ready)
    body = (
      <>
        <p className="row-label grow">還沒設定</p>
        <p className="note">接上你們兩個人的 LINE 群組：在這裡記一筆，群組就收到；在群組打「晚餐 320」也能記帳。</p>
        <button type="button" className="btn primary block" onClick={() => setSetup(true)}>
          設定 LINE 機器人
        </button>
      </>
    )
  else if (!status.group)
    body = (
      <>
        <p className="row-label grow">機器人「{status.botName || 'LINE 官方帳號'}」準備好了</p>
        <ol className="steps">
          <li>
            先加它好友，再把它邀請進你們的 LINE 群組。
            {status.basicId && (
              <a className="btn secondary block" href={`https://line.me/R/ti/p/${encodeURIComponent(status.basicId)}`} target="_blank" rel="noreferrer">
                加「{status.botName || status.basicId}」好友
              </a>
            )}
          </li>
          <li>
            按下面的按鈕拿 6 位數字，在群組裡傳這 6 個數字就連上了。
            {code ? (
              <span className="pair-code" aria-label={`配對碼 ${code.split('').join(' ')}`}>
                {code}
              </span>
            ) : (
              <button
                type="button"
                className="btn primary block"
                disabled={act.busy || !online}
                onClick={() =>
                  void act.submit(async () => {
                    setCode((await lineCall<{ code: string }>({ op: 'pair' })).code)
                  })
                }
              >
                {act.busy ? '產生中…' : '產生配對碼'}
              </button>
            )}
          </li>
        </ol>
        {code && <p className="note">數字 15 分鐘內有效。群組傳完，這裡會自動顯示「已連上」。</p>}
        <ErrorNote error={act.error} />
        <button type="button" className="link-btn sec-link" onClick={() => setSetup(true)}>
          換一個 LINE 官方帳號
        </button>
      </>
    )
  else
    body = (
      <>
        <p className="row-label grow">已連上「{status.group}」</p>
        <label className="row">
          <span className="row-label grow">
            每記一筆就傳到群組
            <small>每月自動記的不會傳</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={status.notify}
            disabled={act.busy || !online}
            onChange={(e) => {
              const on = e.target.checked
              void act.submit(async () => {
                await lineCall({ op: 'notify_set', on })
                setStatus({ ...status, notify: on })
              })
            }}
          />
        </label>
        {status.quota && (
          <p className="note">
            免費額度：這個月已用 {status.quota.used} / {status.quota.max} 則（群組有幾個人，一次就算幾則）。在群組打字記帳的回覆不算額度。
          </p>
        )}
        <div className="line-tips">
          <p className="row-label grow">在群組直接打字也能記：</p>
          <p className="note">「晚餐 320」「全聯 1280」「薪水 42000」，打「本月」看這個月，打「取消」刪掉剛剛記的。</p>
        </div>
        <ErrorNote error={act.error} />
        <button
          type="button"
          className="btn danger-ghost block"
          disabled={act.busy || !online}
          onClick={() =>
            void act.submit(async () => {
              await lineCall({ op: 'unlink' })
              await load()
              toast({ text: '已解除群組連結' })
            })
          }
        >
          解除群組連結
        </button>
      </>
    )

  return (
    <section aria-label="LINE 群組">
      <h2 className="sec">LINE 群組</h2>
      <div className="card pad stack">{body}</div>
      {setup && (
        <SetupSheet
          onClose={() => setSetup(false)}
          onDone={(s) => {
            setSetup(false)
            setStatus(s)
          }}
        />
      )}
    </section>
  )
}

function SetupSheet({ onClose, onDone }: { onClose: () => void; onDone: (s: LineStatus) => void }) {
  const toast = useToast()
  const { busy, error, submit } = useSubmit()
  const [secret, setSecret] = useState('')
  const [token, setToken] = useState('')

  async function save() {
    let next: LineStatus | null = null
    const ok = await submit(async () => {
      const s = secret.trim(),
        t = token.trim()
      if (!s) throw new AppError('請貼上 Channel secret', 'validation')
      if (!t) throw new AppError('請貼上 Channel access token', 'validation')
      const r = await lineCall<{ botName: string; webhook: boolean }>({ op: 'setup', secret: s, token: t })
      next = await lineCall<LineStatus>({ op: 'status' })
      toast({ text: `已連上「${r.botName || 'LINE 官方帳號'}」` })
    })
    if (ok && next) onDone(next)
  }

  return (
    <Sheet title="設定 LINE 機器人" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <p className="note">
          打開 LINE Developers（用 LINE 登入）→ 點你的官方帳號 → 兩個值複製過來貼上。只會存在伺服器，網站上看不到。
        </p>
        <a className="btn secondary block" href="https://developers.line.biz/console/" target="_blank" rel="noreferrer">
          打開 LINE Developers
        </a>
        <label className="field">
          <span className="row-label grow">
            Channel secret
            <small>在「Basic settings」分頁，32 個英文數字</small>
          </span>
          <input className="input" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </label>
        <label className="field">
          <span className="row-label grow">
            Channel access token
            <small>在「Messaging API」分頁最下面，按「Issue」產生</small>
          </span>
          <textarea className="input textarea" rows={3} value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </label>
        <ErrorNote error={error} />
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? '連線中…' : '儲存'}
        </button>
      </form>
    </Sheet>
  )
}
