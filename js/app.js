// 初期化・状態管理・日タブとフィルタの制御

import { CATEGORY_MAP, TAB_CATEGORY_IDS, TRIP_DATES, todayStr, tripStatus, weekdayJa } from './categories.js'
import { renderCategoryList } from './categoryList.js'
import { addEvent, getMode, initData, removeEvent, updateEvent } from './data.js'
import { initEventDetail, openDetail } from './eventDetail.js'
import { initEventForm, openSheet } from './eventForm.js'
import { ensureSeen, loadSeen, markDateSeen, unseenCount, unseenIdsOn } from './seen.js'
import { renderTimeGrid } from './timegrid.js'

const initialDate = TRIP_DATES.includes(todayStr()) ? todayStr() : TRIP_DATES[0]

let state = {
  events: {},
  selectedDate: initialDate,
  tab: 'all', // 'all' | 分類id（ごはん・カフェ・アクティビティ）
  seen: loadSeen(), // 既読の予定 {id: 更新時刻}
}

function setState(patch) {
  state = { ...state, ...patch }
  render()
}

function openEdit(id, event) {
  openSheet({ date: state.selectedDate, event, id })
}

function render() {
  const isAll = state.tab === 'all'
  document.getElementById('dayTabs').hidden = !isAll

  // 表示する日の「新着」を先に控えてから既読にする
  // （バッジは消えるが、その日の新しい予定には NEW マークが残る）
  const seen = ensureSeen(state.events, state.seen)
  const unseenIds = isAll ? unseenIdsOn(state.events, state.selectedDate, seen) : new Set()
  state.seen = isAll ? markDateSeen(state.events, state.selectedDate, seen) : seen

  renderDayTabs()
  renderTabs()

  const container = document.getElementById('timeline')
  if (isAll) {
    renderTimeGrid(container, {
      events: state.events,
      date: state.selectedDate,
      filter: 'all', // 旧キャッシュの timegrid.js との混在に備えて渡し続ける
      unseenIds,
      onOpen: openDetail,
      onAddAt: (time) => openSheet({ date: state.selectedDate, prefillStart: time }),
    })
  } else {
    renderCategoryList(container, {
      events: state.events,
      category: state.tab,
      onOpen: openDetail,
    })
  }
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

    // 赤バッジ＝まだ見ていない新規・更新された予定の件数（その日を開くと消える）
    const unseen = unseenCount(state.events, date, state.seen)
    if (unseen > 0) {
      const dot = document.createElement('span')
      dot.className = 'day-count'
      dot.textContent = String(unseen)
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

const TABS = [
  { id: 'all', label: 'すべて' },
  ...TAB_CATEGORY_IDS.map((id) => {
    const c = CATEGORY_MAP[id]
    return { id: c.id, label: `${c.emoji} ${c.label}`, color: c.color, tint: c.tint }
  }),
]

function renderTabs() {
  const wrap = document.getElementById('filterChips')
  const frag = document.createDocumentFragment()
  for (const tab of TABS) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'filter-chip'
    chip.textContent = tab.label
    if (tab.id !== 'all') {
      chip.style.setProperty('--cat', tab.color)
      chip.style.setProperty('--cat-tint', tab.tint)
      const count = Object.values(state.events).filter((ev) => ev.category === tab.id).length
      if (count > 0) chip.appendChild(document.createTextNode(`・${count}`))
    }
    if (state.tab === tab.id) chip.classList.add('is-active')
    chip.addEventListener('click', () => setState({ tab: tab.id }))
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
  initEventDetail({ onEdit: openEdit })

  document.getElementById('addBtn').addEventListener('click', () => {
    openSheet({
      date: state.selectedDate,
      prefillCategory: state.tab !== 'all' ? state.tab : '',
    })
  })

  initData((events) => setState({ events })).then(() => renderSyncStatus())

  // 旅行当日は1分ごとに「いまここ」ラインを更新する
  setInterval(() => {
    if (state.selectedDate === todayStr()) render()
  }, 60000)

  render()
}

init()
