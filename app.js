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

// 精確版（參照《情緒癮頭日記》）的欄位；舊資料沒有這些欄位也能正常使用
const STRENGTHS = ['體貼', '溫暖', '獨立', '敏感', '有覺察力', '負責', '勇敢'];
const SCALES = ['score', 'craving', 'stress'];   // 0–10 分
const TEXTS = ['stressNote', 'kind', 'grateful'];
// 心情指數 0–10 與 5 級心情互換：0–1→1、2–3→2、4–6→3、7–8→4、9–10→5
const scoreToMood = (s) => Math.min(5, Math.round(s / 2.5) + 1);
const moodToScore = (m) => [0, 3, 5, 8, 10][m - 1];
const blank = () => ({ entries: {}, customTags: [], weeks: {}, habit: '' });

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && typeof d.entries === 'object') {
      return {
        entries: d.entries,
        customTags: Array.isArray(d.customTags) ? d.customTags : [],
        weeks: d.weeks && typeof d.weeks === 'object' ? d.weeks : {},
        habit: typeof d.habit === 'string' ? d.habit : '',
      };
    }
  } catch (e) { /* 資料損毀或無法讀取時從空白開始 */ }
  return blank();
}

// 匯入時清理一筆紀錄（含精確版欄位）
function cleanEntry(e) {
  const o = {
    mood: Math.round(e.mood),
    tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
    note: String(e.note || ''),
    t: Number(e.t) || Date.now(),
  };
  SCALES.forEach((f) => { if (e[f] >= 0 && e[f] <= 10) o[f] = Math.round(e[f]); });
  TEXTS.forEach((f) => { if (e[f]) o[f] = String(e[f]); });
  if (e.exercise > 0) o.exercise = Math.min(600, Math.round(e.exercise));
  if (Array.isArray(e.strengths)) o.strengths = e.strengths.map(String);
  return o;
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
// 一週從星期一開始（與紙本日記相同）
const mondayOf = (k) => addDays(k, -((parseKey(k).getDay() + 6) % 7));
const LAYOUT_KEY = 'mood-layout';
const isPrecise = () => document.documentElement.dataset.layout === 'precise';
// 0–10 分的顏色：低分偏冷、高分偏暖（壓力、癮頭則相反）
const scoreColor = (v, invert) => `var(--m${scoreToMood(invert ? 10 - v : v)})`;

/* ================= 狀態 ================= */
let data = load();
let curDate = todayKey();
let lastToday = curDate;
let calMonth = startOfMonth(new Date());
let range = 30;
let currentTab = 'today';
let weekStart = mondayOf(curDate);

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

  renderPrecise(e, isToday);

  $('#saveStatus').textContent = e ? `已儲存 · ${fmtTime(e.t)}` : (isPrecise() ? '先打心情指數，再補充細節' : '先選一個心情，再補充細節');
  $('#deleteEntry').hidden = !e;
}

/* ----- 精確版：今天頁 ----- */
$$('[data-scale]').forEach((el) => {
  const invert = el.dataset.scale !== 'score';
  el.innerHTML = Array.from({ length: 11 }, (_, v) =>
    `<button data-v="${v}" style="--c:${scoreColor(v, invert)}" aria-label="${v} 分">${v}</button>`).join('');
});
$('#exQuick').innerHTML = [10, 20, 30, 60].map((m) => `<button class="chip" data-m="${m}">${m}</button>`).join('');

// 兩種版面都會填入欄位值，切換版面時才不會把未顯示的欄位存成空白
function renderPrecise(e, isToday) {
  if (isPrecise()) $('#question').textContent = isToday ? '今天的心情日記' : '那天的心情日記';
  $('#noteTitle').textContent = isPrecise() ? '其他好幫手（睡眠、飲食、鼓勵自己的話）' : '寫點什麼';
  $$('[data-scale]').forEach((el) => {
    const v = e ? e[el.dataset.scale] : undefined;
    el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', v != null && +b.dataset.v === v));
  });
  $('#scoreFace').textContent = e ? moodOf(e.mood).emoji : '';
  $$('#details [data-field]').forEach((el) => {
    if (document.activeElement !== el) el.value = e && e[el.dataset.field] != null ? e[el.dataset.field] : '';
  });
  const habit = $('#habit');
  if (document.activeElement !== habit) habit.value = data.habit || '';
  const st = new Set(e && e.strengths ? e.strengths : []);
  $('#strengths').innerHTML = STRENGTHS.map((s) =>
    `<button class="chip${st.has(s) ? ' on' : ''}" data-s="${s}">${s}</button>`).join('');
  const w = data.weeks[mondayOf(curDate)];
  const parts = w ? [['本週小目標', w.goal], ['獎勵自己', w.reward]].filter(([, v]) => v) : [];
  $('#weekGoal').hidden = !parts.length;
  $('#weekGoal').innerHTML = parts.map(([k, v]) => `${k}：<b>${esc(v)}</b>`).join('<br>');
}

