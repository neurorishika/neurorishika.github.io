import React from "react";
// Small set of hooks used across the notebook theme for scroll-reactive alive-ness.

// Honour the OS-level "reduce motion" setting everywhere.
// A function, not a constant: MediaQueryList.matches is live, so toggling the OS setting
// takes effect on the next render without a reload.
// (Guarded so this module also loads in Node, where the page is prerendered at build time.)
const reducedMotionQuery =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
export const prefersReducedMotion = () => !!(reducedMotionQuery && reducedMotionQuery.matches);

// Run `fn` at most once per animation frame for a burst of scroll/resize events.
export function onScrollFrame(fn) {
  let queued = false;
  const handler = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
  window.addEventListener("scroll", handler, { passive: true });
  window.addEventListener("resize", handler);
  return () => {
    window.removeEventListener("scroll", handler);
    window.removeEventListener("resize", handler);
  };
}

// [ref, inView, progress]. Progress is 0 when the element's top is at the bottom of the
// viewport and 1 when its bottom reaches the top. Updates are rounded and frame-throttled,
// so components only re-render when something visibly changes.
export function useInView() {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      setInView(r.bottom > 0 && r.top < vh);
      const denom = vh + r.height;
      const p = denom > 0 ? 1 - (r.top + r.height) / denom : 0;
      setProgress(Math.round(Math.max(0, Math.min(1, p)) * 100) / 100);
    };
    update();
    return onScrollFrame(update);
  }, []);
  return [ref, inView, progress];
}

// Scroll position, capped at `max` so components stop re-rendering once their effect saturates.
export function useScrollY(max = Infinity) {
  const [y, setY] = React.useState(0);
  React.useEffect(() => {
    const update = () => setY(Math.min(max, Math.round(window.scrollY)));
    update();
    return onScrollFrame(update);
  }, [max]);
  return y;
}

export function useHashRoute() {
  const [hash, setHash] = React.useState(() => (typeof window !== "undefined" && window.location.hash) || "");
  React.useEffect(() => {
    const on = () => setHash(window.location.hash || "");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

// Reveal wrapper: fades + translates children on first in-view.
// `as` sets the wrapper element, e.g. as="li" inside lists so the markup stays valid.
// Always starts un-revealed so the prerendered HTML and the first client render match;
// the hiding itself is CSS gated on html.js, so without JavaScript everything is visible.
export function Reveal({ children, delay = 0, y = 28, className = "", as: Tag = "div" }) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (shown) return undefined;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") { setShown(true); return undefined; }
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref}
         className={`reveal${shown ? " on" : ""}${className ? ` ${className}` : ""}`}
         style={{ transitionDelay: `${delay}ms`, "--reveal-delay": `${delay}ms`, "--reveal-y": `${y}px` }}>
      {children}
    </Tag>
  );
}
