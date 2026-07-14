// 初期化・状態管理・日タブとフィルタの制御

import { CATEGORIES, TRIP_DATES, todayStr, tripStatus, weekdayJa } from './categories.js'
import { addEvent, getMode, initData, removeEvent, updateEvent } from './data.js'
import { initEventForm, openSheet } from './eventForm.js'
import { renderTimeline } from './timeline.js'

const initialDate = TRIP_DATES.includes(todayStr()) ? todayStr() : TRIP_DATES[0]

let state = {
  events: {},
  selectedDate: initialDate,
  filter: 'all',
}

function setState(patch) {
  state = { ...state, ...patch }
  render()
}

function render() {
  renderDayTabs()
  renderFilters()
  renderTimeline(document.getElementById('timeline'), {
    events: state.events,
    date: state.selectedDate,
    filter: state.filter,
    onEdit: (id, event) => openSheet({ date: state.selectedDate, event, id }),
  })
}

function renderDayTabs() {
  const nav = document.getElementById('dayTabs')
  const frag = document.createDocumentFragment()
  const today = todayStr()

  TRIP_DATES.forEach((date, i) => {
    const [, , d] = date.split('-')
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.className = 'day-tab'
    if (date === state.selectedDate) tab.classList.add('is-active')
    if (date === today) tab.classList.add('is-today')

    const dayNo = document.createElement('span')
    dayNo.className = 'day-no'
    dayNo.textContent = `Day${i + 1}`
    const dayDate = document.createElement('span')
    dayDate.className = 'day-date'
    dayDate.textContent = String(Number(d))
    const dayW = document.createElement('span')
    dayW.className = 'day-w'
    dayW.textContent = weekdayJa(date)

    const count = Object.values(state.events).filter((ev) => ev.date === date).length
    if (count > 0) {
      const dot = document.createElement('span')
      dot.className = 'day-count'
      dot.textContent = String(count)
      tab.appendChild(dot)
    }

    tab.appendChild(dayNo)
    tab.appendChild(dayDate)
    tab.appendChild(dayW)
    tab.addEventListener('click', () => setState({ selectedDate: date }))
    frag.appendChild(tab)
  })
  nav.replaceChildren(frag)
}

const FILTERS = [
  { id: 'all', label: 'ぜんぶ' },
  ...CATEGORIES.map((c) => ({ id: c.id, label: `${c.emoji} ${c.label}`, color: c.color, tint: c.tint })),
  { id: 'reserved', label: '🎫 予約あり' },
]

function renderFilters() {
  const wrap = document.getElementById('filterChips')
  const frag = document.createDocumentFragment()
  for (const f of FILTERS) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'filter-chip'
    chip.textContent = f.label
    if (f.color) {
      chip.style.setProperty('--cat', f.color)
      chip.style.setProperty('--cat-tint', f.tint)
    }
    if (state.filter === f.id) chip.classList.add('is-active')
    chip.addEventListener('click', () => {
      setState({ filter: state.filter === f.id ? 'all' : f.id })
    })
    frag.appendChild(chip)
  }
  wrap.replaceChildren(frag)
}

function renderHeader() {
  const status = tripStatus()
  document.getElementById('tripStatus').textContent = status.label
}

function renderSyncStatus() {
  const pill = document.getElementById('syncStatus')
  if (getMode() === 'cloud') {
    pill.textContent = '☁️ ふたりで同期中'
    pill.classList.add('is-cloud')
  } else {
    pill.textContent = '📱 この端末のみ保存'
    pill.classList.remove('is-cloud')
  }
}

async function handleSubmit(id, data) {
  const events = id === null ? await addEvent(data) : await updateEvent(id, data)
  // localStorage モードでは返り値で再描画（cloud は購読側が反映する）
  if (events) setState({ events, selectedDate: data.date })
  else setState({ selectedDate: data.date })
}

async function handleDelete(id) {
  const events = await removeEvent(id)
  if (events) setState({ events })
}

function init() {
  renderHeader()
  initEventForm({ onSubmit: handleSubmit, onDelete: handleDelete })

  document.getElementById('addBtn').addEventListener('click', () => {
    openSheet({ date: state.selectedDate })
  })

  initData((events) => setState({ events })).then(() => renderSyncStatus())

  // 旅行当日は1分ごとに「いまここ」ラインを更新する
  setInterval(() => {
    if (state.selectedDate === todayStr()) render()
  }, 60000)

  render()
}

init()
