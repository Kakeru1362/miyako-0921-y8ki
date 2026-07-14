// 既読管理。日タブの赤バッジは「まだ見ていない新規・更新された予定」の件数を示し、
// その日を開くと消える。既読情報は端末ごと（localStorage）に持つ。

import { TRIP } from './categories.js'

const SEEN_KEY = `trip-seen-${TRIP.id}`

export function loadSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.error('既読情報の読み込みに失敗:', error)
    return {}
  }
}

function saveSeen(seen) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  } catch (error) {
    console.error('既読情報の保存に失敗:', error)
  }
}

function stampOf(event) {
  return event.updatedAt || event.createdAt || 0
}

export function isUnseen(id, event, seen) {
  const at = seen[id]
  return at === undefined || at < stampOf(event)
}

// 初回起動の端末では、いま届いている予定をすべて既読にする。
// （初めて開いた人の全日程が赤バッジだらけになるのを防ぐ）
export function ensureSeen(events, seen) {
  if (localStorage.getItem(SEEN_KEY) !== null) return seen
  const ids = Object.keys(events)
  if (ids.length === 0) return seen // まだ予定が届いていない：次の描画で判定する

  const next = Object.fromEntries(ids.map((id) => [id, stampOf(events[id])]))
  saveSeen(next)
  return next
}

export function unseenCount(events, date, seen) {
  return Object.entries(events).filter(([id, ev]) => ev.date === date && isUnseen(id, ev, seen)).length
}

export function unseenIdsOn(events, date, seen) {
  return new Set(
    Object.entries(events)
      .filter(([id, ev]) => ev.date === date && isUnseen(id, ev, seen))
      .map(([id]) => id)
  )
}

// 指定日の予定を既読にする。変化がなければ元のオブジェクトをそのまま返す。
// 削除済みの予定の既読情報もあわせて掃除する。
export function markDateSeen(events, date, seen) {
  const next = {}
  let changed = false

  for (const [id, ev] of Object.entries(events)) {
    if (ev.date === date) {
      const at = stampOf(ev)
      next[id] = at
      if (seen[id] !== at) changed = true
    } else if (seen[id] !== undefined) {
      next[id] = seen[id]
    }
  }
  if (Object.keys(next).length !== Object.keys(seen).length) changed = true
  if (!changed) return seen

  saveSeen(next)
  return next
}
