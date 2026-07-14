// 時間グリッドのブロックをタップしたときの詳細ボトムシート（閲覧用）

import { CATEGORY_MAP } from './categories.js'

let elements = null
let current = null
let editHandler = null

function q(id) {
  return document.getElementById(id)
}

export function openDetail(id, event) {
  current = { id, event }
  const cat = CATEGORY_MAP[event.category] || CATEGORY_MAP.other

  elements.title.textContent = event.title
  elements.cat.textContent = `${cat.emoji} ${cat.label}`
  elements.cat.style.setProperty('--cat', cat.color)
  elements.cat.style.setProperty('--cat-tint', cat.tint)

  const time = event.start ? (event.end ? `${event.start}–${event.end}` : event.start) : '時間未定'
  elements.time.textContent = `🕐 ${time}`
  elements.reserved.textContent = event.reserved ? '予約済み' : '予約なし'
  elements.reserved.classList.toggle('is-reserved', Boolean(event.reserved))

  elements.memo.textContent = event.memo || ''
  elements.memo.hidden = !event.memo
  elements.map.hidden = !event.mapUrl
  if (event.mapUrl) elements.map.href = event.mapUrl

  elements.backdrop.classList.add('is-open')
  elements.sheet.classList.add('is-open')
  document.body.classList.add('sheet-open')
}

export function closeDetail() {
  current = null
  elements.sheet.classList.remove('is-open')
  // フォームシートが開いていなければ背景も閉じる
  if (!document.getElementById('eventSheet').classList.contains('is-open')) {
    elements.backdrop.classList.remove('is-open')
    document.body.classList.remove('sheet-open')
  }
}

export function initEventDetail({ onEdit }) {
  editHandler = onEdit
  elements = {
    sheet: q('detailSheet'),
    backdrop: q('sheetBackdrop'),
    title: q('dTitle'),
    cat: q('dCat'),
    time: q('dTime'),
    reserved: q('dReserved'),
    memo: q('dMemo'),
    map: q('dMap'),
  }
  q('dClose').addEventListener('click', closeDetail)
  q('dEdit').addEventListener('click', () => {
    if (!current) return
    const { id, event } = current
    closeDetail()
    editHandler(id, event)
  })
  elements.backdrop.addEventListener('click', () => {
    if (current) closeDetail()
  })
}
