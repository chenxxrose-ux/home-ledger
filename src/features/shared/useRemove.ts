import { useStore } from '../data/store'
import { useToast } from '../../ui/kit'
import { toAppError } from '../data/errors'
import { fmt } from '../../lib/money'
import type { Entry } from '../../lib/types'

/** 滑出來的「刪除」：馬上刪，可以復原 */
export function useRemove() {
  const { actions } = useStore()
  const toast = useToast()
  return (e: Entry, name: string) => {
    actions
      .deleteEntry(e.id)
      .then(() => toast({ text: `已刪除：${name} ${fmt(e.amount)} 元`, action: { label: '復原', run: () => actions.restoreEntry(e.id) } }))
      .catch((err) => toast({ text: toAppError(err).message }))
  }
}
