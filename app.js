'use strict';

/* ================= 設定與資料 ================= */
const STORAGE_KEY = 'mood-diary-v1';
const MOODS = [
  { v: 1, emoji: '😣', label: '很糟' },
  { v: 2, emoji: '😔', label: '不好' },
  { v: 3, emoji: '😐', label: '普通' },
  { v: 4, emoji: '🙂', label: '不錯' },
  { v: 5, emoji: '😄', label: '超棒' },
];
const DEFAULT_TAGS = ['工作', '學習', '家人', '朋友', '戀愛', '運動', '睡眠', '美食', '休閒', '旅行', '健康', '天氣'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && typeof d.entries === 'object') {
      return { entries: d.entries, customTags: Array.isArray(d.customTags) ? d.customTags : [] };
    }
  } catch (e) { /* 資料損毀或無法讀取時從空白開始 */ }
  return { entries: {}, customTags: [] };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    toast('儲存失敗，請檢查儲存空間');
    return false;
  }
}

/* ================= 工具函式 ================= */
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const moodOf = (v) => MOODS[v - 1];
const allTags = () => [...DEFAULT_TAGS, ...data.customTags];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const shortDate = (k) => { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };

/* ================= 狀態 ================= */
let data = load();
let curDate = todayKey();
let lastToday = curDate;
let calMonth = startOfMonth(new Date());
let range = 30;
let currentTab = 'today';

function relLabel(k) {
  const t = todayKey();
  if (k === t) return '今天';
  if (k === addDays(t, -1)) return '昨天';
  if (k === addDays(t, -2)) return '前天';
  return `星期${WEEK[parseKey(k).getDay()]}`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ================= 今天 ================= */
$('#moods').innerHTML = MOODS.map((m) => `
  <button class="mood" data-v="${m.v}" style="--c:var(--m${m.v})" aria-pressed="false" aria-label="${m.label}">
    <span class="face">${m.emoji}</span><span class="lbl">${m.label}</span>
  </button>`).join('');

function renderToday() {
  const e = data.entries[curDate];
  const d = parseKey(curDate);
  const isToday = curDate === todayKey();

  $('#dayLabel').textContent = relLabel(curDate);
  $('#dateLabel').textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${WEEK[d.getDay()]}`;
  $('#nextDay').disabled = curDate >= todayKey();
  $('#question').textContent = isToday ? '今天心情如何？' : '那天心情如何？';

  $$('#moods .mood').forEach((b) => {
    const on = !!e && e.mood === +b.dataset.v;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', on);
  });

  $('#details').classList.toggle('locked', !e);

  const sel = new Set(e ? e.tags : []);
  const tags = [...new Set([...allTags(), ...sel])];
  $('#tags').innerHTML = tags.map((t) =>
    `<button class="chip${sel.has(t) ? ' on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`
  ).join('') + '<button class="chip add" data-add="1">＋ 自訂</button>';

  const note = $('#note');
  if (document.activeElement !== note) note.value = e ? (e.note || '') : '';

  $('#saveStatus').textContent = e ? `已儲存 · ${fmtTime(e.t)}` : '先選一個心情，再補充細節';
  $('#deleteEntry').hidden = !e;
}

function setDate(k) {
  saveNote();
  curDate = k;
  renderToday();
}

$('#moods').addEventListener('click', (ev) => {
  const b = ev.target.closest('.mood');
  if (!b) return;
  const e = data.entries[curDate] || { tags: [], note: '' };
  e.mood = +b.dataset.v;
  e.t = Date.now();
  data.entries[curDate] = e;
  persist();
  renderToday();
});

$('#tags').addEventListener('click', (ev) => {
  const b = ev.target.closest('.chip');
  const e = data.entries[curDate];
  if (!b || !e) return;
  if (b.dataset.add) {
    const name = (prompt('新增標籤名稱（最多 10 個字）') || '').trim().slice(0, 10);
    if (!name) return;
    if (!allTags().includes(name)) data.customTags.push(name);
    if (!e.tags.includes(name)) e.tags.push(name);
  } else {
    const t = b.dataset.tag;
    const i = e.tags.indexOf(t);
    if (i >= 0) e.tags.splice(i, 1); else e.tags.push(t);
  }
  e.t = Date.now();
  persist();
  renderToday();
});

