// Sections with scroll-alive behaviors + marginalia.

const Marginalia = ({ children, rotate = -2, delay = 0, stiffness = 90, damping = 8 }) => {
  const swing = window.useSpring(stiffness, damping);
  return (
    <window.Reveal delay={delay} y={20} className="marginalia-wrap">
      <div className="marginalia"
           style={{ transform: `rotate(${rotate + swing}deg)` }}>
        {children}
      </div>
    </window.Reveal>
  );
};

const Section = ({ id, eyebrow, title, sub, children, className = "", margin, bg }) => {
  const [headRef, , progress] = window.useInView();
  const underbarW = Math.min(44, progress * 180);
  return (
    <section id={id} className={`section ${className}`} data-screen-label={id}
             {...(bg ? { "data-bg": bg } : {})}>
      <div className="section-inner">
        <window.Reveal>
          <div className="section-head" ref={headRef} style={{ "--underbar-w": `${underbarW}px` }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="section-title">{title}</h2>}
            {sub && <p className="section-sub">{sub}</p>}
          </div>
        </window.Reveal>
        <div className="section-body">{children}</div>
      </div>
      {margin && <div className="section-margin">{margin}</div>}
    </section>
  );
};

// ------------------------------ Now ------------------------------
const NowSection = () => {
  const d = window.SITE_DATA.now;
  return (
    <Section id="now" eyebrow="// now"
             title="What I'm working on right now"
             sub={`updated ${d.updated}`}
             margin={<Marginalia rotate={3} stiffness={82} damping={7}>a "now page" — a snapshot of current focus, revisited monthly</Marginalia>}>
      <ul className="now-list">
        {d.items.map((it, i) => (
          <window.Reveal key={i} delay={i * 70}>
            <li>
              <span className="now-dot" />
              <span>{it}</span>
            </li>
          </window.Reveal>
        ))}
      </ul>
      <window.Reveal delay={d.items.length * 70}>
        <a href="#/now/archive" className="ghost-link">see past focuses →</a>
      </window.Reveal>
    </Section>
  );
};

// ------------------------------ Pillars ------------------------------
const PillarsSection = () => {
  const pillars = window.SITE_DATA.pillars;
  const [active, setActive] = React.useState(pillars[0].id);
  const cur = pillars.find(p => p.id === active);
  return (
    <Section id="research" eyebrow="// research" bg="b1"
             title="Three questions I keep returning to"
             sub="Organized by theme, not chronology. Each thread is a project — click through for the full story."
             margin={<Marginalia rotate={-4} stiffness={96} damping={9}>the three pillars interlock — you can't study variation without building tools to measure it</Marginalia>}>
      <div className="pillars">
        <div className="pillar-tabs">
          {pillars.map((p, i) => (
            <window.Reveal key={p.id} delay={i * 80}>
              <button className={`pillar-tab ${active === p.id ? "on" : ""}`}
                      onClick={() => setActive(p.id)}>
                <span className="pillar-num">0{i + 1}</span>
                <span className="pillar-label">{p.title}</span>
              </button>
            </window.Reveal>
          ))}
        </div>
        <div className="pillar-body" key={cur.id}>
          <p className="pillar-lede">{cur.lede}</p>
          <ul className="pillar-threads">
            {cur.threads.map((th, i) => (
              <li key={i} style={{ animationDelay: `${i * 60}ms` }} className="pillar-thread-in">
                <span className="thread-year">{th.y}</span>
                <span className="thread-t">{th.t}</span>
              </li>
            ))}
          </ul>
          <a href={`#/research/${cur.id}`} className="ghost-link">
            read the {cur.title.toLowerCase()} deep-dive →
          </a>
        </div>
      </div>
    </Section>
  );
};

// ------------------------------ Tools ------------------------------
const ToolCard = ({ t }) => {
  const cardRef = React.useRef(null);
  const Preview = window.ToolPreviews[t.preview];

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-4px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
  };

  return (
    <window.Reveal>
      <div className="tool-card" ref={cardRef}
           onMouseMove={handleMouseMove}
           onMouseLeave={handleMouseLeave}>
        <a className="tool-card-link" href={t.href} target="_blank" rel="noreferrer">↗</a>
        <div className="tool-preview">
          <Preview />
        </div>
        <div className="tool-meta">
          <div className="tool-top">
            <span className="tool-tag">{t.tag}</span>
            <span className="tool-year">{t.year}</span>
          </div>
          <a href={`#/tools/${encodeURIComponent(t.name)}`}
             className="tool-name-link">
            <h3 className="tool-name">{t.name}</h3>
          </a>
          <p className="tool-blurb">{t.blurb}</p>
          <div className="tool-bottom">
            <span className="tool-lang">{t.lang}</span>
            <span className="tool-status"><i className="status-dot" />{t.status}</span>
          </div>
          <div className="tool-actions">
            <a href={`#/tools/${encodeURIComponent(t.name)}`}>deep-dive →</a>
            <a href={t.href} target="_blank" rel="noreferrer">github ↗</a>
          </div>
        </div>
      </div>
    </window.Reveal>
  );
};