function touch() {
  const e = data.entries[curDate];
  e.t = Date.now();
  persist();
  renderToday();
}

// 心情指數：沒有紀錄時會建立一筆，並同步換算成 5 級心情
$('#scoreScale').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const e = data.entries[curDate] || { tags: [], note: '' };
  e.score = +b.dataset.v;
  e.mood = scoreToMood(e.score);
  data.entries[curDate] = e;
  touch();
});
// 癮頭／壓力指數：再點一次同一分數可取消
$('#details').addEventListener('click', (ev) => {
  const e = data.entries[curDate];
  if (!e) return;
  const sb = ev.target.closest('[data-scale] button');
  if (sb) {
    const f = sb.closest('[data-scale]').dataset.scale;
    if (e[f] === +sb.dataset.v) delete e[f]; else e[f] = +sb.dataset.v;
    return touch();
  }
  const sc = ev.target.closest('#strengths .chip');
  if (sc) {
    const s = new Set(e.strengths || []);
    if (s.has(sc.dataset.s)) s.delete(sc.dataset.s); else s.add(sc.dataset.s);
    e.strengths = [...s];
    return touch();
  }
  const q = ev.target.closest('#exQuick .chip');
  if (q) {
    e.exercise = +q.dataset.m;
    return touch();
  }
});

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
  // 若有精確版的心情指數且與新心情不符，換成對應分數
  if (e.score != null && scoreToMood(e.score) !== e.mood) e.score = moodToScore(e.mood);
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
// 儲存所有文字欄位（日記、精確版的文字與運動時間、壞習慣）
function saveNote() {
  clearTimeout(noteTimer);
  const h = $('#habit').value.trim();
  if (isPrecise() && h !== (data.habit || '')) { data.habit = h; persist(); }
  const e = data.entries[curDate];
  if (!e) return;
  let changed = false;
  const v = $('#note').value;
  if (v !== (e.note || '')) { e.note = v; changed = true; }
  if (isPrecise()) {
    $$('#details [data-field]').forEach((el) => {
      const f = el.dataset.field;
      let nv = el.value.trim();
      if (f === 'exercise') nv = nv === '' ? undefined : Math.max(0, Math.min(600, Math.round(+nv) || 0)) || undefined;
      else nv = nv || undefined;
      if (nv !== e[f]) {
        if (nv === undefined) delete e[f]; else e[f] = nv;
        changed = true;
      }
    });
  }
  if (changed) { e.t = Date.now(); persist(); }
  $('#saveStatus').textContent = `已儲存 · ${fmtTime(e.t)}`;
}
$$('#note, #habit, #details [data-field]').forEach((el) => {
  el.addEventListener('input', () => {
    clearTimeout(noteTimer);
    $('#saveStatus').textContent = '編輯中…';
    noteTimer = setTimeout(saveNote, 600);
  });
  el.addEventListener('blur', saveNote);
});

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
  let pm = '';
  if (isPrecise()) {
    const p = [['心情', e.score], ['癮頭', e.craving], ['壓力', e.stress]].filter(([, v]) => v != null).map(([n, v]) => `${n} ${v}`);
    if (e.exercise) p.push(`運動 ${e.exercise} 分`);
    if (e.grateful) p.push(`感激：${esc(e.grateful)}`);
    if (p.length) pm = `<span class="pm">${p.join(' · ')}</span>`;
  }
  return `<button class="entry" data-k="${k}" style="--c:var(--m${e.mood})">
    <span class="em">${m.emoji}</span>
    <span class="body">
      <span class="top"><span class="date">${d.getMonth() + 1} 月 ${d.getDate()} 日 · 週${WEEK[d.getDay()]}</span><span class="lbl">${m.label}</span></span>
      ${pm}${tags}${note}
    </span>
  </button>`;
}