let noteTimer;
function saveNote() {
  clearTimeout(noteTimer);
  const e = data.entries[curDate];
  if (!e) return;
  const v = $('#note').value;
  if (v !== (e.note || '')) {
    e.note = v;
    e.t = Date.now();
    persist();
  }
  $('#saveStatus').textContent = `已儲存 · ${fmtTime(e.t)}`;
}
$('#note').addEventListener('input', () => {
  clearTimeout(noteTimer);
  $('#saveStatus').textContent = '編輯中…';
  noteTimer = setTimeout(saveNote, 600);
});
$('#note').addEventListener('blur', saveNote);

$('#deleteEntry').addEventListener('click', () => {
  if (!confirm('確定要刪除這天的紀錄嗎？')) return;
  clearTimeout(noteTimer);
  delete data.entries[curDate];
  persist();
  $('#note').value = '';
  renderToday();
  toast('已刪除');
});

$('#prevDay').addEventListener('click', () => setDate(addDays(curDate, -1)));
$('#nextDay').addEventListener('click', () => { if (curDate < todayKey()) setDate(addDays(curDate, 1)); });

/* ================= 日曆 ================= */
function entryCard(k, e) {
  const m = moodOf(e.mood);
  const d = parseKey(k);
  const tags = e.tags.length
    ? `<div class="tags">${e.tags.map((t) => `<span class="mini-tag">${esc(t)}</span>`).join('')}</div>` : '';
  const note = e.note && e.note.trim() ? `<div class="note">${esc(e.note.trim())}</div>` : '';
  return `<button class="entry" data-k="${k}" style="--c:var(--m${e.mood})">
    <span class="em">${m.emoji}</span>
    <span class="body">
      <span class="top"><span class="date">${d.getMonth() + 1} 月 ${d.getDate()} 日 · 週${WEEK[d.getDay()]}</span><span class="lbl">${m.label}</span></span>
      ${tags}${note}
    </span>
  </button>`;
}

function renderCalendar() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const now = new Date();
  $('#calTitle').textContent = `${y} 年 ${m + 1} 月`;
  $('#calNext').disabled = y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth());

  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();
  const list = [];
  let h = WEEK.map((w) => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < lead; i++) h += '<div></div>';
  for (let d = 1; d <= days; d++) {
    const k = keyOf(new Date(y, m, d));
    const e = data.entries[k];
    if (e) list.push([k, e]);
    const cls = `day${e ? ' has' : ''}${k === tk ? ' today' : ''}`;
    const style = e ? ` style="--c:var(--m${e.mood})"` : '';
    h += `<button class="${cls}" data-k="${k}"${style}${k > tk ? ' disabled' : ''}>
      <span class="n">${d}</span>${e ? `<span class="e">${moodOf(e.mood).emoji}</span>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = h;

  if (list.length) {
    const avg = list.reduce((s, [, e]) => s + e.mood, 0) / list.length;
    $('#monthSum').textContent = `本月紀錄 ${list.length} 天 · 平均 ${moodOf(Math.round(avg)).emoji} ${avg.toFixed(1)}`;
    $('#monthList').innerHTML = list.reverse().map(([k, e]) => entryCard(k, e)).join('');
  } else {
    $('#monthSum').textContent = '';
    $('#monthList').innerHTML = '<div class="empty"><span class="big">🌱</span>這個月還沒有紀錄</div>';
  }
}

function openDay(ev) {
  const b = ev.target.closest('[data-k]');
  if (!b || b.disabled) return;
  curDate = b.dataset.k;
  switchTab('today');
}
$('#calGrid').addEventListener('click', openDay);
$('#monthList').addEventListener('click', openDay);
$('#calPrev').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); });
$('#calNext').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); });

/* ================= 統計 ================= */
function currentStreak() {
  const tk = todayKey();
  let k = data.entries[tk] ? tk : addDays(tk, -1);
  let s = 0;
  while (data.entries[k]) { s++; k = addDays(k, -1); }
  return s;
}

