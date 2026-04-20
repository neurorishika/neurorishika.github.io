// Mini live previews for each tool card. Lightweight SVG sketches.

const TrackingPreview = ({ accent = "currentColor" }) => {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => { setT(v => v + (now - last) / 1000); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
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
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => { setT(v => v + (now - last) / 1000); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
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
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(v => v + 1), 220);
    return () => clearInterval(id);
  }, []);
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

const MapPreview = ({ accent = "currentColor" }) => {
  const dots = React.useMemo(() => Array.from({ length: 38 }, () => ({
    x: Math.random() * 90 + 5,
    y: Math.random() * 58 + 6,
    r: Math.random() * 1.2 + 0.4,
  })), []);
  return (
    <svg viewBox="0 0 100 70" className="tp-svg">
      {[1, 2, 3].map(i => (
        <path key={i}
          d={`M 5 ${20 + i * 8} Q 30 ${10 + i * 6}, 50 ${22 + i * 5} T 95 ${25 + i * 7}`}
          fill="none" stroke={accent} strokeOpacity={0.12 + i * 0.05} strokeWidth="0.3" />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={accent}
                fillOpacity={0.3 + d.r * 0.3} />
      ))}
      <text x="4" y="66" fontSize="2.6" fontFamily="var(--mono)" fill={accent} opacity="0.5">
        n = {dots.length} agents · simulation
      </text>
    </svg>
  );
};

const InventoryPreview = ({ accent = "currentColor" }) => (
  <svg viewBox="0 0 100 70" className="tp-svg">
    {Array.from({ length: 6 }).map((_, i) => (
      <g key={i}>
        <rect x="8" y={10 + i * 9} width="84" height="6"
              fill={accent} fillOpacity={i % 2 ? 0.03 : 0.07} />
        <rect x="10" y={12 + i * 9} width="2" height="2" fill={accent} fillOpacity="0.8" />
        <line x1="14" y1={13 + i * 9} x2={40 + (i * 7) % 30} y2={13 + i * 9}
              stroke={accent} strokeOpacity="0.55" strokeWidth="0.45" />
        <line x1="60" y1={13 + i * 9} x2={72 + (i * 3) % 10} y2={13 + i * 9}
              stroke={accent} strokeOpacity="0.35" strokeWidth="0.45" />
        <rect x="82" y={11 + i * 9} width="4" height="4"
              fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="0.25" />
      </g>
    ))}
    <text x="8" y="6" fontSize="2.6" fontFamily="var(--mono)" fill={accent} opacity="0.55">
      lab.inventory · 247 items
    </text>
  </svg>
);

const StockPreview = ({ accent = "currentColor" }) => (
  <svg viewBox="0 0 100 70" className="tp-svg">
    {[[50,14],[25,34],[75,34],[14,54],[36,54],[64,54],[86,54]].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="2.5" fill="none" stroke={accent} strokeOpacity="0.7" strokeWidth="0.35" />
        <text x={x} y={y + 5.5} textAnchor="middle" fontSize="2" fontFamily="var(--mono)"
              fill={accent} opacity="0.6">v{i + 1}</text>
      </g>
    ))}
    {[[50,14,25,34],[50,14,75,34],[25,34,14,54],[25,34,36,54],[75,34,64,54],[75,34,86,54]].map(([x1,y1,x2,y2], i) => (
      <line key={i} x1={x1} y1={y1 + 2.5} x2={x2} y2={y2 - 2.5}
            stroke={accent} strokeOpacity="0.35" strokeWidth="0.3" />
    ))}
    <text x="4" y="66" fontSize="2.6" fontFamily="var(--mono)" fill={accent} opacity="0.5">
      genotype: w⁻;UAS-GCaMP7f/+;MB247-Gal4/+
    </text>
  </svg>
);

const PREVIEWS = {
  tracking: TrackingPreview,
  projection: ProjectionPreview,
  rig: RigPreview,
  map: MapPreview,
  inventory: InventoryPreview,
  stock: StockPreview,
};

window.ToolPreviews = PREVIEWS;
