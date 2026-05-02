// Mini live previews for each tool card. Lightweight SVG sketches.

// Shared rAF ticker — smooth 60 fps animation
const useAnim = () => {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => { setT(v => v + (now - last) / 1000); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
};

const TrackingPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const agents = [
    { p: 0.13, a: 40, cx: 50, cy: 40, r: 22 },
    { p: 0.27, a: 55, cx: 40, cy: 50, r: 18 },
    { p: 0.41, a: 30, cx: 60, cy: 45, r: 24 },
    { p: 0.19, a: 50, cx: 45, cy: 55, r: 16 },
  ];
  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <rect width="100" height="70" fill="none" />
      {agents.map((ag, i) => {
        const phi = t * ag.p + ag.a;
        const x = ag.cx + Math.cos(phi) * ag.r * 0.6;
        const y = ag.cy + Math.sin(phi * 1.3) * ag.r * 0.35;
        const trail = Array.from({ length: 14 }, (_, k) => {
          const tp = t - k * 0.04;
          const ph = tp * ag.p + ag.a;
          return [ag.cx + Math.cos(ph) * ag.r * 0.6, ag.cy + Math.sin(ph * 1.3) * ag.r * 0.35];
        });
        return (
          <g key={i}>
            <polyline
              points={trail.map(p => p.join(",")).join(" ")}
              fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="0.3" />
            <rect x={x - 3} y={y - 3} width="6" height="6"
                  fill="none" stroke={accent} strokeOpacity="0.8" strokeWidth="0.35" />
            <circle cx={x} cy={y} r="1.1" fill={accent} />
            <text x={x + 4} y={y - 3} fontSize="2.5" fontFamily="var(--mono)"
                  fill={accent} opacity="0.7">id:{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
};

const ProjectionPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const fx = 50 + Math.cos(t * 0.4) * 18;
  const fy = 35 + Math.sin(t * 0.55) * 10;
  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      {[28, 22, 16, 10, 5].map((r, i) => (
        <circle key={i} cx="50" cy="35" r={r}
                fill="none" stroke={accent}
                strokeOpacity={0.12 + i * 0.06} strokeWidth="0.3"
                strokeDasharray={i % 2 ? "1 1.5" : "none"} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={10 + i * 9} y1="5" x2={10 + i * 9} y2="65"
              stroke={accent} strokeOpacity="0.08" strokeWidth="0.3" />
      ))}
      <g transform={`translate(${fx} ${fy}) rotate(${(t * 30) % 360})`}>
        <ellipse cx="0" cy="0" rx="1.4" ry="0.7" fill={accent} />
        <line x1="0" y1="0" x2="3" y2="0" stroke={accent} strokeWidth="0.25" />
      </g>
      <text x="4" y="66" fontSize="2.6" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        closed-loop · 90Hz
      </text>
    </svg>
  );
};

const RigPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const cells = Array.from({ length: 8 });
  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      {cells.map((_, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 10 + col * 21, y = 12 + row * 26;
        const lit = (t + i) % 5 < 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width="18" height="20" fill="none"
                  stroke={accent} strokeOpacity="0.4" strokeWidth="0.3" />
            <circle cx={x + 9} cy={y + 6} r="2" fill="none"
                    stroke={accent} strokeOpacity={lit ? 0.95 : 0.3} strokeWidth="0.4" />
            <circle cx={x + 9} cy={y + 6} r="0.8" fill={accent}
                    fillOpacity={lit ? 0.9 : 0.25} />
            <line x1={x + 2} y1={y + 14} x2={x + 16} y2={y + 14}
                  stroke={accent} strokeOpacity="0.25" strokeWidth="0.25" />
            <text x={x + 2} y={y + 18} fontSize="2" fontFamily="var(--mono)"
                  fill={accent} opacity="0.6">rig-0{i + 1}</text>
          </g>
        );
      })}
      <text x="4" y="8" fontSize="2.6" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        sync clock · {t % 60}s
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ArthroScape — turbulent odor plume; flies navigate upstream (surge-and-cast)
// ─────────────────────────────────────────────────────────────────────────────
const MapPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const SX = 7, SY = 35;

  const PUFFS  = 32;
  const PERIOD = 0.28;
  const CYCLE  = PUFFS * PERIOD;
  const SPEED  = 9.5;

  const puffSeeds = React.useMemo(() =>
    Array.from({ length: PUFFS }, (_, i) => ({
      latSeed:   ((i * 1.6180339) % 1) * 2 - 1,
      speedMult: 0.78 + ((i * 0.1379) % 1) * 0.44,
      sizeMult:  0.65 + ((i * 0.2517) % 1) * 0.70,
      opacMult:  0.55 + ((i * 0.3931) % 1) * 0.45,
    })), []);

  // Turbulent plume centerline: slow meander + three spatial harmonics
  const centerY = (x, time) => {
    const d = Math.max(0, (x - SX) / 84);
    const meander = 4.5 * Math.sin(time * 0.21 + 0.4) + 2.2 * Math.sin(time * 0.37);
    return (SY + meander)
      + 6.5 * d * Math.sin(d * 3.4  + time * 1.05)
      + 3.2 * d * Math.sin(d * 6.1  - time * 0.68)
      + 1.6 * d * Math.sin(d * 10.3 + time * 1.92);
  };

  const plumeSpread = (x) => 1.1 + ((x - SX) / 84) * 10.5;

  const puffs = puffSeeds.map((seed, i) => {
    const age  = ((t - i * PERIOD) % CYCLE + CYCLE) % CYCLE;
    const x    = SX + age * SPEED * seed.speedMult;
    if (x > 92 || x < SX) return null;
    const frac = Math.min(1, (x - SX) / 84);
    const sp   = plumeSpread(x) * seed.sizeMult;
    const cy   = centerY(x, t) + seed.latSeed * sp * 0.45;
    // Steeper power (1.9): concentration falls off sharply away from source
    const opacity = 0.34 * seed.opacMult * Math.pow(1 - frac, 1.9);
    return { x, y: Math.max(5, Math.min(65, cy)), rx: sp * 0.48, ry: sp, opacity };
  }).filter(Boolean);

  // ── Stateful fly simulation (surge-and-cast upwind navigation) ────────────
  // Flies start downwind (right) and navigate toward the source (left).
  // On-plume: surge upwind fast, converge toward centerline.
  // Off-plume: slow cast crosswind with widening sweeps to re-contact plume.
  const flyRef = React.useRef(null);
  const prevT  = React.useRef(null);

  if (!flyRef.current) {
    flyRef.current = [
      { x: 90, y: 33, castFreq: 2.6, trail: [] },
      { x: 68, y: 40, castFreq: 2.0, trail: [] },
      { x: 46, y: 28, castFreq: 3.1, trail: [] },
    ];
  }

  const dt = prevT.current !== null
    ? Math.min(0.08, Math.max(0, t - prevT.current))
    : 0;
  prevT.current = t;

  if (dt > 0) {
    flyRef.current = flyRef.current.map((fly, i) => {
      const cl      = centerY(fly.x, t);
      const sp      = plumeSpread(fly.x);
      const onPlume = Math.abs(fly.y - cl) < sp * 0.88;

      // Upwind velocity: surge on-plume, slow cast off-plume
      const vx   = onPlume ? -11 : -5;
      const newX = fly.x + vx * dt;

      // Lateral: damp toward centerline when surging; sinusoidal cast when lost
      const castTarget = cl + Math.sin(t * fly.castFreq + i * 2.4) * sp * 1.55;
      const targetY    = onPlume ? cl + (fly.y - cl) * 0.55 : castTarget;
      const newY       = fly.y + (targetY - fly.y) * Math.min(1, dt * 4.0);
      const clampedY   = Math.max(8, Math.min(62, newY));

      // Prepend current position into trail (keep 10 steps)
      const trail = [[fly.x, fly.y], ...fly.trail].slice(0, 10);

      // Reset to far downwind when reaching source vicinity
      if (newX < SX + 7) {
        const resetCl = centerY(93, t);
        return { x: 93, y: resetCl + (i - 1) * 7, castFreq: fly.castFreq, trail: [] };
      }

      return { x: newX, y: clampedY, castFreq: fly.castFreq, trail, onPlume };
    });
  }

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <defs>
        <clipPath id="tp-plume-clip">
          <rect x="0" y="0" width="100" height="70" />
        </clipPath>
      </defs>
      <text x="4" y="7" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        ArthroScape · odor plume
      </text>

      {/* Diffuse background concentration field — clipped to prevent blur bleed */}
      <g clipPath="url(#tp-plume-clip)" style={{ filter: 'blur(3px)' }}>
        {puffs.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y}
                   rx={p.rx * 1.9} ry={p.ry * 1.9}
                   fill={accent} fillOpacity={p.opacity * 0.30} />
        ))}
      </g>

      {/* Sharper turbulent filaments — clipped */}
      <g clipPath="url(#tp-plume-clip)" style={{ filter: 'blur(1px)' }}>
        {puffs.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y}
                   rx={p.rx} ry={p.ry}
                   fill={accent} fillOpacity={p.opacity * 0.72} />
        ))}
      </g>

      {/* Odor source */}
      <circle cx={SX} cy={SY} r="2.0" fill={accent} fillOpacity="0.9" />
      <circle cx={SX} cy={SY} r="3.8" fill={accent} fillOpacity="0.18"
              style={{ filter: 'blur(1px)' }} />

      {/* Flies: trail + body */}
      {flyRef.current.map((fly, i) => (
        <g key={i}>
          <polyline
            points={[[fly.x, fly.y], ...fly.trail].map(p => p.join(",")).join(" ")}
            fill="none" stroke={accent} strokeOpacity="0.2" strokeWidth="0.45" />
          <ellipse cx={fly.x} cy={fly.y} rx="2.1" ry="1.15"
                   fill={accent} fillOpacity={fly.onPlume ? 0.92 : 0.38} />
        </g>
      ))}

      <text x="4" y="67" fontSize="1.9" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        {`\u03c4=${t.toFixed(1)}s \u00b7 upwind \u00b7 n=3`}
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MiniVentory — two-panel checkout/return form with typewriter field fill
// ─────────────────────────────────────────────────────────────────────────────
const InventoryPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const CYCLE = 10;
  const tc = t % CYCLE;

  const CO_VALS  = ['R.M.',     'fly food', '2', '\u2014'];
  const RET_VALS = ['C.U.',     'tips',     '1', 'leftover'];
  const LABELS   = ['person',   'item',     'qty', 'reason'];

  const typeField = (vals, i, start) => {
    if (tc < start + i) return '';
    const val = vals[i];
    return val.slice(0, Math.ceil(Math.min(1, tc - start - i) * val.length));
  };

  const coFlash  = tc >= 4.0 && tc < 4.3;
  const retFlash = tc >= 8.3 && tc < 8.6;
  const activeCoField  = (tc >= 0 && tc < 4.0) ? Math.min(3, Math.floor(tc)) : -1;
  const activeRetField = (tc >= 4.3 && tc < 8.3) ? Math.min(3, Math.floor(tc - 4.3)) : -1;
  const cursorOn = Math.sin(t * 9) > 0;

  const renderFields = (vals, start, activeField, fx) =>
    LABELS.map((label, i) => {
      const fy = 22 + i * 11;
      const val = typeField(vals, i, start);
      const active = activeField === i;
      return (
        <g key={i}>
          <text x={fx} y={fy} fontSize="1.7" fontFamily="var(--mono)"
                fill={accent} opacity="0.42">{label}</text>
          <line x1={fx} y1={fy + 4} x2={fx + 40} y2={fy + 4}
                stroke={accent} strokeOpacity="0.22" strokeWidth="0.3" />
          <text x={fx} y={fy + 3.5} fontSize="2.0" fontFamily="var(--mono)"
                fill={accent} opacity="0.85">{val}</text>
          {active && cursorOn && (
            <rect x={fx + val.length * 1.15} y={fy + 0.5}
                  width="0.6" height="2.8" fill={accent} fillOpacity="0.8" />
          )}
        </g>
      );
    });

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <rect x="2" y="5" width="46" height="62" rx="1"
            fill={accent} fillOpacity={coFlash ? 0.1 : 0.03} />
      <text x="25" y="14" textAnchor="middle" fontSize="2.4"
            fontFamily="var(--mono)" fill={accent} opacity="0.72">Check out</text>
      <line x1="6" y1="16.5" x2="44" y2="16.5"
            stroke={accent} strokeOpacity="0.18" strokeWidth="0.3" />
      <g>{renderFields(CO_VALS, 0, activeCoField, 6)}</g>
      {coFlash && (
        <text x="25" y="42" textAnchor="middle" fontSize="7"
              fontFamily="var(--mono)" fill={accent} opacity="0.7">{'\u2713'}</text>
      )}
      <line x1="50" y1="5" x2="50" y2="67"
            stroke={accent} strokeOpacity="0.2" strokeWidth="0.3" />
      <rect x="52" y="5" width="46" height="62" rx="1"
            fill={accent} fillOpacity={retFlash ? 0.1 : 0.03} />
      <text x="75" y="14" textAnchor="middle" fontSize="2.4"
            fontFamily="var(--mono)" fill={accent} opacity="0.72">Return</text>
      <line x1="56" y1="16.5" x2="94" y2="16.5"
            stroke={accent} strokeOpacity="0.18" strokeWidth="0.3" />
      <g>{renderFields(RET_VALS, 4.3, activeRetField, 56)}</g>
      {retFlash && (
        <text x="75" y="42" textAnchor="middle" fontSize="7"
              fontFamily="var(--mono)" fill={accent} opacity="0.7">{'\u2713'}</text>
      )}
      <text x="50" y="68.5" textAnchor="middle" fontSize="1.9"
            fontFamily="var(--mono)" fill={accent} opacity="0.5">
        {'checkout \u00b7 3 items \u00b7 1 pending return'}
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// D. Manager — vial flip → QR label → scan (sequential 3-phase loop)
// Vials have food plugs, foam stoppers. Flies use the page's fly-sprite.png.
// ─────────────────────────────────────────────────────────────────────────────
const StockPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  // 2-phase loop: phase 0 = transfer, phase 1 = label+scan+verify
  const PHASE_DUR = 3.0;
  const phase  = Math.floor(t / PHASE_DUR) % 2;
  const phaseT = (t % PHASE_DUR) / PHASE_DUR;
  const LABELS = ['flip \u00b7 transferring', 'label \u00b7 scan \u00b7 verified'];

  // Vial geometry
  const VW = 16, VH = 36, FOOD_H = 7, PLUG_H = 3;
  const LCX = 28, RCX = 72, VBOT = 62, VY = VBOT - VH; // VY=26

  const FLY_N = 5;
  // 5 fly slots: 2 pairs side-by-side just above food, 1 lone fly higher up
  const flySlots = [
    { lx: -2.5, ly: -(FOOD_H + 4.0) },
    { lx:  2.5, ly: -(FOOD_H + 4.0) },
    { lx: -2.5, ly: -(FOOD_H + 9.5) },
    { lx:  2.5, ly: -(FOOD_H + 9.5) },
    { lx:  0,   ly: -(FOOD_H + 15.0) },
  ];

  // Transfer progress: ramp starts at phaseT=0.10, ends at 0.90
  const transferP = phase === 0
    ? Math.max(0, Math.min(1, (phaseT - 0.10) / 0.80))
    : 1;
  // Left vial tilts during transfer
  const tilt = phase === 0 ? 16 * Math.sin(phaseT * Math.PI * 0.92) : 0;

  // Sprite: img/fly-sprite.png — 65×56px, frame size 13×14px, 5 cols × 4 rows
  // row 0: walk wings open, row 1: walk wings closed, row 2: fly up, row 3: fly down
  const SPR_COLS = 5, SPR_ROWS = 4;
  const DW = 4.5;                    // display width in SVG units
  const DH = 14 * DW / 13;          // display height, preserving aspect ≈4.85
  const walkCol  = Math.floor(t * 8) % 4;          // 8 fps walk cycle
  const flyRow   = 2 + Math.floor(t * 12) % 2;     // alternate rows 2/3
  const flyCol   = Math.floor(t * 10) % 4;

  // Render one sprite frame via nested SVG (overflow:hidden = natural clip)
  const flySprite = (cx, cy, col, row, key) => {
    const x = cx - DW / 2;
    const y = cy - DH / 2;
    return (
      <svg key={key} x={x} y={y} width={DW} height={DH} overflow="hidden">
        <image
          href="img/fly-sprite.png"
          x={-col * DW}
          y={-row * DH}
          width={SPR_COLS * DW}
          height={SPR_ROWS * DH}
          style={{ imageRendering: 'pixelated' }}
        />
      </svg>
    );
  };

  // Phase 1: QR fades in 0→0.12, scan 0.15→0.55, checkmark 0.60+
  const QR_N = 4, QR_CELL = 2.2;
  const QR_LX = RCX - (QR_N * QR_CELL) / 2;
  const QR_LY = VY + 5;
  const QR_FILL = [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1];
  const qrOpacity = phase === 1 ? Math.min(1, phaseT / 0.12) : 0;
  const scanY = phase === 1 && phaseT >= 0.15 && phaseT < 0.55
    ? QR_LY + ((phaseT - 0.15) / 0.40) * QR_N * QR_CELL
    : -99;
  const showCheck = phase === 1 && phaseT > 0.60;

  const vialShell = (cx) => (
    <g>
      <rect x={cx - VW / 2} y={VY} width={VW} height={VH} rx="2.5"
            fill={accent} fillOpacity="0.04"
            stroke={accent} strokeOpacity="0.50" strokeWidth="0.45" />
      {/* Food/agar media at bottom */}
      <rect x={cx - VW / 2 + 0.8} y={VBOT - FOOD_H}
            width={VW - 1.6} height={FOOD_H - 0.8} rx="1.5"
            fill={accent} fillOpacity="0.28" />
      {/* Foam stopper at top */}
      <rect x={cx - VW / 2 + 1.5} y={VY - 1} width={VW - 3} height={PLUG_H} rx="1"
            fill={accent} fillOpacity="0.17"
            stroke={accent} strokeOpacity="0.28" strokeWidth="0.25" />
    </g>
  );

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <text x="4" y="7" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        {'D. Manager \u00b7 vial workflow'}
      </text>

      {/* Left vial: tilts and empties during phase 0 */}
      <g transform={`rotate(${tilt}, ${LCX}, ${VBOT})`}>
        {vialShell(LCX)}
        {flySlots.map(({ lx, ly }, i) => {
          // Hide once this fly's transfer window has started
          if (transferP > i / FLY_N) return null;
          return flySprite(LCX + lx, VBOT + ly, walkCol, 0, `lf-${i}`);
        })}
      </g>

      {/* Right vial: fills up */}
      {vialShell(RCX)}
      {flySlots.map(({ lx, ly }, i) => {
        if (transferP < (i + 1) / FLY_N) return null;
        return flySprite(RCX + lx, VBOT + ly, walkCol, 0, `rf-${i}`);
      })}

      {/* QR label (phase 1): stamp fades in then scan sweeps */}
      {phase === 1 && qrOpacity > 0 && (
        <g opacity={qrOpacity}>
          <rect x={QR_LX - 0.8} y={QR_LY - 0.8}
                width={QR_N * QR_CELL + 1.6} height={QR_N * QR_CELL + 1.6}
                fill={accent} fillOpacity="0.07" rx="0.5" />
          {QR_FILL.map((filled, i) => {
            if (!filled) return null;
            const col = i % QR_N, row = Math.floor(i / QR_N);
            return (
              <rect key={i}
                    x={QR_LX + col * QR_CELL} y={QR_LY + row * QR_CELL}
                    width={QR_CELL - 0.4} height={QR_CELL - 0.4}
                    fill={accent} fillOpacity="0.72" />
            );
          })}
        </g>
      )}

      {scanY > 0 && (
        <line x1={QR_LX - 1} y1={scanY}
              x2={QR_LX + QR_N * QR_CELL + 1} y2={scanY}
              stroke={accent} strokeOpacity="0.9" strokeWidth="0.5" />
      )}

      {showCheck && (
        <text x={RCX + VW / 2 + 3} y={QR_LY + QR_N * QR_CELL / 2 + 2}
              fontSize="5" fontFamily="var(--mono)" fill={accent}
              fillOpacity={Math.min(1, (phaseT - 0.60) / 0.10)}>{'✓'}</text>
      )}

      {/* Transit: arc from slot-position in left vial, over stoppers, to slot-position in right vial */}
      {phase === 0 && flySlots.map(({ lx, ly }, i) => {
        const s0 = i / FLY_N, s1 = (i + 1) / FLY_N;
        // Only show during this fly's transfer window (strictly between s0 and s1)
        if (transferP <= s0 || transferP >= s1) return null;
        const sub = (transferP - s0) * FLY_N; // 0→1
        const startX = LCX + lx, endX = RCX + lx;
        const slotY = VBOT + ly;
        const arcPeak = VY - 10; // well above stoppers
        const fx = startX + sub * (endX - startX);
        // Arc: from slotY up to arcPeak and back down to slotY
        const fy = slotY - Math.sin(sub * Math.PI) * (slotY - arcPeak);
        return flySprite(fx, fy, flyCol, flyRow, `tf-${i}`);
      })}

      <text x="50" y="68" textAnchor="middle" fontSize="2.0"
            fontFamily="var(--mono)" fill={accent} opacity="0.65">
        {LABELS[phase]}
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// R01 · Fly-on-ball olfactory VR — rotating sphere, fly walks, odor plume
// ─────────────────────────────────────────────────────────────────────────────
const FlyOnBallPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const cx = 50, cy = 42, R = 22;
  const rotDeg = (t * 26) % 180;

  const flyX = cx + Math.sin(t * 0.72) * 11;
  const flyY = cy - R - 1.8;
  const flyTrail = Array.from({ length: 14 }, (_, k) => {
    const at = t - k * 0.09;
    return [cx + Math.sin(at * 0.72) * 11, cy - R - 1.8];
  });

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <text x="4" y="7" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        fly-on-ball · closed-loop
      </text>
      {/* Ball */}
      <circle cx={cx} cy={cy} r={R} fill={accent} fillOpacity="0.07"
              stroke={accent} strokeOpacity="0.5" strokeWidth="0.45" />
      {/* Rotating meridians */}
      {[0, 60, 120].map((offset, i) => {
        const a  = (rotDeg + offset) % 180;
        const rx = Math.max(0.3, R * Math.abs(Math.cos(a * Math.PI / 180)));
        return (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={R}
                   fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="0.3" />
        );
      })}
      {/* Equatorial band */}
      <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.28}
               fill="none" stroke={accent} strokeOpacity="0.22" strokeWidth="0.3" />
      {/* Left odor delivery particles */}
      <line x1="4" y1={cy - 2} x2={cx - R} y2={cy - 2}
            stroke={accent} strokeOpacity="0.2" strokeWidth="0.4" />
      {Array.from({ length: 4 }, (_, k) => {
        const frac = ((t * 0.52 + k * 0.25) % 1);
        return (
          <circle key={k} cx={4 + (cx - R - 6) * frac} cy={cy - 2} r="1.0"
                  fill={accent} fillOpacity={Math.max(0, 0.6 - frac * 0.55)} />
        );
      })}
      {/* Right pipe — baseline */}
      <line x1={cx + R} y1={cy - 2} x2="96" y2={cy - 2}
            stroke={accent} strokeOpacity="0.11" strokeWidth="0.4" strokeDasharray="1 0.8" />
      {/* Fly trail */}
      <polyline points={flyTrail.map(p => p.join(",")).join(" ")}
                fill="none" stroke={accent} strokeOpacity="0.2" strokeWidth="0.4" />
      {/* Fly */}
      <ellipse cx={flyX} cy={flyY} rx="2.1" ry="1.15" fill={accent} fillOpacity="0.88" />
      <line x1={flyX - 2.1} y1={flyY} x2={flyX - 5.5} y2={flyY - 1.6}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.3" />
      <line x1={flyX + 2.1} y1={flyY} x2={flyX + 5.5} y2={flyY - 1.6}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.3" />
      <text x="4" y="68" fontSize="1.9" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        vel={Math.abs(Math.cos(t * 0.72) * 18).toFixed(1)}mm/s · \u03b8={rotDeg.toFixed(0)}\u00b0
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// R02 · 16FlYMaze — 4×4 grid, flies choose left or right arm each trial
// ─────────────────────────────────────────────────────────────────────────────
const MazePreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const N = 16, COLS = 4, W = 18, H = 11, GAP = 2.5;
  const TRIAL = 4.5;
  const trialN     = Math.floor(t / TRIAL);
  const trialPhase = (t % TRIAL) / TRIAL;
  const committed  = trialPhase > 0.42;

  const choices = React.useMemo(() => {
    const arr = [];
    let seed = trialN * 1664525 + 1013904223;
    for (let i = 0; i < N; i++) {
      seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
      arr.push((seed >>> 0) % 2 === 0 ? -1 : 1);
    }
    return arr;
  }, [trialN]);

  const leftN  = choices.filter(c => c < 0).length;
  const rightN = N - leftN;

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <text x="4" y="7" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        16FlYMaze · trial {trialN + 1}
      </text>
      {Array.from({ length: N }, (_, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const x   = 4 + col * (W + GAP);
        const y   = 10 + row * (H + GAP);
        const ch  = choices[i];
        const targetX = committed
          ? x + W / 2 + ch * W * 0.33
          : x + W / 2 + Math.sin(t * 1.8 + i * 0.85) * W * 0.14;
        return (
          <g key={i}>
            <rect x={x} y={y} width={W} height={H} rx="1.5"
                  fill={accent} fillOpacity="0.05"
                  stroke={accent} strokeOpacity="0.28" strokeWidth="0.25" />
            <line x1={x + W / 2} y1={y} x2={x + W / 2} y2={y + H}
                  stroke={accent} strokeOpacity="0.12" strokeWidth="0.2"
                  strokeDasharray="0.9 0.6" />
            <circle cx={targetX} cy={y + H / 2} r="1.25"
                    fill={accent} fillOpacity={committed ? 0.82 : 0.45} />
          </g>
        );
      })}
      <text x="4" y="68" fontSize="2.0" fontFamily="var(--mono)" fill={accent} opacity="0.62">
        L:{leftN} R:{rightN} · bias={(Math.abs(leftN - rightN) / N * 100).toFixed(0)}%
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// R03 · MultiCLOPS — optogenetic closed-loop trail in circular arena
// ─────────────────────────────────────────────────────────────────────────────
const CLOPSPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const cx = 50, cy = 38, R = 26;

  const flyAngle  = t * 0.62;
  const flyRadius = 12 + Math.sin(t * 0.38) * 5;
  const fx = cx + flyRadius * Math.cos(flyAngle);
  const fy = cy + flyRadius * Math.sin(flyAngle) * 0.68;

  const spotAngle  = flyAngle + 0.52;
  const spotRadius = flyRadius * 0.82;
  const sx = cx + spotRadius * Math.cos(spotAngle);
  const sy = cy + spotRadius * Math.sin(spotAngle) * 0.68;

  const TRAIL = 20;
  const flyTrail = Array.from({ length: TRAIL }, (_, k) => {
    const at  = t - k * 0.055;
    const fa  = at * 0.62;
    const fr  = 12 + Math.sin(at * 0.38) * 5;
    return [cx + fr * Math.cos(fa), cy + fr * Math.sin(fa) * 0.68];
  });

  const pulseOn = (t * 20 % 1) < 0.5;

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <text x="4" y="6.5" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        MultiCLOPS · opto trail · 40Hz
      </text>
      {/* Arena */}
      <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.70}
               fill={accent} fillOpacity="0.04"
               stroke={accent} strokeOpacity="0.42" strokeWidth="0.45" />
      {/* Fly trail */}
      <polyline points={flyTrail.map(p => p.join(",")).join(" ")}
                fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="0.5" />
      {/* Fading opto history */}
      {flyTrail.slice(0, 7).map(([hx, hy], k) => {
        const dx = sx - fx, dy = sy - fy;
        return (
          <circle key={k} cx={hx + dx * 0.72} cy={hy + dy * 0.72}
                  r={2.2 - k * 0.22}
                  fill={accent} fillOpacity={Math.max(0, 0.26 - k * 0.035)} />
        );
      })}
      {/* Opto spot */}
      <circle cx={sx} cy={sy} r="4.2"
              fill={accent} fillOpacity={pulseOn ? 0.14 : 0.04}
              stroke={accent} strokeOpacity={pulseOn ? 0.72 : 0.18} strokeWidth="0.42" />
      <circle cx={sx} cy={sy} r="1.4"
              fill={accent} fillOpacity={pulseOn ? 0.88 : 0.18} />
      {pulseOn && Array.from({ length: 6 }, (_, k) => {
        const a = k * (Math.PI / 3);
        return (
          <line key={k}
                x1={sx + Math.cos(a) * 1.6} y1={sy + Math.sin(a) * 1.6}
                x2={sx + Math.cos(a) * 4.2} y2={sy + Math.sin(a) * 4.2}
                stroke={accent} strokeOpacity="0.55" strokeWidth="0.32" />
        );
      })}
      {/* Fly */}
      <ellipse cx={fx} cy={fy} rx="2.1" ry="1.15" fill={accent} fillOpacity="0.9" />
      <line x1={fx - 2.1} y1={fy} x2={fx - 5.5} y2={fy - 1.8}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.32" />
      <line x1={fx + 2.1} y1={fy} x2={fx + 5.5} y2={fy - 1.8}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.32" />
      <text x="4" y="67" fontSize="1.9" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        OR{Math.floor(t * 0.38) % 4 + 47}b · virtual pheromone
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// R04 · MultiBiOS — bilateral olfactometer: scope traces + fly + odor clouds
// ─────────────────────────────────────────────────────────────────────────────
const BiOSPreview = ({ accent = "currentColor" }) => {
  const t = useAnim();
  const PERIOD = 4;

  const lFn = (p) => p > 0.08 && p < 0.44;
  const rFn = (p) => p > 0.56 && p < 0.92;

  const ph = (t % PERIOD) / PERIOD;
  const lOn = lFn(ph);
  const rOn = rFn(ph);

  const makeTrace = (chanFn, yOn, yOff) => {
    const STEPS = 55, TRACE_W = 82, TX = 10;
    const pts = [];
    let prevOn = null;
    for (let i = 0; i <= STEPS; i++) {
      const at  = t - (STEPS - i) * 0.065;
      const p   = ((at % PERIOD) / PERIOD + 1) % 1;
      const on  = chanFn(p);
      const x   = TX + (i / STEPS) * TRACE_W;
      if (prevOn !== null && prevOn !== on) {
        pts.push(`${x.toFixed(2)},${(prevOn ? yOn : yOff).toFixed(2)}`);
      }
      pts.push(`${x.toFixed(2)},${(on ? yOn : yOff).toFixed(2)}`);
      prevOn = on;
    }
    return pts.join(" ");
  };

  const lTrace = makeTrace(lFn, 11.5, 17.5);
  const rTrace = makeTrace(rFn, 25.5, 31.5);
  const cx = 50, cy = 50;

  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      <text x="4" y="7" fontSize="2.3" fontFamily="var(--mono)" fill={accent} opacity="0.55">
        MultiBiOS · bilateral · NI-DAQ
      </text>
      <text x="4" y="16.5" fontSize="2.2" fontFamily="var(--mono)" fill={accent} opacity="0.72">L</text>
      <text x="4" y="30.5" fontSize="2.2" fontFamily="var(--mono)" fill={accent} opacity="0.72">R</text>
      <rect x="10" y="10" width="82" height="10" fill={accent} fillOpacity="0.05" rx="1" />
      <rect x="10" y="24" width="82" height="10" fill={accent} fillOpacity="0.05" rx="1" />
      <polyline points={lTrace} fill="none" stroke={accent} strokeOpacity="0.78" strokeWidth="0.55" />
      <polyline points={rTrace} fill="none" stroke={accent} strokeOpacity="0.78" strokeWidth="0.55" />
      {/* Ant body */}
      <ellipse cx={cx} cy={cy} rx="3.6" ry="1.85" fill={accent} fillOpacity="0.82" />
      <line x1={cx - 3.6} y1={cy} x2={cx - 8.5} y2={cy - 2.8}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.35" />
      <line x1={cx + 3.6} y1={cy} x2={cx + 8.5} y2={cy - 2.8}
            stroke={accent} strokeOpacity="0.65" strokeWidth="0.35" />
      <line x1={cx - 2} y1={cy - 1.6} x2={cx - 5} y2={cy - 4.5}
            stroke={accent} strokeOpacity="0.5" strokeWidth="0.28" />
      <line x1={cx + 2} y1={cy - 1.6} x2={cx + 5} y2={cy - 4.5}
            stroke={accent} strokeOpacity="0.5" strokeWidth="0.28" />
      {/* Left port */}
      <rect x="6" y={cy - 3} width="18" height="6" rx="2"
            fill={accent} fillOpacity={lOn ? 0.28 : 0.07}
            stroke={accent} strokeOpacity={lOn ? 0.75 : 0.28} strokeWidth="0.35" />
      {lOn && (
        <>
          <line x1="24" y1={cy} x2={cx - 3.6} y2={cy}
                stroke={accent} strokeOpacity="0.32" strokeWidth="0.5" strokeDasharray="1.2 0.8" />
          <circle cx="32" cy={cy} r={2.2 + Math.sin(t * 5.5) * 0.5}
                  fill={accent} fillOpacity="0.18" />
        </>
      )}
      {/* Right port */}
      <rect x="76" y={cy - 3} width="18" height="6" rx="2"
            fill={accent} fillOpacity={rOn ? 0.28 : 0.07}
            stroke={accent} strokeOpacity={rOn ? 0.75 : 0.28} strokeWidth="0.35" />
      {rOn && (
        <>
          <line x1={cx + 3.6} y1={cy} x2="76" y2={cy}
                stroke={accent} strokeOpacity="0.32" strokeWidth="0.5" strokeDasharray="1.2 0.8" />
          <circle cx="68" cy={cy} r={2.2 + Math.sin(t * 5.5) * 0.5}
                  fill={accent} fillOpacity="0.18" />
        </>
      )}
      <text x="4" y="68" fontSize="1.9" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        Teensy 4.1 · {lOn ? 'L odorA' : rOn ? 'R odorB' : 'baseline'} · 1ms res.
      </text>
    </svg>
  );
};

const PREVIEWS = {
  tracking:   TrackingPreview,
  projection: ProjectionPreview,
  rig:        RigPreview,
  map:        MapPreview,
  inventory:  InventoryPreview,
  stock:      StockPreview,
  flyball:    FlyOnBallPreview,
  maze:       MazePreview,
  clops:      CLOPSPreview,
  bios:       BiOSPreview,
};

window.ToolPreviews = PREVIEWS;