/* ----- 精確版：週表（參照日記第 2 頁） ----- */
const WK_ROWS = [
  ['心情', (e) => e.score != null ? e.score : '', true],
  ['癮頭', (e) => e.craving != null ? e.craving : ''],
  ['壓力', (e) => e.stress != null ? e.stress : ''],
  ['運動', (e) => e.exercise || ''],
  ['溫柔', (e) => e.kind ? '✓' : ''],
  ['感激', (e) => e.grateful ? '✓' : ''],
];

function renderWeek() {
  if (!isPrecise()) return;
  const tk = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const a = parseKey(days[0]), b = parseKey(days[6]);
  $('#wkTitle').textContent = `${a.getMonth() + 1}/${a.getDate()} – ${b.getMonth() + 1}/${b.getDate()}`;
  $('#wkNext').disabled = days[6] >= tk;
  let h = '<div></div>' + days.map((k, i) =>
    `<button class="wh${k === tk ? ' today' : ''}" data-k="${k}"${k > tk ? ' disabled' : ''}>${WEEK[(i + 1) % 7]}<small>${parseKey(k).getDate()}</small></button>`).join('');
  WK_ROWS.forEach(([name, fn, isMood]) => {
    h += `<div class="rl">${name}</div>`;
    days.forEach((k, i) => {
      const e = data.entries[k];
      const v = e ? fn(e) : '';
      const cls = `c${i >= 5 ? ' we' : ''}${isMood && e ? ' mood' : ''}`;
      const st = isMood && e ? ` style="--c:var(--m${e.mood})"` : '';
      h += `<button class="${cls}" data-k="${k}"${st}${k > tk ? ' disabled' : ''}>${v}</button>`;
    });
  });
  $('#wkGrid').innerHTML = h;
  const w = data.weeks[weekStart] || {};
  $$('[data-wk]').forEach((el) => { if (document.activeElement !== el) el.value = w[el.dataset.wk] || ''; });
  weekShown = weekStart;
}

// 只有週表輸入框已載入「這一週」的內容時才儲存，避免把尚未顯示的空白欄位存回去
let weekShown = null;
function saveWeek() {
  clearTimeout(weekTimer);
  if (!isPrecise() || weekShown !== weekStart) return;
  const w = {};
  $$('[data-wk]').forEach((el) => { const v = el.value.trim(); if (v) w[el.dataset.wk] = v; });
  const old = JSON.stringify(data.weeks[weekStart] || {});
  if (JSON.stringify(w) === old) return;
  if (Object.keys(w).length) data.weeks[weekStart] = w; else delete data.weeks[weekStart];
  persist();
}
let weekTimer;
$$('[data-wk]').forEach((el) => {
  el.addEventListener('input', () => { clearTimeout(weekTimer); weekTimer = setTimeout(saveWeek, 600); });
  el.addEventListener('blur', saveWeek);
});
$('#wkGrid').addEventListener('click', openDay);
$('#wkPrev').addEventListener('click', () => { saveWeek(); weekStart = addDays(weekStart, -7); renderWeek(); });
$('#wkNext').addEventListener('click', () => { saveWeek(); weekStart = addDays(weekStart, 7); renderWeek(); });

