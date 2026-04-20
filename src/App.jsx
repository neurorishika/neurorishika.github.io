// App shell — field notebook theme only.

const SECTION_BG = {
  hero:         "#e6dfcf",
  now:          "#efe9dd",
  research:     "#f0cdb0",
  tools:        "#efe9dd",
  rigs:         "#f0cdb0",
  publications: "#efe9dd",
  talks:        "#f0cdb0",
  teaching:     "#efe9dd",
  path:         "#f0cdb0",
  contact:      "#b0532a",
};

const Hero = () => {
  const id = window.SITE_DATA.identity;
  const [ref, , progress] = window.useInView();
  const y = window.useScrollY();
  const textDrift = Math.min(60, y * 0.08);
  const brainDrift = Math.min(120, y * 0.30);

  return (
    <section className="hero" data-screen-label="hero" ref={ref}>
      <div className="hero-left" style={{ transform: `translateY(${-textDrift}px)` }}>
        <div className="eyebrow">// neuroscientist · toolmaker · {id.location.toLowerCase()}</div>
        <h1 className="hero-name">
          <span>Rishika</span>
          <span className="surname">Mohanta</span>
        </h1>
        <div className="hero-pronunciation">{id.pronunciation} · {id.pronouns}</div>
        <p className="hero-tag">{id.tagline}</p>
        <p className="hero-pitch">{id.pitch}</p>
        <div className="hero-meta">
          <a href="#research">research ↓</a>
          <a href="#tools">tools ↓</a>
          <a href="#contact">contact ↓</a>
          <a href="https://neurorishika.github.io/CV/rm-cv.pdf" target="_blank" rel="noreferrer">CV (pdf) ↗</a>
        </div>
      </div>
      <div className="hero-right" data-label="fig. 01 · insect olfactory circuit, frontal view"
           style={{ transform: `translateY(${brainDrift}px)`, width: `${(window.DIAGRAM_SCALE || 1) * 100}%`, justifySelf: 'center' }}>
        <window.BrainMap alive={true} scrollProgress={progress} />
      </div>

      <div className="scroll-hint" style={{ opacity: Math.max(0, 1 - y / 140) }}>
        <span>scroll</span>
        <span className="scroll-hint-bar"><span className="scroll-hint-fill" /></span>
      </div>
    </section>
  );
};

const RAIL_BG_TYPE = { research: "tint", rigs: "tint", talks: "tint", path: "tint", contact: "dark" };

const ProgressRail = () => {
  const sections = ["now", "research", "tools", "rigs", "publications", "talks", "teaching", "path", "contact"];
  const [active, setActive] = React.useState("");
  const [y, setY] = React.useState(0);
  const [docH, setDocH] = React.useState(1);
  React.useEffect(() => {
    const on = () => {
      setY(window.scrollY);
      setDocH(document.documentElement.scrollHeight - window.innerHeight);
      const mid = window.scrollY + window.innerHeight * 0.4;
      let cur = "";
      for (const s of sections) {
        const el = document.getElementById(s);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= mid) cur = s;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    on();
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const pct = Math.max(0, Math.min(1, y / Math.max(1, docH)));
  const bgType = RAIL_BG_TYPE[active] || "";
  return (
    <div className={`rail${bgType ? ` rail--${bgType}` : ""}`} aria-hidden="true">
      <div className="rail-line">
        <div className="rail-fill" style={{ height: `${pct * 100}%` }} />
        <div className="rail-tick" style={{ top: `${pct * 100}%` }} />
      </div>
      <ul className="rail-sections">
        {sections.map(s => (
          <li key={s} className={active === s ? "on" : ""}>
            <a href={`#${s}`}>{s}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const App = () => {
  const route = window.useHashRoute();

  React.useEffect(() => {
    if (route && route.startsWith("#/")) window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);

  const isDetail = route && route.startsWith("#/");

  return (
    <div className="page">
      {isDetail ? (
        <window.Router route={route} />
      ) : (
        <>
          <ProgressRail />
          <Hero />
          <window.NowSection />
          <window.PillarsSection />
          <window.ToolsSection />
          <window.RigsSection />
          <window.PubsSection />
          <window.TalksSection />
          <window.TeachingSection />
          <window.TimelineSection />
          <window.ContactSection />
        </>
      )}

      <footer className="footer">
        <span>© 2026 · rishika mohanta</span>
        <span>redesigned 2026 · field notebook</span>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
