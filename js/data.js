// データ層: Firebase RTDB（設定済みのとき）+ localStorage キャッシュ。
// config.js が null のあいだは localStorage のみで全機能が動く。

import { firebaseConfig } from './config.js'
import { TRIP } from './categories.js'

const CACHE_KEY = `trip-events-${TRIP.id}`
const FB_VERSION = '10.12.2'

let mode = 'local'
let fb = null // { db, ref, push, set, update, remove }

export function getMode() {
  return mode
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.error('キャッシュの読み込みに失敗:', error)
    return {}
  }
}

function writeCache(events) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(events))
  } catch (error) {
    console.error('キャッシュの保存に失敗:', error)
  }
}

async function initFirebase(onChange) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}`
  const [{ initializeApp }, { getAuth, signInAnonymously }, dbModule] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-database.js`),
  ])
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))

  const { getDatabase, ref, onValue, push, set, update, remove } = dbModule
  const db = getDatabase(app)
  const eventsRef = ref(db, `trips/${TRIP.id}/events`)

  fb = { eventsRef, ref, db, push, set, update, remove }

  onValue(eventsRef, (snapshot) => {
    const events = snapshot.val() || {}
    writeCache(events)
    onChange(events)
  })
}

// onChange(events) は購読コールバック。まずキャッシュで即描画し、
// Firebase 設定があれば接続してリアルタイム購読に切り替える。
export async function initData(onChange) {
  onChange(readCache())
  if (firebaseConfig) {
    try {
      await initFirebase(onChange)
      mode = 'cloud'
      return mode
    } catch (error) {
      console.error('Firebase 接続に失敗（端末内モードで続行）:', error)
    }
  }
  mode = 'local'
  return mode
}

function eventPath(id) {
  return `trips/${TRIP.id}/events/${id}`
}

// localStorage モードでは変更後の events を返し、呼び出し側が再描画する。
// cloud モードでは onValue が再描画を担うので null を返す。
export async function addEvent(data) {
  const now = Date.now()
  const event = { ...data, createdAt: now, updatedAt: now }
  if (mode === 'cloud') {
    const newRef = fb.push(fb.eventsRef)
    await fb.set(newRef, event)
    return null
  }
  const events = { ...readCache(), [crypto.randomUUID()]: event }
  writeCache(events)
  return events
}

export async function updateEvent(id, data) {
  const patch = { ...data, updatedAt: Date.now() }
  if (mode === 'cloud') {
    await fb.update(fb.ref(fb.db, eventPath(id)), patch)
    return null
  }
  const cache = readCache()
  const events = { ...cache, [id]: { ...cache[id], ...patch } }
  writeCache(events)
  return events
}

export async function removeEvent(id) {
  if (mode === 'cloud') {
    await fb.remove(fb.ref(fb.db, eventPath(id)))
    return null
  }
  const { [id]: removed, ...events } = readCache()
  writeCache(events)
  return events
}
