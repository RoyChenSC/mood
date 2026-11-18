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
  const moon = (x, y, rad) =>
    `<circle cx="${x}" cy="${y}" r="${rad * 2.2}" ${F('moon', ';opacity:.1')}/><path d="M${x} ${y - rad} A${rad} ${rad} 0 1 0 ${x} ${y + rad} A${n1(rad * 0.42)} ${rad} 0 1 1 ${x} ${y - rad}Z" ${F('moon')}/>`;

  const cactus = (x, y) =>
    `<g ${F('cactus')}><rect x="${x - 5}" y="${y - 44}" width="10" height="46" rx="5"/><rect x="${x - 17}" y="${y - 30}" width="7" height="18" rx="3.5"/><rect x="${x - 17}" y="${y - 16}" width="14" height="6" rx="3"/><rect x="${x + 10}" y="${y - 36}" width="7" height="16" rx="3.5"/><rect x="${x + 3}" y="${y - 24}" width="14" height="6" rx="3"/></g>`;

  const barn = (x, y) =>
    `<g transform="translate(${x} ${y - 30})"><rect y="10" width="30" height="20" ${F('barn')}/><path d="M-3 12 L15 -1 L33 12Z" ${F('roof')}/><path d="M11 30 V19 H19 V30" style="fill:none;stroke:#fff;stroke-width:1.6;opacity:.85"/></g>`;
  const tree = (x, y) =>
    `<rect x="${x - 1.5}" y="${y - 12}" width="3" height="12" ${F('roof')}/><circle cx="${x}" cy="${y - 18}" r="9" ${F('tree')}/>`;
  const birds = (x, y) =>
    `<path d="M${x} ${y} q5 -5 10 0 q5 -5 10 0 M${x + 28} ${y - 10} q4 -4 8 0 q4 -4 8 0" style="fill:none;stroke:var(--muted);stroke-width:1.4;opacity:.7"/>`;

  function fence(x0, x1, y) {
    let s = `<path d="M${x0} ${y - 6} H${x1} M${x0} ${y - 2} H${x1}`;
    for (let x = x0; x <= x1; x += 13) s += ` M${x} ${y - 10} V${y + 2}`;
    return `${s}" style="fill:none;stroke:var(--roof);stroke-width:1.6;opacity:.55"/>`;
  }

  const BUILD = {
    warm: () => ({ deco: '', ground: '' }),

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

    mountain: () => {
      const r = rng(11);
      return {
        deco: sun(352, 46, 17) + cloud(60, 34, 0.8) + cloud(250, 26, 0.6) + birds(300, 70),
        ground: ridge(r, 140, 4, 40, 80, 'far')
          + ridge(r, 165, 5, 25, 50, 'mid')
          + hill('M190 150 Q170 170 150 200 H262 Q230 172 214 150Z', 'river')
          + hill('M-10 168 Q70 158 150 176 Q160 190 150 200 H-10Z', 'near')
          + hill('M262 200 Q242 182 262 170 Q330 156 410 164 V200Z', 'near'),
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
    { id: 'warm', name: '暖陽', desc: '跟隨系統深淺色' },
    { id: 'forest', name: '森林', desc: '清新綠意' },
    { id: 'maple', name: '楓葉林', desc: '秋日紅葉' },
    { id: 'beach', name: '海灘', desc: '海風與陽光' },
    { id: 'desert', name: '沙漠', desc: '溫暖沙丘' },
    { id: 'starry', name: '星空', desc: '靜謐夜晚' },
    { id: 'mountain', name: '山川', desc: '遠山與河流' },
    { id: 'snow', name: '雪山', desc: '純淨雪景' },
    { id: 'country', name: '鄉村', desc: '田園小屋' },
  ];

  function svg(id) {
    const s = (BUILD[id] || BUILD.warm)();
    return (s.deco ? `<svg class="deco" viewBox="0 0 400 240" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${s.deco}</svg>` : '')
      + (s.ground ? `<svg class="ground" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s.ground}</svg>` : '');
  }

  return { list: LIST, svg };
})();
