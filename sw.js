// 離線快取：
// - 開啟 App 時先連網抓最新版；超過 3 秒還沒回應（訊號差）就先用手機裡的版本，新版在背景下載，下次開啟生效
// - 同一次開啟的 css／js 跟著頁面用同一個來源，避免新舊檔案混用
const CACHE = 'mood-diary-v22';
const TIMEOUT = 3000;
const FOLLOW_MS = 10000;   // 頁面載入後這段時間內的其他檔案，跟隨頁面的來源
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './scenes.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

let mode = null;       // 'stale'：頁面用了快取；'fresh'：頁面用了網路
let modeUntil = 0;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 從網路抓並更新快取
// 注意：開啟頁面的請求（mode: navigate）不能用 fetch(req, {...}) 重送，會直接失敗，所以一律用網址重新發送
// 寫入快取用 waitUntil 包住，確保 service worker 不會在寫完前被系統關掉
function fromNetwork(req, e) {
  return fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
    }
    return res;
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const net = fromNetwork(req, e);
    const following = Date.now() < modeUntil;

    // 頁面（開啟 App）：網路與 3 秒計時賽跑
    if (req.mode === 'navigate') {
      if (!cached) return net;
      e.waitUntil(net.catch(() => {}));   // 就算先用快取，新版仍在背景下載
      let usedCache = false;
      const res = await Promise.race([
        net.catch(() => { usedCache = true; return cached; }),
        new Promise((r) => setTimeout(() => { usedCache = true; r(cached); }, TIMEOUT)),
      ]);
      mode = usedCache ? 'stale' : 'fresh';
      modeUntil = Date.now() + FOLLOW_MS;
      return res;
    }

    // 頁面用了快取 → 其他檔案也用快取，背景更新
    if (following && mode === 'stale' && cached) {
      e.waitUntil(net.catch(() => {}));
      return cached;
    }
    // 其他情況：等網路，失敗才用快取
    return net.catch(() => cached || Response.error());
  })());
});
