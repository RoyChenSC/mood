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
    { id: 'forest', name: '森林', desc: '清新綠意（預設）' },
    { id: 'sunshine', name: '陽光', desc: '明亮向日葵' },
    { id: 'bluesky', name: '藍天白雲', desc: '晴空與風箏' },
    { id: 'maple', name: '楓葉林', desc: '秋日紅葉' },
    { id: 'beach', name: '海灘', desc: '海風與陽光' },
    { id: 'desert', name: '沙漠', desc: '溫暖沙丘' },
    { id: 'glacier', name: '冰川', desc: '冰河與浮冰' },
    { id: 'snow', name: '雪山', desc: '純淨雪景' },
    { id: 'country', name: '鄉村', desc: '田園小屋' },
    { id: 'waterfall', name: '瀑布', desc: '山谷流水與水霧' },
    { id: 'starry', name: '星空', desc: '靜謐夜晚（深色）' },
    { id: 'galaxy', name: '銀河', desc: '璀璨星河與流星（深色）' },
  ];
  const DEFAULT = 'forest';

  function svg(id) {
    const s = (BUILD[id] || BUILD[DEFAULT])();
    return (s.deco ? `<svg class="deco" viewBox="0 0 400 240" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${s.deco}</svg>` : '')
      + (s.ground ? `<svg class="ground" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s.ground}</svg>` : '');
  }

  return { list: LIST, svg, DEFAULT };
})();