const ToolsSection = () => {
  const tools = window.SITE_DATA.tools;
  return (
    <Section id="tools" eyebrow="// software"
             title="Software I've built"
             sub="Open-source where possible. Previews are live — hover a card to see them animate."
             margin={<Marginalia rotate={2} stiffness={88} damping={8}>measurement is half the science. good tools compound across labs.</Marginalia>}>
      <div className="tools-grid">
        {tools.map((t, i) => <ToolCard key={t.name} t={t} />)}
      </div>
    </Section>
  );
};

// ------------------------------ Rigs ------------------------------
const RigCard = ({ r, i }) => {
  const Preview = r.preview ? window.ToolPreviews[r.preview] : null;
  const cardRef = React.useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-3px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
  };

  return (
    <window.Reveal delay={i * 100}>
      <div className="rig-card" ref={cardRef}
           onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        {Preview && (
          <div className="tool-preview">
            <Preview />
          </div>
        )}
        <div className="rig-card-body">
          <div className="rig-num">R{String(i + 1).padStart(2, "0")}</div>
          <div>
            <h3>{r.name}</h3>
            <div className="rig-year">{r.year}</div>
            <p>{r.desc}</p>
          </div>
        </div>
      </div>
    </window.Reveal>
  );
};

const RigsSection = () => {
  const rigs = window.SITE_DATA.rigs;
  return (
    <Section id="rigs" eyebrow="// hardware" bg="b2"
             title="Behavioral rigs"
             sub="Custom-built experimental platforms. Opinionated about sync, boring about reliability."
             margin={<Marginalia rotate={-3} stiffness={102} damping={10}>"if the rig isn't quiet, the data isn't either." — folk wisdom</Marginalia>}>
      <div className="rigs">
        {rigs.map((r, i) => <RigCard key={i} r={r} i={i} />)}
      </div>
    </Section>
  );
};

// ------------------------------ Pubs ------------------------------
const PubsSection = () => {
  const pubs = window.SITE_DATA.publications;
  return (
    <Section id="publications" eyebrow="// publications" title="Peer-reviewed & conference papers">
      <ol className="pubs">
        {pubs.map((p, i) => (
          <window.Reveal key={p.n} delay={i * 50}>
            <li>
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
            </li>
          </window.Reveal>
        ))}
      </ol>
    </Section>
  );
};

// ------------------------------ Talks ------------------------------
const TalksSection = () => {
  const t = window.SITE_DATA.talksAndPosters;
  return (
    <Section id="talks" eyebrow="// talks & posters" bg="b3" title="Selected talks and posters">
      <ul className="talks">
        {t.map((x, i) => (
          <window.Reveal key={i} delay={i * 40}>
            <li>
              <span className="talk-kind">{x.kind}</span>
              <span className="talk-year">{x.year}</span>
              <div className="talk-body">
                {x.href
                  ? <a href={x.href} target="_blank" rel="noreferrer">{x.title}</a>
                  : <span>{x.title}</span>}
                <div className="talk-venue">{x.venue}</div>
              </div>
            </li>
          </window.Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Teaching ------------------------------
const TeachingSection = () => {
  const t = window.SITE_DATA.teaching;
  return (
    <Section id="teaching" eyebrow="// teaching" title="Teaching & mentorship">
      <ul className="teaching">
        {t.map((x, i) => (
          <window.Reveal key={i} delay={i * 40}>
            <li>
              <span className="teach-year">{x.y}</span>
              <span>{x.t}</span>
            </li>
          </window.Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Timeline ------------------------------
const TimelineSection = () => {
  const t = window.SITE_DATA.timeline;
  return (
    <Section id="path" eyebrow="// path" bg="b4" title="Academic path">
      <ul className="timeline">
        {t.map((x, i) => (
          <window.Reveal key={i} delay={i * 60}>
            <li>
              <div className="tl-year">{x.y}</div>
              <div className="tl-body">
                <div className="tl-title">{x.t}</div>
                <div className="tl-sub">{x.sub}</div>
              </div>
            </li>
          </window.Reveal>
        ))}
      </ul>
    </Section>
  );
};

// ------------------------------ Contact ------------------------------
const ContactSection = () => {
  const id = window.SITE_DATA.identity;
  return (
    <Section id="contact" eyebrow="// contact" title="Reach out"
             sub="I read every message, even if replies take a moment."
             bg="d">
      <div className="contact">
        <div className="contact-emails">
          <window.Reveal><div><span className="c-label">work</span><span className="c-val">{id.emails.work}</span></div></window.Reveal>
          <window.Reveal delay={80}><div><span className="c-label">personal</span><span className="c-val">{id.emails.personal}</span></div></window.Reveal>
          <window.Reveal delay={160}><div><span className="c-label">location</span><span className="c-val">{id.location}</span></div></window.Reveal>
        </div>
        <div className="contact-social">
          {id.social.map((s, i) => (
            <window.Reveal key={s.k} delay={i * 40}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label} <span className="arrow">↗</span>
              </a>
            </window.Reveal>
          ))}
        </div>
        <window.Reveal>
          <div className="contact-ttrpg">
            <span className="ttrpg-label">off-hours</span>
            <span>I also run tabletop RPGs (Pathfinder 2e, currently). A separate site for that is coming.</span>
          </div>
        </window.Reveal>
      </div>
    </Section>
  );
};

Object.assign(window, {
  Section, Marginalia, NowSection, PillarsSection, ToolsSection, RigsSection,
  PubsSection, TalksSection, TeachingSection, TimelineSection, ContactSection,
});
