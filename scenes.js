'use strict';
/* 主題風景：以 SVG 繪製，顏色全部取自 CSS 變數（--far / --mid / --near …） */
const Scenes = (() => {
  const F = (v, extra = '') => `style="fill:var(--${v})${extra}"`;
  const n1 = (v) => v.toFixed(1);

  // 固定種子的亂數，確保每次畫出的風景都一樣
  function rng(seed) {
    let s = seed;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  }

  const hill = (d, v) => `<path d="${d}" ${F(v)}/>`;
  const sun = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r * 1.9}" ${F('sun', ';opacity:.22')}/><circle cx="${x}" cy="${y}" r="${r}" ${F('sun')}/>`;
  const cloud = (x, y, s) =>
    `<g transform="translate(${x} ${y}) scale(${s})" ${F('cloud', ';opacity:.92')}><ellipse cx="0" cy="0" rx="26" ry="9"/><ellipse cx="-10" cy="-6" rx="12" ry="9"/><ellipse cx="8" cy="-9" rx="14" ry="11"/></g>`;
  const waves = (y, amp) =>
    `<path d="M-10 ${y} q10 -${amp} 20 0${' t20 0'.repeat(21)}" style="fill:none;stroke:#fff;stroke-width:1.5;opacity:.55"/>`;

  function pines(r, y, n, hMin, hMax, v) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (420 / n) - 10 + (r() - 0.5) * 18;
      const h = hMin + r() * (hMax - hMin);
      const w = h * 0.3;
      s += `<path d="M${n1(x)} ${n1(y - h)} L${n1(x - w * 0.7)} ${n1(y - h * 0.45)} H${n1(x - w * 0.35)} L${n1(x - w)} ${y} H${n1(x + w)} L${n1(x + w * 0.35)} ${n1(y - h * 0.45)} H${n1(x + w * 0.7)}Z" ${F(v)}/>`;
    }
    return s;
  }

  function ridge(r, base, n, hMin, hMax, v, cap) {
    const step = 440 / n;
    const pts = [[-20, base - r() * hMin * 0.4]];
    for (let i = 0; i < n; i++) {
      const x0 = -20 + step * i;
      pts.push([x0 + step * (0.35 + r() * 0.3), base - (hMin + r() * (hMax - hMin))]);
      pts.push([x0 + step, base - r() * hMin * 0.4]);
    }
    let s = `<path d="M${pts.map((p) => `${n1(p[0])} ${n1(p[1])}`).join(' L')} L420 200 L-20 200Z" ${F(v)}/>`;
    if (cap) {
      for (let i = 1; i < pts.length - 1; i += 2) {
        const [ax, ay] = pts[i], [lx, ly] = pts[i - 1], [rx, ry] = pts[i + 1];
        const t = 0.28;
        const L = [ax + (lx - ax) * t, ay + (ly - ay) * t];
        const R = [ax + (rx - ax) * t, ay + (ry - ay) * t];
        const my = (L[1] + R[1]) / 2;
        s += `<path d="M${n1(ax)} ${n1(ay)} L${n1(R[0])} ${n1(R[1])} L${n1(ax + (R[0] - ax) * 0.4)} ${n1(my + 5)} L${n1(ax - (ax - L[0]) * 0.15)} ${n1(my - 1)} L${n1(L[0])} ${n1(L[1])}Z" ${F('cap')}/>`;
      }
    }
    return s;
  }

  function stars(r, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const tw = r() < 0.45;
      s += `<circle cx="${n1(r() * 400)}" cy="${n1(r() * 230)}" r="${n1(0.5 + r() * 1.2)}"${tw ? ' class="twinkle"' : ''} style="fill:#fff;opacity:${(0.45 + r() * 0.55).toFixed(2)}${tw ? `;animation-delay:-${n1(r() * 3)}s` : ''}"/>`;
    }
    return s;
  }

  function flakes(r, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<circle class="flake" cx="${n1(r() * 400)}" cy="${n1(r() * 30)}" r="${n1(1 + r() * 1.6)}" style="fill:var(--flake);stroke:rgba(110,140,185,.35);stroke-width:.6;animation-duration:${n1(7 + r() * 7)}s;animation-delay:-${n1(r() * 12)}s"/>`;
    }
    return s;
  }

  // 楓樹：樹幹 + 多個圓形樹冠
  function maples(r, y, n, sMin, sMax, colors) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (420 / n) - 10 + (r() - 0.5) * 20;
      const k = sMin + r() * (sMax - sMin);
      const c = colors[Math.floor(r() * colors.length)];
      s += `<rect x="${n1(x - k * 0.08)}" y="${n1(y - k * 0.9)}" width="${n1(k * 0.16)}" height="${n1(k * 0.9)}" ${F('trunk')}/>`;
      s += `<g ${F(c)}><circle cx="${n1(x)}" cy="${n1(y - k * 1.15)}" r="${n1(k * 0.42)}"/><circle cx="${n1(x - k * 0.32)}" cy="${n1(y - k * 0.88)}" r="${n1(k * 0.32)}"/><circle cx="${n1(x + k * 0.33)}" cy="${n1(y - k * 0.9)}" r="${n1(k * 0.34)}"/></g>`;
    }
    return s;
  }

  // 飄落的楓葉
  function leaves(r, n) {
    let s = '';
    const cs = ['leaf1', 'leaf2', 'leaf3'];
    for (let i = 0; i < n; i++) {
      const x = r() * 400, y = r() * 30, k = 2.2 + r() * 1.8;
      s += `<path class="leaf" d="M${n1(x)} ${n1(y - k)} L${n1(x + k * 0.8)} ${n1(y)} L${n1(x)} ${n1(y + k)} L${n1(x - k * 0.8)} ${n1(y)}Z" style="fill:var(--${cs[i % 3]});animation-duration:${n1(8 + r() * 7)}s;animation-delay:-${n1(r() * 14)}s"/>`;
    }
    return s;
  }

  // 新月：外弧 + 內弧組成的路徑（不依賴背景色遮擋）
  // 陽光：大太陽 + 緩慢旋轉的光芒
  function sunburst(x, y, rad) {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      rays += `M${n1(x + Math.cos(a) * rad * 1.35)} ${n1(y + Math.sin(a) * rad * 1.35)} L${n1(x + Math.cos(a) * rad * 1.8)} ${n1(y + Math.sin(a) * rad * 1.8)} `;
    }
    return `<circle cx="${x}" cy="${y}" r="${rad * 2.6}" ${F('sun', ';opacity:.18')}/>`
      + `<path class="spin" d="${rays}" style="fill:none;stroke:var(--ray);stroke-width:3;stroke-linecap:round"/>`
      + `<circle cx="${x}" cy="${y}" r="${rad}" ${F('sun')}/>`;
  }

  // 向日葵：莖、葉、花瓣（虛線圓環）與花心
  function sunflower(x, y, k) {
    return `<path d="M${x} ${y} V${n1(y - 22 * k)}" style="fill:none;stroke:var(--stem);stroke-width:${n1(1.6 * k)}"/>`
      + `<ellipse cx="${n1(x + 4 * k)}" cy="${n1(y - 9 * k)}" rx="${n1(4 * k)}" ry="${n1(1.8 * k)}" ${F('stem')}/>`
      + `<circle cx="${x}" cy="${n1(y - 24 * k)}" r="${n1(5.2 * k)}" style="fill:none;stroke:var(--petal);stroke-width:${n1(3.4 * k)};stroke-dasharray:${n1(2.4 * k)} ${n1(1.2 * k)}"/>`
      + `<circle cx="${x}" cy="${n1(y - 24 * k)}" r="${n1(3.6 * k)}" ${F('seed')}/>`;
  }

  // 會左右緩慢飄動的雲（外層 g 負責動畫，避免覆蓋雲朵本身的 transform）
  const drift = (x, y, k, dur, delay) =>
    `<g class="drift" style="animation-duration:${dur}s;animation-delay:-${delay}s">${cloud(x, y, k)}</g>`;

  // 風箏：菱形 + 十字骨架 + 彎曲尾巴
  const kite = (x, y) =>
    `<g class="sway"><path d="M${x} ${y} L${x + 11} ${y + 13} L${x} ${y + 30} L${x - 11} ${y + 13}Z" ${F('kite')}/>`
    + `<path d="M${x} ${y} V${y + 30} M${x - 11} ${y + 13} H${x + 11}" style="fill:none;stroke:#fff;stroke-width:1;opacity:.8"/>`
    + `<path d="M${x} ${y + 30} q-7 9 0 17 t0 17" style="fill:none;stroke:var(--kite);stroke-width:1.3"/></g>`;

  const moon = (x, y, rad) =>
    `<circle cx="${x}" cy="${y}" r="${rad * 2.2}" ${F('moon', ';opacity:.1')}/><path d="M${x} ${y - rad} A${rad} ${rad} 0 1 0 ${x} ${y + rad} A${n1(rad * 0.42)} ${rad} 0 1 1 ${x} ${y - rad}Z" ${F('moon')}/>`;

  const cactus = (x, y) =>
    `<g ${F('cactus')}><rect x="${x - 5}" y="${y - 44}" width="10" height="46" rx="5"/><rect x="${x - 17}" y="${y - 30}" width="7" height="18" rx="3.5"/><rect x="${x - 17}" y="${y - 16}" width="14" height="6" rx="3"/><rect x="${x + 10}" y="${y - 36}" width="7" height="16" rx="3.5"/><rect x="${x + 3}" y="${y - 24}" width="14" height="6" rx="3"/></g>`;

  const barn = (x, y) =>
    `<g transform="translate(${x} ${y - 30})"><rect y="10" width="30" height="20" ${F('barn')}/><path d="M-3 12 L15 -1 L33 12Z" ${F('roof')}/><path d="M11 30 V19 H19 V30" style="fill:none;stroke:#fff;stroke-width:1.6;opacity:.85"/></g>`;
  const tree = (x, y) =>
    `<rect x="${x - 1.5}" y="${y - 12}" width="3" height="12" ${F('roof')}/><circle cx="${x}" cy="${y - 18}" r="9" ${F('tree')}/>`;
  function fence(x0, x1, y) {
    let s = `<path d="M${x0} ${y - 6} H${x1} M${x0} ${y - 2} H${x1}`;
    for (let x = x0; x <= x1; x += 13) s += ` M${x} ${y - 10} V${y + 2}`;
    return `${s}" style="fill:none;stroke:var(--roof);stroke-width:1.6;opacity:.55"/>`;
  }

  // 銀河：斜向的光帶（多層半透明橢圓）＋沿光帶密集的小星星
  function milkyWay(r) {
    let s = '<g transform="rotate(-24 200 110)">'
      + `<ellipse cx="200" cy="110" rx="300" ry="46" ${F('band1', ';opacity:.16')}/>`
      + `<ellipse cx="200" cy="110" rx="260" ry="26" ${F('band2', ';opacity:.2')}/>`
      + `<ellipse cx="210" cy="108" rx="190" ry="12" ${F('band1', ';opacity:.28')}/>`
      + '<ellipse cx="215" cy="107" rx="110" ry="5" style="fill:#fff;opacity:.22"/>'
      + `<ellipse cx="150" cy="114" rx="70" ry="4" ${F('far', ';opacity:.7')}/>`;  // 暗塵帶
    for (let i = 0; i < 90; i++) {
      const x = -60 + r() * 520, y = 110 + (r() + r() + r() - 1.5) * 34;
      const tw = r() < 0.3;
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.3 + r() * 0.9)}"${tw ? ' class="twinkle"' : ''} style="fill:#fff;opacity:${(0.5 + r() * 0.5).toFixed(2)}${tw ? `;animation-delay:-${n1(r() * 3)}s` : ''}"/>`;
    }
    return s + '</g>';
  }
  // 帶環的小行星
  const planet = (x, y, rad) =>
    `<circle cx="${x}" cy="${y}" r="${rad * 2}" ${F('planet', ';opacity:.12')}/><circle cx="${x}" cy="${y}" r="${rad}" ${F('planet')}/>`
    + `<ellipse cx="${x}" cy="${y}" rx="${rad * 1.9}" ry="${n1(rad * 0.45)}" transform="rotate(-18 ${x} ${y})" style="fill:none;stroke:var(--band1);stroke-width:1.6;opacity:.85"/>`;
  // 流星：每隔幾秒劃過一次
  const meteor = (x, y, delay) =>
    `<g class="shoot" style="animation-delay:${delay}s"><path d="M${x} ${y} l34 -16" style="fill:none;stroke:#fff;stroke-width:1.4;opacity:.9"/></g>`;

  // 瀑布：兩側岩壁之間的水流（虛線往下流動）＋水潭與水霧
  function waterfall() {
    let s = hill('M100 200 L112 92 L136 66 L178 58 L182 200Z', 'rock')
      + hill('M218 200 L222 56 L262 62 L290 90 L304 200Z', 'rock')
      + hill('M100 200 L112 92 L124 100 L130 200Z', 'rock2')
      + hill('M304 200 L290 90 L280 104 L278 200Z', 'rock2')
      + `<rect x="178" y="56" width="44" height="118" ${F('water2')}/>`
      + `<ellipse cx="200" cy="57" rx="23" ry="3" ${F('water')}/>`;
    [183, 190, 196, 203, 209, 216].forEach((x, i) => {
      s += `<path class="flow" d="M${x} 58 V172" style="fill:none;stroke:var(--water);stroke-width:${i % 2 ? 2.4 : 1.6};stroke-dasharray:18 9;opacity:.9;animation-duration:${(0.9 + (i % 3) * 0.2).toFixed(1)}s"/>`;
    });
    s += `<ellipse cx="200" cy="182" rx="120" ry="16" ${F('water2')}/>`
      + waves(180, 1.2).replace('opacity:.55', 'opacity:.6')
      + `<g class="mist"><ellipse cx="200" cy="172" rx="40" ry="9" style="fill:#fff;opacity:.75"/><ellipse cx="178" cy="168" rx="18" ry="7" style="fill:#fff;opacity:.6"/><ellipse cx="224" cy="167" rx="20" ry="7" style="fill:#fff;opacity:.6"/></g>`;
    return s;
  }

  // 往上飄的愛心
  const heart = (x, y, k, dur, delay, v) =>
    `<g class="floaty" style="animation-duration:${dur}s;animation-delay:-${delay}s"><path transform="translate(${x} ${y}) scale(${k})" d="M0 3 C-6 -2 -4 -8 0 -5 C4 -8 6 -2 0 3Z" ${F(v)}/></g>`;
  // 肉球腳印
  const paw = (x, y, k, rot, v, op = '.35') =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" ${F(v, `;opacity:${op}`)}><ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-5" cy="-3" r="1.9"/><circle cx="-1.8" cy="-5.6" r="1.9"/><circle cx="1.8" cy="-5.6" r="1.9"/><circle cx="5" cy="-3" r="1.9"/></g>`;

  // 可愛的貓：正面坐姿（x, y 為腳底中心）
  function cat(x, y, k) {
    const t = `translate(${x} ${y}) scale(${k})`;
    return `<g transform="${t}">`
      // 尾巴（會擺動）
      + '<path class="wag" d="M16 -6 C40 -6 44 -30 34 -44" style="fill:none;stroke:var(--fur);stroke-width:8;stroke-linecap:round"/>'
      // 身體與胸前白毛
      + `<ellipse cx="0" cy="-22" rx="22" ry="24" ${F('fur')}/>`
      + `<ellipse cx="0" cy="-18" rx="11" ry="15" ${F('cream')}/>`
      // 前腳
      + `<ellipse cx="-9" cy="-2" rx="7" ry="4.5" ${F('cream')}/><ellipse cx="9" cy="-2" rx="7" ry="4.5" ${F('cream')}/>`
      // 耳朵
      + `<path d="M-21 -66 L-17 -90 L-4 -76Z M21 -66 L17 -90 L4 -76Z" ${F('fur')}/>`
      + `<path d="M-17 -70 L-15 -84 L-8 -76Z M17 -70 L15 -84 L8 -76Z" ${F('pink')}/>`
      // 頭
      + `<ellipse cx="0" cy="-60" rx="25" ry="21" ${F('fur')}/>`
      + '<path d="M-6 -80 V-72 M0 -81 V-71 M6 -80 V-72" style="fill:none;stroke:var(--fur2);stroke-width:2.2;stroke-linecap:round"/>'
      + `<ellipse cx="0" cy="-52" rx="10" ry="7" ${F('cream')}/>`
      // 眼睛（含反光）、腮紅、鼻子、嘴巴、鬍鬚
      + `<g class="blink"><ellipse cx="-9" cy="-62" rx="3.4" ry="4" ${F('ink')}/><ellipse cx="9" cy="-62" rx="3.4" ry="4" ${F('ink')}/>`
      + '<circle cx="-8" cy="-63.5" r="1.2" style="fill:#fff"/><circle cx="10" cy="-63.5" r="1.2" style="fill:#fff"/></g>'
      + `<ellipse cx="-16" cy="-53" rx="4.5" ry="2.6" ${F('pink', ';opacity:.7')}/><ellipse cx="16" cy="-53" rx="4.5" ry="2.6" ${F('pink', ';opacity:.7')}/>`
      + `<path d="M-2.2 -55.5 H2.2 L0 -53Z" ${F('pink')}/>`
      + '<path d="M-4 -50.5 q2 2.4 4 0 q2 2.4 4 0" style="fill:none;stroke:var(--ink);stroke-width:1.1"/>'
      + '<path d="M-12 -53 L-27 -56 M-12 -51 L-27 -50 M12 -53 L27 -56 M12 -51 L27 -50" style="fill:none;stroke:var(--ink);stroke-width:.7;opacity:.5"/>'
      + '</g>';
  }
  // 毛線球
  const yarn = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" ${F('yarn')}/>`
    + `<path d="M${x - r * 0.8} ${y - r * 0.4} Q${x} ${y - r * 0.1} ${x + r * 0.7} ${y - r * 0.6} M${x - r * 0.9} ${y + r * 0.2} Q${x} ${y + r * 0.3} ${x + r * 0.9} ${y - r * 0.1} M${x - r * 0.5} ${y + r * 0.8} Q${x + r * 0.2} ${y + r * 0.5} ${x + r * 0.6} ${y + r * 0.7}" style="fill:none;stroke:#fff;stroke-width:1.2;opacity:.6"/>`
    + `<path d="M${x - r} ${y + r * 0.6} q-12 6 -22 2" style="fill:none;stroke:var(--yarn);stroke-width:1.4"/>`;

  // 黃金獵犬：正面坐姿、垂耳、吐舌頭、搖尾巴（x, y 為腳底中心）
  function golden(x, y, k) {
    const t = `translate(${x} ${y}) scale(${k})`;
    return `<g transform="${t}">`
      + '<path class="wag fast" d="M20 -14 C40 -18 50 -36 46 -54" style="fill:none;stroke:var(--fur);stroke-width:9;stroke-linecap:round"/>'
      + '<path class="wag fast" d="M24 -16 C40 -20 47 -34 44 -48" style="fill:none;stroke:var(--fur2);stroke-width:2;stroke-linecap:round;opacity:.5"/>'
      + `<ellipse cx="0" cy="-26" rx="26" ry="28" ${F('fur')}/>`
      + `<ellipse cx="0" cy="-24" rx="13" ry="17" ${F('cream')}/>`
      // 前腳
      + `<rect x="-15" y="-22" width="10" height="22" rx="5" ${F('fur')}/><rect x="5" y="-22" width="10" height="22" rx="5" ${F('fur')}/>`
      + `<ellipse cx="-10" cy="-1" rx="7" ry="3.6" ${F('cream')}/><ellipse cx="10" cy="-1" rx="7" ry="3.6" ${F('cream')}/>`
      // 項圈與名牌
      + `<path d="M-17 -46 Q0 -38 17 -46" style="fill:none;stroke:var(--collar);stroke-width:4.5"/><circle cx="0" cy="-38" r="3.4" ${F('sun')}/>`
      // 頭與垂耳
      + `<ellipse cx="0" cy="-66" rx="22" ry="20" ${F('fur')}/>`
      + `<ellipse cx="-21" cy="-60" rx="8" ry="15" transform="rotate(14 -21 -60)" ${F('fur2')}/>`
      + `<ellipse cx="21" cy="-60" rx="8" ry="15" transform="rotate(-14 21 -60)" ${F('fur2')}/>`
      + `<ellipse cx="0" cy="-56" rx="12" ry="9" ${F('cream')}/>`
      // 眼睛、眉毛、鼻子、嘴巴、舌頭
      + `<g class="blink"><circle cx="-8.5" cy="-70" r="3.2" ${F('ink')}/><circle cx="8.5" cy="-70" r="3.2" ${F('ink')}/>`
      + '<circle cx="-7.6" cy="-71.2" r="1.1" style="fill:#fff"/><circle cx="9.4" cy="-71.2" r="1.1" style="fill:#fff"/></g>'
      + '<path d="M-12 -77 q3 -2.5 6 -1 M12 -77 q-3 -2.5 -6 -1" style="fill:none;stroke:var(--fur2);stroke-width:1.6"/>'
      + `<ellipse cx="0" cy="-60" rx="4.6" ry="3.2" ${F('ink')}/>`
      + `<path d="M-3.6 -50.5 Q0 -40 3.6 -50.5Z" ${F('tongue')}/>`
      + '<path d="M0 -57 V-53 M-6 -52 Q-3 -49 0 -53 Q3 -49 6 -52" style="fill:none;stroke:var(--ink);stroke-width:1.2"/>'
      + '</g>';
  }
  const tennis = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" ${F('ball')}/><path d="M${x - r * 0.75} ${y - r * 0.65} Q${x} ${y} ${x - r * 0.75} ${y + r * 0.65} M${x + r * 0.75} ${y - r * 0.65} Q${x} ${y} ${x + r * 0.75} ${y + r * 0.65}" style="fill:none;stroke:#fff;stroke-width:1.2"/>`;
  const bone = (x, y, k, rot) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" style="fill:#fff"><rect x="-9" y="-2.2" width="18" height="4.4" rx="2"/><circle cx="-9" cy="-2.6" r="3"/><circle cx="-9" cy="2.6" r="3"/><circle cx="9" cy="-2.6" r="3"/><circle cx="9" cy="2.6" r="3"/></g>`;
  const daisy = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="3.4" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-dasharray:1.6 1"/><circle cx="${x}" cy="${y}" r="1.6" ${F('sun')}/>`;

  const BUILD = {
    forest: () => {
      const r = rng(7);
      return {
        deco: sun(352, 46, 17) + cloud(60, 34, 0.8) + cloud(250, 28, 0.6),
        ground: hill('M-10 125 Q60 98 130 112 T260 104 T410 108 V200 H-10Z', 'far')
          + pines(r, 152, 14, 34, 56, 'mid')
          + hill('M-10 165 Q90 148 200 160 T410 155 V200 H-10Z', 'mid')
          + pines(r, 198, 9, 46, 70, 'near')
          + hill('M-10 190 Q120 180 220 188 T410 184 V200 H-10Z', 'near'),
      };
    },

    bluesky: () => ({
      deco: drift(55, 42, 1.1, 18, 0) + drift(215, 26, 0.8, 22, 6) + drift(335, 96, 0.95, 20, 11)
        + drift(130, 120, 0.6, 26, 3) + drift(40, 175, 0.55, 24, 15) + kite(352, 50),
      ground: hill('M-10 130 Q90 108 200 124 T410 116 V200 H-10Z', 'far')
        + tree(70, 128) + tree(88, 131)
        + hill('M-10 158 Q120 136 250 152 T410 146 V200 H-10Z', 'mid')
        + tree(330, 152)
        + hill('M-10 184 Q150 168 280 182 T410 176 V200 H-10Z', 'near'),
    }),

    maple: () => {
      const r = rng(23);
      return {
        deco: sun(352, 46, 17) + leaves(r, 18),
        ground: hill('M-10 128 Q70 104 150 118 T300 110 T410 114 V200 H-10Z', 'far')
          + maples(r, 152, 11, 26, 36, ['leaf2', 'leaf3', 'mid'])
          + hill('M-10 166 Q100 150 210 162 T410 156 V200 H-10Z', 'mid')
          + maples(r, 196, 7, 38, 50, ['leaf1', 'leaf2', 'leaf3'])
          + hill('M-10 190 Q120 180 230 188 T410 184 V200 H-10Z', 'near'),
      };
    },

    sunshine: () => ({
      deco: sunburst(345, 52, 20) + cloud(70, 40, 0.8) + cloud(230, 30, 0.55),
      ground: hill('M-10 124 Q80 102 180 118 T410 110 V200 H-10Z', 'far')
        + hill('M-10 146 Q110 126 230 140 T410 134 V200 H-10Z', 'mid')
        + [20, 58, 96, 134, 172, 228, 266, 304, 342, 380].map((x, i) => sunflower(x, 150 + (i % 3) * 3, 1.25)).join('')
        + hill('M-10 176 Q140 160 270 174 T410 168 V200 H-10Z', 'near')
        + [5, 50, 95, 140, 185, 235, 280, 325, 370, 412].map((x, i) => sunflower(x, 188 + (i % 2) * 4, 1.6)).join(''),
    }),

    glacier: () => {
      const r = rng(31);
      return {
        deco: sun(352, 46, 15) + cloud(70, 36, 0.8) + cloud(240, 26, 0.55),
        ground: ridge(r, 138, 4, 30, 62, 'far', true)
          + `<rect x="-10" y="148" width="420" height="60" ${F('near')}/>`
          + hill('M-10 150 L20 126 L45 132 L70 114 L100 124 L130 108 L160 121 L190 112 L220 128 L250 122 L272 150Z', 'ice2')
          + hill('M-10 150 L20 138 L45 142 L70 132 L100 138 L130 128 L160 136 L190 130 L220 140 L250 136 L272 150Z', 'mid')
          + '<path d="M45 132 L50 150 M100 124 L96 150 M160 121 L165 150 M220 128 L216 150" style="fill:none;stroke:var(--ice);stroke-width:1.2;opacity:.8"/>'
          + waves(160, 1.6) + waves(176, 1.4)
          + hill('M300 160 L318 151 L340 153 L354 161Z', 'ice')
          + hill('M86 182 L100 175 L116 177 L122 184Z', 'ice')
          + hill('M200 192 L210 187 L222 188 L226 193Z', 'ice'),
      };
    },

    beach: () => ({
      deco: sun(352, 46, 18) + cloud(60, 36, 0.9) + cloud(250, 26, 0.6),
      ground: `<rect x="-10" y="112" width="420" height="100" ${F('far')}/>`
        + waves(124, 2.5) + waves(138, 2)
        + `<path d="M90 108 V86 L104 108Z" style="fill:#fff"/><path d="M84 109 H108 L104 113 H88Z" ${F('mid')}/>`
        + hill('M-10 158 Q100 140 210 152 T410 146 V200 H-10Z', 'near')
        + '<path d="M-10 158 Q100 140 210 152 T410 146" style="fill:none;stroke:#fff;stroke-width:3;opacity:.75"/>',
    }),

    desert: () => ({
      deco: sun(350, 50, 22),
      ground: hill('M-10 135 Q70 108 150 128 T300 118 T410 126 V200 H-10Z', 'far')
        + hill('M-10 165 Q110 128 220 156 T410 150 V200 H-10Z', 'mid')
        + cactus(322, 154)
        + hill('M-10 188 Q140 165 270 184 T410 178 V200 H-10Z', 'near'),
    }),

    starry: () => {
      const r = rng(42);
      return {
        deco: stars(r, 70) + moon(350, 46, 15),
        ground: ridge(r, 152, 5, 18, 42, 'far')
          + hill('M-10 172 Q100 150 210 166 T410 160 V200 H-10Z', 'mid')
          + hill('M-10 190 Q140 176 260 188 T410 184 V200 H-10Z', 'near'),
      };
    },

    galaxy: () => {
      const r = rng(77);
      return {
        deco: stars(r, 45) + milkyWay(r) + planet(345, 48, 11) + meteor(250, 40, 1) + meteor(120, 90, 5),
        ground: ridge(r, 150, 5, 22, 48, 'far')
          + pines(r, 176, 12, 20, 34, 'mid')
          + hill('M-10 174 Q100 156 210 168 T410 162 V200 H-10Z', 'mid')
          + hill('M-10 190 Q140 178 260 188 T410 184 V200 H-10Z', 'near'),
      };
    },

    waterfall: () => {
      // 三角形的樹：[x, 底部 y, 高度, 顏色]
      const tri = ([x, y, h, v]) => `<path d="M${x} ${y - h} L${n1(x - h * 0.3)} ${y} H${n1(x + h * 0.3)}Z" ${F(v)}/>`;
      return {
        deco: sun(352, 46, 15) + drift(60, 36, 0.85, 22, 0) + drift(240, 26, 0.6, 26, 8),
        ground: hill('M-10 118 Q80 96 170 110 T410 104 V200 H-10Z', 'far')
          + waterfall()
          + [[128, 72, 16, 'tree'], [146, 64, 21, 'tree'], [166, 60, 26, 'tree'],
            [234, 59, 24, 'tree'], [252, 64, 18, 'tree'], [272, 80, 21, 'tree']].map(tri).join('')
          + hill('M-10 200 V150 Q40 140 80 156 Q100 166 112 176 Q90 190 60 200Z', 'mid')
          + hill('M410 200 V146 Q360 138 320 154 Q296 166 286 178 Q310 192 340 200Z', 'mid')
          + [[20, 168, 40, 'near'], [50, 164, 32, 'near'], [352, 170, 40, 'near'], [384, 166, 34, 'near']].map(tri).join('')
          + hill('M-10 200 V186 Q60 178 120 190 Q90 198 60 200Z', 'near')
          + hill('M410 200 V184 Q340 178 290 192 Q320 199 350 200Z', 'near'),
      };
    },

    cat: () => ({
      deco: paw(40, 40, 1.4, -20, 'fur2') + paw(78, 70, 1.2, 10, 'fur2', '.25') + paw(300, 30, 1.2, 25, 'pink')
        + heart(350, 60, 1.6, 9, 0, 'pink') + heart(250, 90, 1.1, 11, 4, 'pink') + heart(150, 50, 1.2, 10, 7, 'fur2')
        + drift(190, 24, 0.6, 24, 5),
      ground: hill('M-10 132 Q90 110 200 126 T410 120 V200 H-10Z', 'far')
        + hill('M-10 160 Q120 140 250 156 T410 150 V200 H-10Z', 'mid')
        + yarn(236, 182, 8)
        + `<ellipse cx="300" cy="185" rx="32" ry="7" ${F('cushion')}/>`
        + cat(300, 183, 0.85)
        + paw(60, 182, 1, -60, 'near', '.5') + paw(90, 172, 0.9, -70, 'near', '.4')
        + hill('M-10 190 Q140 178 260 188 T410 184 V200 H-10Z', 'near'),
    }),

    dog: () => ({
      deco: sun(352, 46, 17) + drift(60, 36, 0.85, 20, 0) + drift(230, 26, 0.6, 24, 7)
        + heart(300, 96, 1.3, 10, 2, 'collar') + heart(120, 80, 1, 12, 6, 'collar'),
      ground: hill('M-10 128 Q90 106 200 122 T410 116 V200 H-10Z', 'far')
        + hill('M-10 158 Q120 138 250 154 T410 148 V200 H-10Z', 'mid')
        + [30, 70, 110, 150, 196, 236].map((x, i) => daisy(x, 168 + (i % 2) * 6)).join('')
        + tennis(244, 186, 6) + bone(60, 188, 1, -18)
        + golden(300, 190, 0.82)
        + hill('M-10 192 Q140 180 260 190 T410 186 V200 H-10Z', 'near'),
    }),

    snow: () => {
      const r = rng(5);
      return {
        deco: flakes(r, 30),
        ground: ridge(r, 150, 4, 50, 95, 'far', true)
          + ridge(r, 172, 6, 20, 40, 'mid', true)
          + hill('M-10 182 Q120 166 230 178 T410 172 V200 H-10Z', 'near'),
      };
    },

    country: () => ({
      deco: sun(352, 46, 18) + cloud(60, 34, 0.8) + cloud(250, 26, 0.6),
      ground: hill('M-10 130 Q90 105 200 124 T410 118 V200 H-10Z', 'far')
        + tree(262, 130) + barn(290, 130)
        + hill('M-10 160 Q120 135 250 155 T410 150 V200 H-10Z', 'mid')
        + [168, 177, 186].map((y) => `<path d="M-10 ${y} Q120 ${y - 22} 250 ${y - 4} T410 ${y - 9}" style="fill:none;stroke:var(--far);stroke-width:1.6;opacity:.55"/>`).join('')
        + hill('M-10 188 Q150 172 280 186 T410 180 V200 H-10Z', 'near')
        + fence(20, 150, 184),
    }),
  };

  const LIST = [
    { id: 'bluesky', name: '藍天白雲', desc: '晴空與風箏（預設）' },
    { id: 'forest', name: '森林', desc: '清新綠意' },
    { id: 'sunshine', name: '陽光', desc: '明亮向日葵' },
    { id: 'maple', name: '楓葉林', desc: '秋日紅葉' },
    { id: 'beach', name: '海灘', desc: '海風與陽光' },
    { id: 'desert', name: '沙漠', desc: '溫暖沙丘' },
    { id: 'glacier', name: '冰川', desc: '冰河與浮冰' },
    { id: 'snow', name: '雪山', desc: '純淨雪景' },
    { id: 'country', name: '鄉村', desc: '田園小屋' },
    { id: 'waterfall', name: '瀑布', desc: '山谷流水與水霧' },
    { id: 'cat', name: '喵喵', desc: '可愛貓咪與毛線球' },
    { id: 'dog', name: '汪星人', desc: '活潑的黃金獵犬' },
    { id: 'starry', name: '星空', desc: '靜謐夜晚（深色）' },
    { id: 'galaxy', name: '銀河', desc: '璀璨星河與流星（深色）' },
  ];
  const DEFAULT = 'bluesky';

  function svg(id) {
    const s = (BUILD[id] || BUILD[DEFAULT])();
    return (s.deco ? `<svg class="deco" viewBox="0 0 400 240" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${s.deco}</svg>` : '')
      + (s.ground ? `<svg class="ground" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s.ground}</svg>` : '');
  }

  return { list: LIST, svg, DEFAULT };
})();
