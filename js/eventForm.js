// 予定の追加・編集・削除を行うボトムシートフォーム。
// index.html 内の静的フォームを制御する。

import { CATEGORIES, TRIP_DATES, weekdayJa } from './categories.js'

let elements = null
let editingId = null
let submitHandler = null
let deleteHandler = null

function q(id) {
  return document.getElementById(id)
}

function buildCategoryChips() {
  const wrap = elements.categoryWrap
  const frag = document.createDocumentFragment()
  for (const cat of CATEGORIES) {
    const label = document.createElement('label')
    label.className = 'cat-chip'
    label.style.setProperty('--cat', cat.color)
    label.style.setProperty('--cat-tint', cat.tint)

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'category'
    input.value = cat.id

    const text = document.createElement('span')
    text.textContent = `${cat.emoji} ${cat.label}`

    label.appendChild(input)
    label.appendChild(text)
    frag.appendChild(label)
  }
  wrap.replaceChildren(frag)
}

function buildDateOptions() {
  const frag = document.createDocumentFragment()
  TRIP_DATES.forEach((date, i) => {
    const option = document.createElement('option')
    option.value = date
    const [, m, d] = date.split('-')
    option.textContent = `Day${i + 1}　${Number(m)}/${Number(d)}（${weekdayJa(date)}）`
    frag.appendChild(option)
  })
  elements.date.replaceChildren(frag)
}

function setError(message) {
  elements.error.textContent = message
  elements.error.hidden = !message
}

function getSelectedCategory() {
  const checked = elements.categoryWrap.querySelector('input[name="category"]:checked')
  return checked ? checked.value : null
}

function setSelectedCategory(id) {
  for (const input of elements.categoryWrap.querySelectorAll('input[name="category"]')) {
    input.checked = input.value === id
  }
}

function readForm() {
  return {
    title: elements.title.value.trim(),
    date: elements.date.value,
    start: elements.start.value || '',
    end: elements.end.value || '',
    category: getSelectedCategory(),
    reserved: elements.reservedYes.checked,
    mapUrl: elements.mapUrl.value.trim(),
    memo: elements.memo.value.trim(),
  }
}

function validate(data) {
  if (!data.title) return '予定名を入れてね'
  if (!data.category) return '分類をえらんでね'
  if (data.mapUrl && !/^https?:\/\//.test(data.mapUrl)) {
    return 'マップはGoogleマップの共有リンク（https://…）を貼ってね'
  }
  if (data.start && data.end && data.end < data.start) return '終了時刻が開始より前になってるよ'
  return null
}

export function openSheet({ date, event = null, id = null, prefillStart = '', prefillCategory = '' }) {
  editingId = id
  setError('')
  elements.form.reset()

  elements.sheetTitle.textContent = event ? '予定を編集' : '予定を追加'
  elements.title.value = event ? event.title : ''
  elements.date.value = event ? event.date : date
  elements.start.value = event ? event.start || '' : prefillStart
  elements.end.value = event ? event.end || '' : ''
  setSelectedCategory(event ? event.category : prefillCategory || 'activity')
  elements.reservedYes.checked = Boolean(event && event.reserved)
  elements.reservedNo.checked = !(event && event.reserved)
  elements.mapUrl.value = event ? event.mapUrl || '' : ''
  elements.memo.value = event ? event.memo || '' : ''
  elements.deleteBtn.hidden = !event

  elements.backdrop.classList.add('is-open')
  elements.sheet.classList.add('is-open')
  document.body.classList.add('sheet-open')
}

export function closeSheet() {
  elements.backdrop.classList.remove('is-open')
  elements.sheet.classList.remove('is-open')
  document.body.classList.remove('sheet-open')
  editingId = null
}

async function handleSubmit(e) {
  e.preventDefault()
  const data = readForm()
  const error = validate(data)
  if (error) {
    setError(error)
    return
  }
  elements.saveBtn.disabled = true
  try {
    await submitHandler(editingId, data)
    closeSheet()
  } catch (err) {
    console.error('保存に失敗:', err)
    setError('保存できなかった…電波を確認してもう一度ためしてね')
  } finally {
    elements.saveBtn.disabled = false
  }
}

async function handleDelete() {
  if (!editingId) return
  const ok = window.confirm('この予定を削除する？')
  if (!ok) return
  try {
    await deleteHandler(editingId)
    closeSheet()
  } catch (err) {
    console.error('削除に失敗:', err)
    setError('削除できなかった…電波を確認してもう一度ためしてね')
  }
}

// onSubmit(id, data): id が null なら新規追加。onDelete(id): 削除。
export function initEventForm({ onSubmit, onDelete }) {
  submitHandler = onSubmit
  deleteHandler = onDelete
  elements = {
    sheet: q('eventSheet'),
    backdrop: q('sheetBackdrop'),
    form: q('eventForm'),
    sheetTitle: q('sheetTitle'),
    title: q('fTitle'),
    date: q('fDate'),
    start: q('fStart'),
    end: q('fEnd'),
    categoryWrap: q('fCategories'),
    reservedYes: q('fReservedYes'),
    reservedNo: q('fReservedNo'),
    mapUrl: q('fMap'),
    memo: q('fMemo'),
    error: q('fError'),
    saveBtn: q('fSave'),
    deleteBtn: q('fDelete'),
  }
  buildCategoryChips()
  buildDateOptions()
  elements.form.addEventListener('submit', handleSubmit)
  elements.deleteBtn.addEventListener('click', handleDelete)
  elements.backdrop.addEventListener('click', closeSheet)
  q('fClose').addEventListener('click', closeSheet)
}