function renderChart(keys, pts) {
  if (!pts.length) {
    return '<div class="empty"><span class="big">📈</span>開始紀錄後，這裡會出現你的心情曲線</div>';
  }
  const W = 340, H = 170, L = 26, R = 10, T = 12, B = 24;
  const n = keys.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1));
  const y = (v) => T + (5 - v) * (H - T - B) / 4;
  const r = n > 30 ? 2.6 : n > 7 ? 3.6 : 5;

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="心情趨勢圖">
    <defs><linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/>
      <stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/>
    </linearGradient></defs>`;
  for (let v = 1; v <= 5; v++) {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text x="0" y="${y(v) + 4}" style="font-size:12px">${moodOf(v).emoji}</text>`;
  }
  const P = pts.map((p) => [x(p.i), y(p.e.mood)]);
  if (P.length > 1) {
    // 平滑曲線（Catmull-Rom 轉 Bézier）
    let d = `M${P[0][0]},${P[0][1]}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      c1[1] = Math.min(Math.max(c1[1], T), H - B);
      c2[1] = Math.min(Math.max(c2[1], T), H - B);
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    const base = H - B;
    s += `<path d="${d} L${P[P.length - 1][0]},${base} L${P[0][0]},${base} Z" style="fill:url(#fillGrad);stroke:none"/>`;
    s += `<path class="line" d="${d}"/>`;
  }
  pts.forEach((p, i) => {
    s += `<circle cx="${P[i][0]}" cy="${P[i][1]}" r="${r}" style="fill:var(--m${p.e.mood});stroke:var(--surface);stroke-width:1.5"/>`;
  });
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  ticks.forEach((i, j) => {
    const anchor = ticks.length === 1 ? 'middle' : j === 0 ? 'start' : j === ticks.length - 1 ? 'end' : 'middle';
    s += `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${anchor}">${shortDate(keys[i])}</text>`;
  });
  return s + '</svg>';
}

function renderStats() {
  $$('#rangeSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.r === range));
  const tk = todayKey();
  const keys = [];
  for (let i = range - 1; i >= 0; i--) keys.push(addDays(tk, -i));
  const pts = keys.map((k, i) => ({ k, i, e: data.entries[k] })).filter((p) => p.e);
  const n = pts.length;
  const avg = n ? pts.reduce((s, p) => s + p.e.mood, 0) / n : 0;

  $('#kpis').innerHTML = `
    <div class="kpi"><div class="v">${n ? `${moodOf(Math.round(avg)).emoji} ${avg.toFixed(1)}` : '—'}</div><div class="k">平均心情</div></div>
    <div class="kpi"><div class="v">${n}<small>/ ${range}</small></div><div class="k">紀錄天數</div></div>
    <div class="kpi"><div class="v">${currentStreak()}<small>天</small></div><div class="k">連續紀錄</div></div>`;

  $('#chart').innerHTML = renderChart(keys, pts);

  const cnt = [0, 0, 0, 0, 0];
  pts.forEach((p) => cnt[p.e.mood - 1]++);
  const max = Math.max(1, ...cnt);
  $('#dist').innerHTML = [...MOODS].reverse().map((m) => `
    <div class="dist-row" style="--c:var(--m${m.v})">
      <span>${m.emoji}</span><span>${m.label}</span>
      <span class="bar"><i style="width:${(cnt[m.v - 1] / max) * 100}%"></i></span>
      <span class="cnt">${cnt[m.v - 1]}</span>
    </div>`).join('');

  const tagMap = {};
  pts.forEach((p) => p.e.tags.forEach((t) => {
    tagMap[t] = tagMap[t] || { c: 0, s: 0 };
    tagMap[t].c++;
    tagMap[t].s += p.e.mood;
  }));
  const tagList = Object.entries(tagMap).sort((a, b) => b[1].c - a[1].c).slice(0, 8);
  $('#tagStats').innerHTML = tagList.length
    ? tagList.map(([t, v]) => {
      const a = v.s / v.c;
      return `<div class="tag-row"><span class="name">${esc(t)}</span><span class="meta">${v.c} 次 · 平均 ${a.toFixed(1)}</span><span>${moodOf(Math.round(a)).emoji}</span></div>`;
    }).join('')
    : '<div class="empty">為紀錄加上標籤，就能看到哪些事情影響你的心情</div>';
}

$('#rangeSeg').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  range = +b.dataset.r;
  renderStats();
});

/* ================= 設定 ================= */
const STYLE_KEY = 'mood-style';

function getStyle() {
  let s = 'warm';
  try { s = localStorage.getItem(STYLE_KEY) || 'warm'; } catch (e) { /* 讀不到就用預設 */ }
  return Scenes.list.some((t) => t.id === s) ? s : 'warm';
}