function renderCalendar() {
  renderWeek();
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

  if (isPrecise()) renderPreciseStats(keys, pts);

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

/* ----- 精確版：統計 ----- */
const P_SERIES = [
  ['score', '心情', 'var(--accent)'],
  ['craving', '癮頭', 'var(--m5)'],
  ['stress', '壓力', 'var(--m1)'],
];

function renderPreciseStats(keys, pts) {
  const avgOf = (f) => {
    const v = pts.filter((p) => p.e[f] != null).map((p) => p.e[f]);
    return v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) : '—';
  };
  const exDays = pts.filter((p) => p.e.exercise > 0);
  const exMin = exDays.reduce((s, p) => s + p.e.exercise, 0);
  const cnt = (f) => pts.filter((p) => p.e[f]).length;
  const k = (v, label, unit = '') => `<div><b>${v}${unit ? `<small> ${unit}</small>` : ''}</b><span>${label}</span></div>`;
  $('#pkpis').innerHTML =
    k(avgOf('score'), '平均心情', '/10') + k(avgOf('craving'), '平均癮頭', '/10') + k(avgOf('stress'), '平均壓力', '/10') +
    k(exMin, `運動 ${exDays.length} 天`, '分') + k(cnt('kind'), '溫柔的事', '天') + k(cnt('grateful'), '感激紀錄', '天');

  const has = pts.some((p) => SCALES.some((f) => p.e[f] != null));
  if (!has) { $('#pchart').innerHTML = '<div class="empty">在精確版記下心情、癮頭、壓力指數後，這裡會出現趨勢</div>'; return; }
  const W = 340, H = 150, L = 22, R = 10, T = 10, B = 22;
  const n = keys.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1));
  const y = (v) => T + (10 - v) * (H - T - B) / 10;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="指標趨勢圖">`;
  [0, 5, 10].forEach((v) => {
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="0" y="${y(v) + 4}">${v}</text>`;
  });
  P_SERIES.forEach(([f, , c]) => {
    const P = pts.filter((p) => p.e[f] != null).map((p) => [x(p.i), y(p.e[f])]);
    if (P.length > 1) s += `<path d="M${P.map((p) => p.join(',')).join(' L')}" style="stroke:${c};stroke-width:2;fill:none"/>`;
    P.forEach(([cx, cy]) => { s += `<circle cx="${cx}" cy="${cy}" r="${n > 30 ? 2 : 3}" style="fill:${c};stroke:none"/>`; });
  });
  s += `<text class="axis" x="${x(0)}" y="${H - 4}">${shortDate(keys[0])}</text><text class="axis" x="${x(n - 1)}" y="${H - 4}" text-anchor="end">${shortDate(keys[n - 1])}</text>`;
  $('#pchart').innerHTML = s + '</svg><div class="legend">' +
    P_SERIES.map(([, name, c]) => `<span><i style="background:${c}"></i>${name}</span>`).join('') + '</div>';
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
  let s = Scenes.DEFAULT;
  try { s = localStorage.getItem(STYLE_KEY) || Scenes.DEFAULT; } catch (e) { /* 讀不到就用預設 */ }
  // 已移除的主題（暖陽、山川）或無效值 → 回到預設（藍天白雲）
  return Scenes.list.some((t) => t.id === s) ? s : Scenes.DEFAULT;
}

function applyStyle(id) {
  const root = document.documentElement;
  root.dataset.style = id;
  $('#bgfx').innerHTML = Scenes.svg(id);
  const sky = getComputedStyle(root).getPropertyValue('--sky1').trim();
  $('meta[name="theme-color"]').setAttribute('content', sky || '#A7D6FA');
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

/* ----- 版面切換 ----- */
const LAYOUT_DESC = {
  simple: '簡略版：選 5 種心情、標籤和日記，快速記錄。',
  precise: '精確版：參照《情緒癮頭日記》，記錄 0–10 分的心情／癮頭／壓力指數、運動時間、溫柔的事、感激的人事物與自己的優點，日曆頁另有週表與本週目標。',
};
function renderLayout() {
  const l = isPrecise() ? 'precise' : 'simple';
  $$('#layoutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.l === l));
  $('#layoutDesc').textContent = LAYOUT_DESC[l];
}
$('#layoutSeg').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b || b.dataset.l === (isPrecise() ? 'precise' : 'simple')) return;
  saveNote();
  document.documentElement.dataset.layout = b.dataset.l;
  try { localStorage.setItem(LAYOUT_KEY, b.dataset.l); } catch (e) { /* 無法儲存時僅本次生效 */ }
  renderLayout();
  toast(`已切換為「${b.textContent}」，資料兩種版面共用`);
});

