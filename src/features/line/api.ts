import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../data/supabase'
import { AppError } from '../data/errors'

// 跟 LINE 機器人（Supabase edge function hl-line）說話。Channel secret／token 存在伺服器，網站拿不回來。
export type LineStatus = {
  ready: boolean
  botName: string
  basicId: string
  group: string
  notify: boolean
  quota: { used: number; max: number } | null
}

const MESSAGES: Record<string, string> = {
  'bad secret': 'Channel secret 應該是 32 個英文和數字，請再複製一次。',
  'bad token': 'Channel access token 好像不完整，請再複製一次（很長一串）。',
  'token rejected': 'LINE 說這組 Channel access token 不對，請重新按「Issue」產生一組再貼。',
  'not ready': '請先完成機器人設定。',
  'not member': '這個帳號沒有權限。',
}

export async function lineCall<T>(body: Record<string, unknown>): Promise<T> {
  if (!navigator.onLine) throw new AppError('目前離線，恢復連線後再試一次。', 'network')
  const { data, error } = await supabase.functions.invoke('hl-line', { body })
  if (error) {
    let code = ''
    if (error instanceof FunctionsHttpError) {
      try {
        code = ((await error.context.json()) as { error?: string }).error ?? ''
      } catch {
        /* 不是 JSON */
      }
    }
    throw new AppError(MESSAGES[code] ?? '連不上 LINE 機器人，請稍後再試。', 'unknown')
  }
  return data as T
}

/** 記了一筆 → 傳到群組（失敗不影響記帳） */
export function notifyLine(id: string) {
  tellLine({ op: 'notify', id })
}

/** 結算、復原、改了傳過的那筆 → 跟群組說（沒連群組、沒傳過的，伺服器會自己略過） */
export function tellLine(body: { op: 'notify' | 'settled' | 'unsettled' | 'changed' | 'mom' | 'mom_repaid' | 'mom_unrepaid'; id: string; before?: unknown }) {
  if (!navigator.onLine) return
  void supabase.functions.invoke('hl-line', { body }).catch(() => undefined)
}