function applyStyle(id) {
  const root = document.documentElement;
  if (id === 'warm') delete root.dataset.style;
  else root.dataset.style = id;
  $('#bgfx').innerHTML = Scenes.svg(id);
  const sky = getComputedStyle(root).getPropertyValue('--sky1').trim();
  $('meta[name="theme-color"]').setAttribute('content', sky || '#FFFBF7');
  $$('#themeGrid .theme-card').forEach((b) => b.classList.toggle('on', b.dataset.s === id));
}

$('#themeGrid').innerHTML = Scenes.list.map((t) => `
  <button class="theme-card" data-s="${t.id}" data-style="${t.id}" aria-label="${t.name}主題">
    <span class="tc-scene">${Scenes.svg(t.id)}</span>
    <span class="tc-name"><i></i>${t.name}</span>
    <span class="tc-desc">${t.desc}</span>
  </button>`).join('');

$('#themeGrid').addEventListener('click', (ev) => {
  const b = ev.target.closest('.theme-card');
  if (!b) return;
  try { localStorage.setItem(STYLE_KEY, b.dataset.s); } catch (e) { /* 無法儲存時僅本次生效 */ }
  applyStyle(b.dataset.s);
  toast(`已切換為「${b.querySelector('.tc-name').textContent.trim()}」`);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyStyle(getStyle()));

function renderSettings() {
  $('#customTags').innerHTML = data.customTags.length
    ? data.customTags.map((t, i) => `<button class="chip" data-i="${i}">${esc(t)}<span class="x">✕</span></button>`).join('')
    : '<span class="note-text" style="padding:0">在「今天」頁按「＋ 自訂」即可新增標籤</span>';
  const total = Object.keys(data.entries).length;
  $('#statsLine').textContent = `目前共有 ${total} 筆紀錄 · 版本 1.2`;
}

$('#customTags').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-i]');
  if (!b) return;
  const t = data.customTags[+b.dataset.i];
  if (!confirm(`移除標籤「${t}」？（過去的紀錄仍會保留此標籤）`)) return;
  data.customTags.splice(+b.dataset.i, 1);
  persist();
  renderSettings();
});

$('#btnExport').addEventListener('click', async () => {
  const json = JSON.stringify({ app: 'mood-diary', version: 1, exported: new Date().toISOString(), ...data }, null, 2);
  const name = `心情備份-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '心情日記備份' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

$('#btnImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || typeof d.entries !== 'object') throw new Error('bad');
    let added = 0;
    for (const [k, e] of Object.entries(d.entries)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !e || !(e.mood >= 1 && e.mood <= 5)) continue;
      const cur = data.entries[k];
      if (!cur || (e.t || 0) > (cur.t || 0)) {
        data.entries[k] = {
          mood: Math.round(e.mood),
          tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
          note: String(e.note || ''),
          t: Number(e.t) || Date.now(),
        };
        added++;
      }
    }
    if (Array.isArray(d.customTags)) {
      d.customTags.map(String).forEach((t) => { if (!allTags().includes(t)) data.customTags.push(t); });
    }
    persist();
    renderSettings();
    toast(`已匯入 ${added} 筆紀錄`);
  } catch (e) {
    toast('檔案格式不正確');
  }
});

$('#btnClear').addEventListener('click', () => {
  if (!confirm('確定要清除所有紀錄嗎？')) return;
  if (!confirm('此動作無法復原，建議先匯出備份。仍要繼續？')) return;
  data = { entries: {}, customTags: [] };
  persist();
  renderSettings();
  toast('已清除所有資料');
});

/* ================= 分頁切換 ================= */
const renderers = { today: renderToday, calendar: renderCalendar, stats: renderStats, settings: renderSettings };

function switchTab(name) {
  saveNote();
  currentTab = name;
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  renderers[name]();
  window.scrollTo(0, 0);
}

$$('.tab').forEach((t) => t.addEventListener('click', () => {
  if (t.dataset.tab === 'today' && currentTab === 'today') setDate(todayKey());
  else switchTab(t.dataset.tab);
}));

// App 從背景回來時：若跨日則自動切到新的一天
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveNote(); return; }
  const tk = todayKey();
  if (tk !== lastToday) {
    if (curDate === lastToday) curDate = tk;
    lastToday = tk;
    renderers[currentTab]();
  }
});
window.addEventListener('pagehide', saveNote);

/* ================= 啟動 ================= */
applyStyle(getStyle());
renderToday();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