function renderSettings() {
  renderLayout();
  $('#customTags').innerHTML = data.customTags.length
    ? data.customTags.map((t, i) => `<button class="chip" data-i="${i}">${esc(t)}<span class="x">✕</span></button>`).join('')
    : '<span class="note-text" style="padding:0">在「今天」頁按「＋ 自訂」即可新增標籤</span>';
  const last = getNum(BACKUP_KEY);
  const ago = last ? Math.floor((Date.now() - last) / DAY_MS) : -1;
  $('#exportSub').textContent = ago < 0 ? '尚未備份過 · 存成 JSON 檔，可存到「檔案」或 iCloud'
    : `上次備份：${ago === 0 ? '今天' : `${ago} 天前`}`;
  const total = Object.keys(data.entries).length;
  $('#statsLine').textContent = `目前共有 ${total} 筆紀錄 · 版本 1.14`;
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

/* ----- 備份與備份提醒 ----- */
// 上次備份時間另外存，不動到日記資料格式
const BACKUP_KEY = 'mood-last-backup';
const SNOOZE_KEY = 'mood-backup-snooze';
const REMIND_DAYS = 30;
const DAY_MS = 86400000;
const getNum = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } };
const setNum = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* 無法儲存就略過 */ } };

// 距離上次備份幾天；從沒備份過就從最早一筆紀錄算起；沒有紀錄回傳 null
function daysSinceBackup() {
  const last = getNum(BACKUP_KEY);
  if (last) return Math.floor((Date.now() - last) / DAY_MS);
  const keys = Object.keys(data.entries).sort();
  if (!keys.length) return null;
  return Math.floor((Date.now() - parseKey(keys[0]).getTime()) / DAY_MS);
}

function renderBackupTip() {
  const d = daysSinceBackup();
  const show = d != null && d >= REMIND_DAYS && Date.now() > getNum(SNOOZE_KEY);
  $('#backupTip').hidden = !show;
  if (show) $('#backupTipText').textContent = getNum(BACKUP_KEY) ? `已經 ${d} 天沒備份了` : '還沒有備份過紀錄';
}

