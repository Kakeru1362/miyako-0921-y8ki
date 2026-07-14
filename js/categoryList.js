// カテゴリタブ（ごはん・カフェ・アクティビティ）のタスクリスト表示。
// 全日程を横断して「その分類に何の予定があるか」を一覧で見せる。

import { CATEGORY_MAP, TRIP_DATES, weekdayJa } from './categories.js'

function minutesOf(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// 時刻あり → 時刻順、時刻なし → 末尾（作成順）
function sortEvents(entries) {
  return [...entries].sort(([, a], [, b]) => {
    const ma = minutesOf(a.start)
    const mb = minutesOf(b.start)
    if (ma === null && mb === null) return (a.createdAt || 0) - (b.createdAt || 0)
    if (ma === null) return 1
    if (mb === null) return -1
    return ma - mb
  })
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function buildRow(id, ev, cat, onOpen) {
  const row = el('button', 'task-row')
  row.type = 'button'
  row.style.setProperty('--cat', cat.color)
  row.style.setProperty('--cat-tint', cat.tint)

  row.appendChild(el('span', 'task-dot'))
  row.appendChild(el('span', 'task-title', ev.title))

  const meta = el('span', 'task-meta')
  if (ev.reserved) meta.appendChild(el('span', 'badge badge-reserved', '予約済み'))
  if (ev.mapUrl) meta.appendChild(el('span', 'task-pin', '📍'))
  const time = ev.start ? (ev.end ? `${ev.start}–${ev.end}` : ev.start) : '時間未定'
  meta.appendChild(el('span', 'task-time', time))
  row.appendChild(meta)

  row.addEventListener('click', () => onOpen(id, ev))
  return row
}

export function renderCategoryList(container, { events, category, onOpen }) {
  const cat = CATEGORY_MAP[category]
  const entries = Object.entries(events).filter(([, ev]) => ev.category === category)
  const frag = document.createDocumentFragment()

  const head = el('p', 'tasklist-head')
  head.appendChild(el('span', 'tasklist-head-label', `${cat.emoji} ${cat.label}の予定`))
  head.appendChild(el('span', 'tasklist-head-count', `${entries.length}件`))
  frag.appendChild(head)

  if (entries.length === 0) {
    const empty = el('div', 'empty-state')
    empty.appendChild(el('span', 'empty-emoji', cat.emoji))
    empty.appendChild(el('p', '', `まだ${cat.label}の予定がないよ。\n右下の＋から追加してね！`))
    frag.appendChild(empty)
  }

  TRIP_DATES.forEach((date, i) => {
    const items = sortEvents(entries.filter(([, ev]) => ev.date === date))
    if (items.length === 0) return

    const group = el('section', 'tasklist-group')
    const [, m, d] = date.split('-')
    group.appendChild(
      el('h3', 'tasklist-day', `Day${i + 1}・${Number(m)}/${Number(d)}（${weekdayJa(date)}）`)
    )
    const card = el('div', 'tasklist-card')
    for (const [id, ev] of items) card.appendChild(buildRow(id, ev, cat, onOpen))
    group.appendChild(card)
    frag.appendChild(group)
  })

  container.replaceChildren(frag)
}
