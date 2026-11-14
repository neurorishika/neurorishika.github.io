import React from "react";
import { SITE_DATA } from "./data.js";
import { Reveal, useInView } from "./hooks.jsx";
// Page sections.

// Owns the scroll-driven underbar, so only the header re-renders while scrolling.
const SectionHead = ({ eyebrow, title, sub }) => {
  const [headRef, , progress] = useInView();
  const underbarW = Math.min(44, Math.round(progress * 180));
  return (
    <div className="section-head" ref={headRef} style={{ "--underbar-w": `${underbarW}px` }}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      {title && <h2 className="section-title">{title}</h2>}
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
};

const Section = ({ id, eyebrow, title, sub, children, className = "", bg }) => {
  return (
    <section id={id} className={`section ${className}`} data-screen-label={id}
             {...(bg ? { "data-bg": bg } : {})}>
      <div className="section-inner">
        <Reveal>
          <SectionHead eyebrow={eyebrow} title={title} sub={sub} />
        </Reveal>
        <div className="section-body">{children}</div>
      </div>
    </section>
  );
};

// ------------------------------ Pillars ------------------------------
const PillarsSection = () => {
  const pillars = SITE_DATA.pillars;
  const [active, setActive] = React.useState(pillars[0].id);
  const cur = pillars.find(p => p.id === active);
  const tabRefs = React.useRef([]);
  const onTabKey = (e, i) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + pillars.length) % pillars.length;
    setActive(pillars[next].id);
    tabRefs.current[next]?.focus();
  };
  return (
    <Section id="research" eyebrow="// research" bg="b1"
             title="Three questions I keep returning to">
      <div className="pillars">
        <div className="pillar-tabs" role="tablist" aria-orientation="vertical" aria-label="Research questions">
          {pillars.map((p, i) => (
            <Reveal key={p.id} delay={i * 80}>
              <button className={`pillar-tab ${active === p.id ? "on" : ""}`}
                      ref={(el) => { tabRefs.current[i] = el; }}
                      id={`pillar-tab-${p.id}`} role="tab" type="button"
                      aria-selected={active === p.id} aria-controls="pillar-panel"
                      tabIndex={active === p.id ? 0 : -1}
                      onKeyDown={(e) => onTabKey(e, i)}
                      onClick={() => setActive(p.id)}>
                <span className="pillar-num">0{i + 1}</span>
                <span className="pillar-label">{p.title}</span>
              </button>
            </Reveal>
          ))}
        </div>
        <div className="pillar-body" key={cur.id} id="pillar-panel"
             role="tabpanel" aria-labelledby={`pillar-tab-${cur.id}`}>
          <p className="pillar-lede">{cur.lede}</p>
          <ul className="pillar-threads">
            {cur.threads.map((th, i) => (
              <li key={i} style={{ animationDelay: `${i * 60}ms` }} className="pillar-thread-in">
                <span className="thread-year">{th.y}</span>
                <span className="thread-t">{th.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
};

// ------------------------------ Models ------------------------------
const ModelsSection = () => {
  const { models, modelsIntro } = SITE_DATA;
  return (
    <Section id="models" eyebrow="// models" title="Models I've built" sub={modelsIntro}>
      <div className="rigs">
        {models.map((m, i) => <RigCard key={m.name} r={m} i={i} prefix="M" />)}
      </div>
    </Section>
  );
};

// ------------------------------ Tools ------------------------------
const ToolCard = ({ t }) => (
  <Reveal>
    <div className="tool-card">
      <div className="tool-meta">
        <div className="tool-top">
          <span className="tool-tag">{t.tag}</span>
          <span className="tool-year">{t.year}</span>
        </div>
        {t.href
          ? <a href={t.href} target="_blank" rel="noreferrer" className="tool-name-link">
              <h3 className="tool-name">{t.name}</h3>
            </a>
          : <h3 className="tool-name">{t.name}</h3>}
        <p className="tool-blurb">{t.blurb}</p>
        <div className="tool-bottom">
          <span className="tool-lang">{t.lang}</span>
          {t.href
            ? <a className="tool-repo" href={t.href} target="_blank" rel="noreferrer">github ↗</a>
            : <span className="tool-private">lab-internal</span>}
        </div>
      </div>
    </div>
  </Reveal>
);

const ToolsSection = () => {
  const tools = SITE_DATA.tools;
  return (
    <Section id="tools" eyebrow="// tools" bg="b2"
             title="Software I've built">
      <div className="tools-grid">
        {tools.map((t) => <ToolCard key={t.name} t={t} />)}
      </div>
    </Section>
  );
};

// ------------------------------ Rigs ------------------------------
const RigCard = ({ r, i, prefix = "R" }) => {
  return (
    <Reveal delay={i * 100}>
      <div className="rig-card">
        <div className="rig-card-body">
          <div className="rig-num">{prefix}{String(i + 1).padStart(2, "0")}</div>
          <div>
            <h3>{r.name}</h3>
            <div className="rig-year">{r.year}</div>
            <p>{r.desc}</p>
            {r.href && (
              <a className="tool-repo rig-link" href={r.href} target="_blank" rel="noreferrer">
                {r.linkLabel || "link ↗"}
              </a>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
};

const RigsSection = () => {
  const rigs = SITE_DATA.rigs;
  return (
    <Section id="rigs" eyebrow="// rigs"
             title="Behavioral rigs">
      <div className="rigs">
        {rigs.map((r, i) => <RigCard key={i} r={r} i={i} />)}
      </div>
    </Section>
  );
};

// ------------------------------ Pubs ------------------------------
const PubsSection = () => {
  const pubs = SITE_DATA.publications;
  return (
    <Section id="publications" eyebrow="// publications" bg="b3" title="Papers & preprints">
      <ol className="pubs">
        {pubs.map((p, i) => (
          <Reveal as="li" key={p.n} delay={i * 50}>
            <div className="pub-n">{String(p.n).padStart(2, "0")}</div>
            <div className="pub-body">
              <div className="pub-authors">{p.authors}</div>
              {p.href
                ? <a className="pub-title" href={p.href} target="_blank" rel="noreferrer">{p.title}</a>
                : <span className="pub-title">{p.title}</span>
              }
              <div className="pub-venue">
                <span>{p.venue}</span>
                <span className="pub-dot">·</span>
                <span>{p.year}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
      {pubs.some(p => p.authors.includes("*")) && (
        <p className="pubs-note">* equal contribution</p>
      )}
    </Section>
  );
};

// ------------------------------ Talks ------------------------------
const TalksSection = () => {
  const t = SITE_DATA.talksAndPosters;
  return (
    <Section id="talks" eyebrow="// talks" title="Selected talks and posters">
      <ul className="talks">
        {t.map((x, i) => (
          <Reveal as="li" key={i} delay={i * 40}>
            <span className="talk-kind">{x.kind}</span>
            <span className="talk-year">{x.year}</span>
            <div className="talk-body">
              {x.href
                ? <a href={x.href} target="_blank" rel="noreferrer">{x.title}</a>
                : <span>{x.title}</span>}
              <div className="talk-venue">{x.venue}</div>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Teaching ------------------------------
const TeachingSection = () => {
  const t = SITE_DATA.teaching;
  return (
    <Section id="teaching" eyebrow="// teaching" bg="b4" title="Teaching, mentorship & service">
      <ul className="teaching">
        {t.map((x, i) => (
          <Reveal as="li" key={i} delay={i * 40}>
            <span className="teach-year">{x.y}</span>
            <span>{x.t}</span>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Timeline ------------------------------
const TimelineSection = () => {
  const t = SITE_DATA.timeline;
  return (
    <Section id="path" eyebrow="// path" title="Academic path">
      <ul className="timeline">
        {t.map((x, i) => (
          <Reveal as="li" key={i} delay={i * 60}>
            <div className="tl-year">{x.y}</div>
            <div className="tl-body">
              <div className="tl-title">{x.t}</div>
              <div className="tl-sub">{x.sub}</div>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Contact ------------------------------
const ContactSection = () => {
  const id = SITE_DATA.identity;
  return (
    <Section id="contact" eyebrow="// contact" title="Reach out"
             bg="d">
      <div className="contact">
        <Reveal>
          <img className="contact-portrait" src="/img/portrait-480.jpg" width="240" height="240"
               alt="Rishika Mohanta" loading="lazy" decoding="async" />
        </Reveal>
        <div className="contact-emails">
          <Reveal><div><span className="c-label">work</span><span className="c-val">{id.emails.work}</span></div></Reveal>
          <Reveal delay={80}><div><span className="c-label">personal</span><span className="c-val">{id.emails.personal}</span></div></Reveal>
          <Reveal delay={160}><div><span className="c-label">location</span><span className="c-val">{id.location}</span></div></Reveal>
        </div>
        <div className="contact-social">
          {id.social.map((s, i) => (
            <Reveal key={s.k} delay={i * 40}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label} <span className="arrow">↗</span>
              </a>
            </Reveal>
          ))}
          <Reveal delay={id.social.length * 40}>
            <a href={id.cv} target="_blank" rel="noreferrer">
              CV (pdf) <span className="arrow">↗</span>
            </a>
          </Reveal>
        </div>
        <Reveal>
          <div className="contact-ttrpg">
            <span className="ttrpg-label">off-hours</span>
            <span>I also run tabletop RPGs (Pathfinder 2e, currently).</span>
          </div>
        </Reveal>
      </div>
    </Section>
  );
};

export {
  PillarsSection, ModelsSection, ToolsSection, RigsSection,
  PubsSection, TalksSection, TeachingSection, TimelineSection, ContactSection,
};