async function doExport() {
  const json = JSON.stringify({ app: 'mood-diary', version: 1, exported: new Date().toISOString(), ...data }, null, 2);
  const name = `心情備份-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  let ok = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '心情日記備份' });
      ok = true;
    } catch (e) {
      if (e.name === 'AbortError') return false;   // 使用者取消，不算備份
    }
  }
  if (!ok) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  setNum(BACKUP_KEY, Date.now());
  renderBackupTip();
  if (currentTab === 'settings') renderSettings();
  toast('已匯出備份');
  return true;
}

$('#btnExport').addEventListener('click', doExport);
$('#tipBackup').addEventListener('click', doExport);
$('#tipLater').addEventListener('click', () => {
  setNum(SNOOZE_KEY, Date.now() + 7 * DAY_MS);   // 7 天後再提醒
  renderBackupTip();
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
        data.entries[k] = cleanEntry(e);
        added++;
      }
    }
    if (Array.isArray(d.customTags)) {
      d.customTags.map(String).forEach((t) => { if (!allTags().includes(t)) data.customTags.push(t); });
    }
    if (d.weeks && typeof d.weeks === 'object') {
      for (const [k, w] of Object.entries(d.weeks)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !w || data.weeks[k]) continue;
        const o = {};
        ['goal', 'reward', 'msg'].forEach((f) => { if (w[f]) o[f] = String(w[f]); });
        data.weeks[k] = o;
      }
    }
    if (!data.habit && typeof d.habit === 'string') data.habit = d.habit;
    weekShown = null;
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
  data = blank();
  weekShown = null;
  persist();
  renderSettings();
  toast('已清除所有資料');
});

/* ================= 分頁切換 ================= */
const renderers = { today: renderToday, calendar: renderCalendar, stats: renderStats, settings: renderSettings };

function switchTab(name) {
  saveNote();
  saveWeek();
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
  if (document.hidden) { saveNote(); saveWeek(); return; }
  const tk = todayKey();
  if (tk !== lastToday) {
    if (curDate === lastToday) curDate = tk;
    lastToday = tk;
    renderers[currentTab]();
  }
});
// 關閉 App 前把還在等待儲存的日記與週目標存起來
window.addEventListener('pagehide', () => { saveNote(); saveWeek(); });

/* ================= 安裝引導 ================= */
// iPhone 不允許網頁自己加入主畫面，只能一步步教：
// - 在 LINE 等 App 內建瀏覽器：先自動改用 Safari 開（LINE 認得 openExternalBrowser=1），不行就教「用 Safari 開啟」
// - 在 Safari、尚未加入主畫面：教「分享 → 加入主畫面 → 新增」，箭頭指向分享按鈕（Safari 26 起在「⋯」裡）
// - 在 Chrome 等其他瀏覽器（手機預設瀏覽器不是 Safari 時，LINE 會用它開）：按鈕直接叫出 Safari，或在原瀏覽器加入主畫面
// 預覽用：網址加 ?guide=safari／safari26／line／chrome
const SHARE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/></svg>';
const MENU_SVG = '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg>';
const APP_URL ='https://roychensc.github.io/mood/';

function initInstallGuide() {
  const ua = navigator.userAgent;
  const params = new URLSearchParams(location.search);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const ios = /iPhone|iPod/.test(ua);
  const isLine = /\bLine\//.test(ua);
  const inApp = isLine || /FBAN|FBAV|Instagram|MicroMessenger/.test(ua);
  const ver = Number((ua.match(/Version\/(\d+)/) || [])[1]) || 0;
  let mode = params.get('guide');
  if (!mode) {
    if (standalone || !ios) return;
    let later = false;
    try { later = sessionStorage.getItem('mood-guide-later') === '1'; } catch (e) { /* 略過 */ }
    if (later) return;
    mode = inApp ? 'line' : /CriOS|EdgiOS|FxiOS/.test(ua) ? 'chrome' : ver >= 26 ? 'safari26' : 'safari';
  }

  // LINE：自動改用 Safari 開，只試一次避免一直重新整理
  if (mode === 'line' && isLine && !params.has('openExternalBrowser')) {
    let tried = false;
    try { tried = sessionStorage.getItem('mood-ext-tried') === '1'; sessionStorage.setItem('mood-ext-tried', '1'); } catch (e) { tried = true; }
    if (!tried) { location.replace(APP_URL + '?openExternalBrowser=1'); return; }
  }

  const STEPS = {
    line: ['點畫面<b>右上角或右下角的「⋯」</b>', '選<b>「用 Safari 開啟」</b>或<b>「以瀏覽器開啟」</b>', '打開後，照畫面的說明加到桌面'],
    // Chrome／Edge／Firefox（iOS 16.4 起也能加入主畫面）：手機預設瀏覽器不是 Safari 時，LINE 會用它們開
    chrome: [`點網址旁邊的${SHARE_SVG}<b>「分享」</b>`, '往上滑，點<b>「加入主畫面」</b>', '點右上角<b>「新增」</b>或<b>「加入」</b>'],
    safari: [`點最下面中間的${SHARE_SVG}<b>「分享」</b>`, '往上滑，點<b>「加入主畫面」</b>', '點右上角<b>「新增」</b>'],
    // Safari 26：網址列左邊的「☰」是選單（有些設定是右下角的「⋯」）
    safari26: [`點下面網址<b>左邊的${MENU_SVG}</b><small>沒有的話，點右下角「⋯」</small>`,`點${SHARE_SVG}<b>「分享」</b>`, '往上滑，點<b>「加入主畫面」</b>', '點右上角<b>「新增」</b>或<b>「加入」</b>'],
  };
  if (!STEPS[mode]) return;
  const notSafari = mode === 'line' || mode === 'chrome';
  $('#igTitle').innerHTML = notSafari ? '請改用 Safari 打開' : '把心情日記<br>放到手機桌面';
  $('#igSteps').innerHTML = STEPS[mode].map((t) => `<li><span>${t}</span></li>`).join('');
  $('#igSafari').hidden = !notSafari;
  $('#igLead').hidden = !notSafari;
  const arrow = $('#igArrow');
  arrow.setAttribute('class', 'ig-arrow ' + (mode === 'safari' ? 'center' : 'menu'));   // SVG 不能用 className
  arrow.toggleAttribute('hidden', notSafari);   // LINE、Chrome 的按鈕位置不固定，不畫箭頭
  $('#installGuide').hidden = false;

  $('#igLater').addEventListener('click', () => {
    $('#installGuide').hidden = true;
    try { sessionStorage.setItem('mood-guide-later', '1'); } catch (e) { /* 略過 */ }
  });
}

/* ================= 啟動 ================= */
applyStyle(getStyle());
renderToday();
renderBackupTip();
initInstallGuide();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
