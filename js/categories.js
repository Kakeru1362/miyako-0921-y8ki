// 旅行の基本情報と分類の定義を1箇所に集約する

export const TRIP = {
  id: 'miyako-2026',
  title: '宮古島たび日程',
  subtitle: 'OKINAWA / MIYAKOJIMA',
  start: '2026-09-21',
  end: '2026-09-25',
}

export const CATEGORIES = [
  { id: 'meal', label: 'ご飯', emoji: '🍽️', color: '#f4714f', tint: '#feefe9' },
  { id: 'activity', label: 'アクティビティ', emoji: '🤿', color: '#0fa3b8', tint: '#e3f6f8' },
  { id: 'move', label: '移動', emoji: '🚗', color: '#7b93ac', tint: '#eef2f6' },
  { id: 'stay', label: '宿・休憩', emoji: '🏝️', color: '#9c86d8', tint: '#f2eefa' },
  { id: 'other', label: 'その他', emoji: '🌺', color: '#dd9a2e', tint: '#fbf3e2' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

// "2026-09-21" → ローカルタイムの Date（new Date(str) のUTC解釈を避ける）
export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayJa(dateStr) {
  return WEEKDAYS_JA[parseDate(dateStr).getDay()]
}

export function todayStr() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function buildDates(start, end) {
  const dates = []
  const endDate = parseDate(end)
  for (let d = parseDate(start); d <= endDate; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const pad = (n) => String(n).padStart(2, '0')
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  return dates
}

export const TRIP_DATES = buildDates(TRIP.start, TRIP.end)

// 旅行前:「あとN日」/ 旅行中:「DayN」/ 旅行後: ねぎらい
export function tripStatus() {
  const today = todayStr()
  if (today < TRIP.start) {
    const diff = Math.round((parseDate(TRIP.start) - parseDate(today)) / 86400000)
    return { phase: 'before', label: `🌺 あと${diff}日` }
  }
  if (today > TRIP.end) {
    return { phase: 'after', label: '🐚 おつかれさま！' }
  }
  const dayN = TRIP_DATES.indexOf(today) + 1
  return { phase: 'during', label: `☀️ Day${dayN}` }
}
