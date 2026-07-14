// 【旧キャッシュ互換のため残置】現行アプリからは未使用。
// GitHub Pages のキャッシュ(約10分)に残った旧 app.js がこのファイルを import するため、
// 削除すると旧キャッシュ利用中の端末でアプリ全体が起動しなくなる。
// ※ JSモジュールはリネーム・削除しないこと（変更は中身の書き換えで行う）
//
// 選択中の日のタイムライン描画。
// コンパクトカード + タップ展開、「いまここ」ライン、空の日の表示を担当。

import { CATEGORY_MAP, todayStr } from './categories.js'

const TURTLE_MINI = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 84" class="turtle-mini" aria-hidden="true">
  <path d="M30 60 Q 14 74 26 78 Q 38 81 44 66" fill="#8fd6b8"/>
  <path d="M52 26 Q 36 6 22 14 Q 30 30 48 38" fill="#8fd6b8"/>
  <ellipse cx="60" cy="48" rx="32" ry="23" fill="#2f9e8f"/>
  <ellipse cx="60" cy="46" rx="24" ry="16" fill="#3db3a0"/>
  <circle cx="98" cy="38" r="12" fill="#8fd6b8"/>
  <circle cx="102" cy="35" r="2.2" fill="#1d4e5f"/>
  <path d="M96 42 q 4 3 8 0" stroke="#1d4e5f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`

// 定数SVG文字列をDOMノード化する（HTML文字列挿入のシンクを使わない）
function svgNode(svgText) {
  return new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement
}

function minutesOf(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// 時刻あり → 時刻順、時刻なし → 末尾（作成順）
export function sortEvents(entries) {
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

function buildBadges(event) {
  const wrap = el('span', 'card-badges')
  if (event.reserved) {
    wrap.appendChild(el('span', 'badge badge-reserved', '予約済み'))
  }
  if (event.mapUrl) {
    wrap.appendChild(el('span', 'badge badge-map', '📍'))
  }
  return wrap
}

function buildCardBody(id, event, { onEdit }) {
  const body = el('div', 'card-body')
  const inner = el('div', 'card-body-inner')

  const meta = el('p', 'card-meta')
  meta.textContent = event.reserved ? '予約：あり 🎫' : '予約：なし'
  inner.appendChild(meta)

  if (event.memo) {
    inner.appendChild(el('p', 'card-memo', event.memo))
  }

  const actions = el('div', 'card-actions')
  if (event.mapUrl) {
    const map = el('a', 'btn-map', '📍 マップを開く')
    map.href = event.mapUrl
    map.target = '_blank'
    map.rel = 'noopener noreferrer'
    map.addEventListener('click', (e) => e.stopPropagation())
    actions.appendChild(map)
  }
  const edit = el('button', 'btn-edit', '✏️ 編集')
  edit.type = 'button'
  edit.addEventListener('click', (e) => {
    e.stopPropagation()
    onEdit(id, event)
  })
  actions.appendChild(edit)
  inner.appendChild(actions)

  body.appendChild(inner)
  return body
}

function buildCard(id, event, handlers) {
  const cat = CATEGORY_MAP[event.category] || CATEGORY_MAP.other
  const card = el('article', 'card')
  card.style.setProperty('--cat', cat.color)
  card.style.setProperty('--cat-tint', cat.tint)
  card.dataset.id = id

  const head = el('button', 'card-head')
  head.type = 'button'
  head.setAttribute('aria-expanded', 'false')

  const time = el('span', 'card-time')
  if (event.start) {
    time.textContent = event.start
    if (event.end) {
      const end = el('small', '', `–${event.end}`)
      time.appendChild(end)
    }
  } else {
    time.textContent = '未定'
    time.classList.add('is-tbd')
  }

  const title = el('span', 'card-title')
  title.appendChild(el('span', 'card-emoji', cat.emoji))
  title.appendChild(document.createTextNode(event.title))

  head.appendChild(time)
  head.appendChild(title)
  head.appendChild(buildBadges(event))
  head.addEventListener('click', () => {
    const open = card.classList.toggle('is-open')
    head.setAttribute('aria-expanded', String(open))
  })

  card.appendChild(head)
  card.appendChild(buildCardBody(id, event, handlers))
  return card
}

function buildNowLine() {
  const line = el('div', 'now-line')
  line.appendChild(el('span', 'now-label', '🐢 いまここ'))
  return line
}

function buildEmptyState(hasAnyEvents) {
  const empty = el('div', 'empty-state')
  empty.appendChild(svgNode(TURTLE_MINI))
  const message = hasAnyEvents
    ? 'この日はまだ予定がないよ'
    : 'まだ予定がないよ。\n右下の＋から追加してね！'
  empty.appendChild(el('p', '', message))
  return empty
}

// events: {id: event}、date: 表示する日、filter: 'all' | カテゴリid | 'reserved'
export function renderTimeline(container, { events, date, filter, onEdit }) {
  const all = Object.entries(events)
  const dayEntries = sortEvents(
    all.filter(([, ev]) => ev.date === date)
      .filter(([, ev]) => {
        if (filter === 'all') return true
        if (filter === 'reserved') return ev.reserved
        return ev.category === filter
      })
  )

  const frag = document.createDocumentFragment()

  if (dayEntries.length === 0) {
    frag.appendChild(buildEmptyState(all.length > 0))
  } else {
    const isToday = date === todayStr()
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    let nowPlaced = !isToday

    for (const [id, event] of dayEntries) {
      const startMin = minutesOf(event.start)
      if (!nowPlaced && startMin !== null && startMin > nowMin) {
        frag.appendChild(buildNowLine())
        nowPlaced = true
      }
      frag.appendChild(buildCard(id, event, { onEdit }))
    }
    if (!nowPlaced) frag.appendChild(buildNowLine())
  }

  container.replaceChildren(frag)
}
