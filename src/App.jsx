import React from "react";
import { flushSync } from "react-dom";
import { SITE_DATA } from "./data.js";
import { prefersReducedMotion, onScrollFrame, useInView, useScrollY, useHashRoute } from "./hooks.jsx";
import BrainMap, { DIAGRAM_SCALE } from "./BrainMap.jsx";
import {
  PillarsSection, ModelsSection, ToolsSection, RigsSection,
  PubsSection, TalksSection, TeachingSection, TimelineSection, ContactSection,
} from "./Sections.jsx";
// App shell: field notebook theme only.

const Hero = () => {
  const id = SITE_DATA.identity;
  const [ref, inView, progress] = useInView();
  const reduced = prefersReducedMotion();
  // Every effect below saturates by ~750px of scroll, so stop re-rendering after that.
  const y = useScrollY(800);
  const textDrift = reduced ? 0 : Math.min(60, y * 0.08);
  const brainDrift = reduced ? 0 : Math.min(120, y * 0.30);

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
          <a href="#models">models ↓</a>
          <a href="#tools">tools ↓</a>
          <a href="#contact">contact ↓</a>
          <a href={id.cv} target="_blank" rel="noreferrer">CV (pdf) ↗</a>
        </div>
      </div>
      <div className="hero-right" data-label="insect olfactory circuit, frontal view"
           style={{ transform: `translateY(${brainDrift}px)`, width: `${DIAGRAM_SCALE * 100}%`, justifySelf: 'center' }}>
        <BrainMap alive={inView && !reduced} scrollProgress={progress} />
      </div>

      <div className="scroll-hint" style={{ opacity: Math.max(0, 1 - y / 140) }}>
        <span>scroll</span>
        <span className="scroll-hint-bar"><span className="scroll-hint-fill" /></span>
      </div>
    </section>
  );
};

const SECTIONS = ["research", "models", "tools", "rigs", "publications", "talks", "teaching", "path", "contact"];
const RAIL_BG_TYPE = { research: "tint", tools: "tint", publications: "tint", teaching: "tint", contact: "dark" };

// Which section is under the 40% line of the viewport, plus overall scroll fraction.
// At the very bottom of the page the last section wins, even if it's too short to reach the line.
const useActiveSection = () => {
  const [state, setState] = React.useState({ active: "", pct: 0 });
  React.useEffect(() => {
    const measure = () => {
      const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const mid = window.innerHeight * 0.4;
      let active = "";
      for (const s of SECTIONS) {
        const el = document.getElementById(s);
        if (el && el.getBoundingClientRect().top <= mid) active = s;
      }
      if (window.scrollY >= docH - 2) active = SECTIONS[SECTIONS.length - 1];
      const pct = Math.round(Math.max(0, Math.min(1, window.scrollY / docH)) * 1000) / 1000;
      setState((prev) => (prev.active === active && prev.pct === pct ? prev : { active, pct }));
    };
    measure();
    return onScrollFrame(measure);
  }, []);
  return state;
};

// Owns the scroll tracking, so scrolling re-renders only the navigation, never the page.
const NavChrome = () => {
  const { active, pct } = useActiveSection();
  return (
    <>
      <TopNav active={active} />
      <ProgressRail active={active} pct={pct} />
    </>
  );
};

// Side rail: wide screens only (hidden below 1560px in CSS).
const ProgressRail = ({ active, pct }) => {
  const bgType = RAIL_BG_TYPE[active] || "";
  return (
    <nav className={`rail${bgType ? ` rail--${bgType}` : ""}`} aria-label="Sections">
      <div className="rail-line" aria-hidden="true">
        <div className="rail-fill" style={{ height: `${pct * 100}%` }} />
        <div className="rail-tick" style={{ top: `${pct * 100}%` }} />
      </div>
      <ul className="rail-sections">
        {SECTIONS.map(s => (
          <li key={s} className={active === s ? "on" : ""}>
            <a href={`#${s}`} aria-current={active === s ? "true" : undefined}>{s}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Slim sticky top bar: shown wherever the rail is hidden; collapses to a menu on phones.
const TopNav = ({ active }) => {
  const [open, setOpen] = React.useState(false);
  /* collapse the menu before the browser scrolls to the anchor, so the jump
     is measured with the menu closed (otherwise it lands past the heading) */
  const close = () => flushSync(() => setOpen(false));
  return (
    <nav className={`topnav${open ? " topnav--open" : ""}`} aria-label="Sections">
      <a className="topnav-brand" href="#" onClick={close}>rishika mohanta</a>
      <button className="topnav-toggle" type="button" aria-expanded={open}
              aria-controls="topnav-links" onClick={() => setOpen(o => !o)}>
        {open ? "close" : "menu"}
      </button>
      <ul className="topnav-links" id="topnav-links">
        {SECTIONS.map(s => (
          <li key={s}>
            <a href={`#${s}`} className={active === s ? "on" : ""} onClick={close}
               aria-current={active === s ? "true" : undefined}>{s}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const App = () => {
  const route = useHashRoute();
  const landed = React.useRef(false);

  React.useEffect(() => {
    // Old deep-dive links (#/tools/…, #/research/…) no longer exist: drop them and land at the top.
    if (route.startsWith("#/")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent("hashchange"));   /* keep route state in sync with the URL */
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    // Arriving with #section: the browser tried to scroll before React rendered the target,
    // so scroll once after first render. Later in-page clicks are left to the browser.
    if (landed.current) return;
    landed.current = true;
    if (route === "" || route === "#") return;
    const el = document.getElementById(route.slice(1));
    if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
  }, [route]);

  return (
    <div className="page">
      <NavChrome />
      <main id="main">
        <Hero />
        <PillarsSection />
        <ModelsSection />
        <ToolsSection />
        <RigsSection />
        <PubsSection />
        <TalksSection />
        <TeachingSection />
        <TimelineSection />
        <ContactSection />
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} · rishika mohanta</span>
      </footer>
    </div>
  );
};

export default App;
