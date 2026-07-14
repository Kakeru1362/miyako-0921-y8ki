// 時間軸グリッド表示。予定が入っている/空いている時間帯がひと目で分かる。
// 空き時間をタップするとその時刻を開始時刻にして予定追加できる。

import { CATEGORY_MAP, todayStr } from './categories.js'

const BASE_START_HOUR = 7
const BASE_END_HOUR = 22
const HOUR_H = 52 // 1時間あたりの高さ(px)。css/timegrid.css の --hour-h と合わせる
const SNAP_MIN = 30

function minutesOf(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// <input type="time"> に渡すため HH:MM 形式（ゼロ埋め）にする
function toTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function matchFilter(ev, filter) {
  if (filter === 'all') return true
  if (filter === 'reserved') return ev.reserved
  return ev.category === filter
}

// 重なる予定をクラスタにまとめ、列番号と列数を割り当てる
function layoutBlocks(timed) {
  const sorted = [...timed].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const placed = []
  let cluster = []
  let clusterEnd = -1
  let colEnds = []

  const closeCluster = () => {
    for (const block of cluster) placed.push({ ...block, cols: colEnds.length })
  }

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMin >= clusterEnd) {
      closeCluster()
      cluster = []
      colEnds = []
    }
    let col = colEnds.findIndex((end) => end <= block.startMin)
    if (col === -1) {
      col = colEnds.length
      colEnds = [...colEnds, block.endMin]
    } else {
      colEnds = colEnds.map((end, i) => (i === col ? block.endMin : end))
    }
    cluster = [...cluster, { ...block, col }]
    clusterEnd = Math.max(clusterEnd, block.endMin)
  }
  closeCluster()
  return placed
}

function buildUntimedRow(untimed, onOpen) {
  const row = el('div', 'tg-untimed')
  row.appendChild(el('span', 'tg-untimed-label', '時間未定'))
  for (const { id, ev } of untimed) {
    const cat = CATEGORY_MAP[ev.category] || CATEGORY_MAP.other
    const chip = el('button', 'tg-untimed-chip')
    chip.type = 'button'
    chip.style.setProperty('--cat', cat.color)
    chip.style.setProperty('--cat-tint', cat.tint)
    chip.textContent = `${cat.emoji} ${ev.title}${ev.reserved ? ' 🎫' : ''}`
    chip.addEventListener('click', () => onOpen(id, ev))
    row.appendChild(chip)
  }
  return row
}

function buildBlock(block, gridStartMin, onOpen) {
  const { id, ev, startMin, endMin, col, cols } = block
  const cat = CATEGORY_MAP[ev.category] || CATEGORY_MAP.other
  const node = el('button', 'tg-block')
  node.type = 'button'
  node.style.setProperty('--cat', cat.color)
  node.style.setProperty('--cat-tint', cat.tint)
  node.style.top = `${((startMin - gridStartMin) / 60) * HOUR_H}px`
  node.style.height = `${Math.max(26, ((endMin - startMin) / 60) * HOUR_H - 2)}px`
  node.style.left = `calc(var(--label-w) + (100% - var(--label-w)) * ${col} / ${cols})`
  node.style.width = `calc((100% - var(--label-w)) / ${cols} - 4px)`
  if (!ev.end) node.classList.add('is-open-ended')

  const time = el('span', 'tg-block-time', ev.end ? `${ev.start}–${ev.end}` : ev.start)
  const title = el('span', 'tg-block-title', `${cat.emoji} ${ev.title}`)
  node.appendChild(time)
  node.appendChild(title)
  if (ev.reserved) node.appendChild(el('span', 'tg-reserved', '予約済み'))
  node.addEventListener('click', (e) => {
    e.stopPropagation()
    onOpen(id, ev)
  })
  return node
}

// events: {id: event}。onOpen(id, ev)=詳細表示、onAddAt(time)=空き時間タップで追加
export function renderTimeGrid(container, { events, date, filter, onOpen, onAddAt }) {
  const entries = Object.entries(events)
    .filter(([, ev]) => ev.date === date && matchFilter(ev, filter))
    .map(([id, ev]) => ({ id, ev, startMin: minutesOf(ev.start) }))

  const untimed = entries.filter((e) => e.startMin === null)
  const timed = entries
    .filter((e) => e.startMin !== null)
    .map((e) => {
      const endRaw = minutesOf(e.ev.end)
      const endMin = endRaw !== null && endRaw > e.startMin ? endRaw : e.startMin + 60
      return { ...e, endMin: Math.min(endMin, 24 * 60) }
    })

  const startHour = Math.max(0, Math.min(BASE_START_HOUR, ...timed.map((e) => Math.floor(e.startMin / 60))))
  const endHour = Math.min(24, Math.max(BASE_END_HOUR, ...timed.map((e) => Math.ceil(e.endMin / 60))))
  const gridStartMin = startHour * 60

  const frag = document.createDocumentFragment()
  if (untimed.length > 0) frag.appendChild(buildUntimedRow(untimed, onOpen))

  const grid = el('div', 'tg-grid')
  grid.style.height = `${(endHour - startHour) * HOUR_H}px`

  for (let h = startHour; h <= endHour; h++) {
    const y = (h - startHour) * HOUR_H
    const line = el('div', 'tg-line')
    line.style.top = `${y}px`
    grid.appendChild(line)
    if (h < endHour) {
      const half = el('div', 'tg-line tg-line-half')
      half.style.top = `${y + HOUR_H / 2}px`
      grid.appendChild(half)
      const label = el('span', 'tg-hour', `${h}:00`)
      label.style.top = `${y}px`
      grid.appendChild(label)
    }
  }

  for (const block of layoutBlocks(timed)) {
    grid.appendChild(buildBlock(block, gridStartMin, onOpen))
  }

  if (date === todayStr()) {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    if (nowMin >= gridStartMin && nowMin <= endHour * 60) {
      const line = el('div', 'tg-now')
      line.style.top = `${((nowMin - gridStartMin) / 60) * HOUR_H}px`
      line.appendChild(el('span', 'tg-now-label', '🐢 いま'))
      grid.appendChild(line)
    }
  }

  // 空き時間タップ → 30分刻みに丸めてその時刻で追加
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.tg-block')) return
    const rect = grid.getBoundingClientRect()
    const min = gridStartMin + Math.floor(((e.clientY - rect.top) / HOUR_H) * 60 / SNAP_MIN) * SNAP_MIN
    onAddAt(toTime(Math.max(0, Math.min(min, 23 * 60 + 30))))
  })

  frag.appendChild(grid)
  frag.appendChild(el('p', 'tg-hint', '空いている時間をタップすると、その時刻で予定を追加できるよ'))
  container.replaceChildren(frag)
}
