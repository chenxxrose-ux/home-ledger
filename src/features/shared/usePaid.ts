import { useStore } from '../data/store'
import { useToast } from '../../ui/kit'
import { toAppError } from '../data/errors'
import { fmt } from '../../lib/money'
import type { Entry } from '../../lib/types'

/** 待繳的勾一下 → 繳了，可以復原 */
export function usePaid() {
  const { actions } = useStore()
  const toast = useToast()
  return (e: Entry, name: string) => {
    actions
      .setPaid(e.id, true)
      .then(() => toast({ text: `${e.kind === 'in' ? '已收到' : '已繳'}：${name} ${fmt(e.amount)} 元`, action: { label: '復原', run: () => actions.setPaid(e.id, false) } }))
      .catch((err) => toast({ text: toAppError(err).message }))
  }
}
