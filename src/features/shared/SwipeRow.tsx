import { useEffect, useRef, useState, type ReactNode } from 'react'
import { UiIcon } from '../../ui/icons'

/** 往左滑，右邊露出「修改」「刪除」。一次只會開一列；點別的地方就收回去 */
const W = 160
const OPEN = 'swipe-open'
let seq = 0

type Drag = { x0: number; y0: number; t0: number; base: number; lock: 'x' | 'y' | null; dx: number }

export function SwipeRow({ children, onEdit, onDelete }: { children: ReactNode; onEdit: () => void; onDelete: () => void }) {
  const [id] = useState(() => ++seq)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<Drag | null>(null)
  const swallow = useRef(false) // 剛剛是滑的，不要當成點一下
  const box = useRef<HTMLDivElement>(null)
  const open = x < 0 && !dragging

  useEffect(() => {
    if (!open) return
    const outside = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setX(0)
    }
    const other = (e: Event) => {
      if ((e as CustomEvent<number>).detail !== id) setX(0)
    }
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener(OPEN, other)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      window.removeEventListener(OPEN, other)
    }
  }, [open, id])

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (open && (e.target as Element).closest('.swipe-acts')) return // 按修改／刪除，不是要滑
    drag.current = { x0: e.clientX, y0: e.clientY, t0: e.timeStamp, base: x, lock: null, dx: 0 }
    swallow.current = false
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.lock) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.lock = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      } else if (Math.abs(dy) > 8) d.lock = 'y'
    }
    if (d.lock !== 'x') return
    swallow.current = true
    d.dx = dx
    let nx = d.base + dx
    if (nx > 0) nx = 0
    if (nx < -W) nx = -W + (nx + W) / 4 // 拉過頭有一點阻力
    setX(nx)
  }
  function up(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    drag.current = null
    if (!d || d.lock !== 'x') return
    const v = d.dx / Math.max(1, e.timeStamp - d.t0) // px/ms，快速一甩也算
    const nx = d.base + d.dx
    const toOpen = v < -0.5 || (v <= 0.5 && nx < -W / 2)
    setDragging(false)
    setX(toOpen ? -W : 0)
    if (toOpen) window.dispatchEvent(new CustomEvent(OPEN, { detail: id }))
  }
  function clickCapture(e: React.MouseEvent) {
    if ((e.target as Element).closest('.swipe-acts')) return // 按的是修改／刪除
    if (swallow.current || x < 0) {
      // 滑完放手、或已經打開時點一下 → 只是收回去
      e.preventDefault()
      e.stopPropagation()
      swallow.current = false
      if (!dragging) setX(0)
    }
  }
  const act = (run: () => void) => () => {
    setX(0)
    run()
  }

  return (
    // 手勢掛在整列上：收回去的動畫還沒跑完就再滑，也抓得到
    <div className="swipe" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={clickCapture}>
      <div className="swipe-acts" aria-hidden={!open}>
        <button type="button" className="swipe-btn edit" tabIndex={open ? 0 : -1} onClick={act(onEdit)}>
          <UiIcon name="pencil" size={20} />
          修改
        </button>
        <button type="button" className="swipe-btn del" tabIndex={open ? 0 : -1} onClick={act(onDelete)}>
          <UiIcon name="trash" size={20} />
          刪除
        </button>
      </div>
      <div
        className="swipe-front"
        style={{ transform: `translate3d(${x}px,0,0)`, transition: dragging ? 'none' : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
