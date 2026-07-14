// Firebase の設定。null のあいだは端末内（localStorage）モードで動く。
// ここに値が入っていると、二人のスマホ間でリアルタイム同期される。
//
// ※ apiKey は公開前提の識別子で、秘密情報ではない（Firebase の設計上そうなっている）。
//   実際の防御は Realtime Database のセキュリティルール側で行う:
//   匿名認証必須（auth != null）+ trips/ 配下のみ読み書き可。

export const firebaseConfig = {
  apiKey: 'AIzaSyBHfOab9dBv6Brv8Dw4s7L_l2CRtZN1eqk',
  authDomain: 'miyako-trip-16960.firebaseapp.com',
  databaseURL: 'https://miyako-trip-16960-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'miyako-trip-16960',
  storageBucket: 'miyako-trip-16960.firebasestorage.app',
  messagingSenderId: '720160844033',
  appId: '1:720160844033:web:2b2b5abe943e2cc1241300',
}
