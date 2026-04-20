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
