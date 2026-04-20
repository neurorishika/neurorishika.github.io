// Small set of hooks used across the notebook theme for scroll-reactive alive-ness.

window.useInView = function useInView(options = {}) {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible = r.bottom > 0 && r.top < vh;
      setInView(visible);
      // progress: 0 when element's top at bottom of viewport; 1 when bottom at top
      const denom = vh + r.height;
      const p = denom > 0 ? 1 - (r.top + r.height) / denom : 0;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return [ref, inView, progress];
};

window.useScrollY = function useScrollY() {
  const [y, setY] = React.useState(0);
  React.useEffect(() => {
    const on = () => setY(window.scrollY);
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => window.removeEventListener("scroll", on);
  }, []);
  return y;
};

window.useHashRoute = function useHashRoute() {
  const [hash, setHash] = React.useState(() => window.location.hash || "");
  React.useEffect(() => {
    const on = () => setHash(window.location.hash || "");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
};

// Spring physics — returns current angle (degrees) driven by scroll velocity.
window.useSpring = function useSpring(stiffness = 90, damping = 8) {
  const [angle, setAngle] = React.useState(0);
  const state = React.useRef({ pos: 0, vel: 0 });
  const lastY = React.useRef(window.scrollY);
  const raf = React.useRef(null);

  React.useEffect(() => {
    const tick = () => {
      const s = state.current;
      const a = -stiffness * s.pos - damping * s.vel;
      s.vel += a / 60;
      s.pos += s.vel / 60;
      if (Math.abs(s.pos) > 0.005 || Math.abs(s.vel) > 0.005) {
        setAngle(s.pos);
        raf.current = requestAnimationFrame(tick);
      } else {
        s.pos = 0; s.vel = 0;
        setAngle(0);
        raf.current = null;
      }
    };
    const onScroll = () => {
      const dy = window.scrollY - lastY.current;
      lastY.current = window.scrollY;
      state.current.vel += dy * 0.35;
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [stiffness, damping]);

  return angle;
};

// Animated page background — interpolates --bg-now across section colour boundaries.
function lerpRGB(hexA, hexB, t) {
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const ease = x => x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2;
  const [ar,ag,ab] = parse(hexA), [br,bg,bb] = parse(hexB);
  const k = ease(Math.max(0, Math.min(1, t)));
  return `rgb(${Math.round(ar+(br-ar)*k)},${Math.round(ag+(bg-ag)*k)},${Math.round(ab+(bb-ab)*k)})`;
}

window.usePageBg = function usePageBg(sectionColors) {
  React.useEffect(() => {
    const keys = Object.keys(sectionColors);
    const update = () => {
      const vh = window.innerHeight;
      let color = sectionColors[keys[0]];
      for (let i = 0; i < keys.length - 1; i++) {
        const nextEl = document.getElementById(keys[i + 1]);
        if (!nextEl) continue;
        const nextTop = nextEl.getBoundingClientRect().top;
        if (nextTop >= vh * 0.7) break;
        if (nextTop <= vh * 0.3) {
          color = sectionColors[keys[i + 1]];
        } else {
          color = lerpRGB(sectionColors[keys[i]], sectionColors[keys[i + 1]], (vh * 0.7 - nextTop) / (vh * 0.4));
          break;
        }
      }
      document.documentElement.style.setProperty('--bg-now', color);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
};

// Reveal wrapper: fades + translates children on first in-view.
window.Reveal = function Reveal({ children, delay = 0, y = 28, from = "bottom", className = "" }) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.90 && r.bottom > 0) {
        setShown(true);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [shown]);
  const translateInit = from === "left" ? "translateX(var(--reveal-x,-32px))"
                      : from === "right" ? "translateX(calc(-1 * var(--reveal-x,-32px)))"
                      : "translateY(var(--reveal-y,28px))";
  return (
    <div ref={ref}
         className={`reveal ${shown ? "on" : ""} ${className}`}
         style={{ transitionDelay: `${delay}ms`, ["--reveal-y"]: `${y}px`, ["--reveal-x"]: "32px" }}>
      {children}
    </div>
  );
};
