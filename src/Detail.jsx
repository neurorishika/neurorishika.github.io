// Detail / sub-pages, reached via hash routes.
// - #/tools/:name
// - #/research/:pillar
// - #/now/archive

const BackBar = () => (
  <div className="back-bar">
    <a href="#" className="back-link">← back to portfolio</a>
  </div>
);

const DetailShell = ({ eyebrow, title, sub, children }) => (
  <div className="detail-page">
    <BackBar />
    <window.Reveal>
      <div className="detail-head">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="detail-title">{title}</h1>
        {sub && <p className="detail-sub">{sub}</p>}
      </div>
    </window.Reveal>
    <div className="detail-body">{children}</div>
  </div>
);

// -------------------- Tool detail --------------------
const ToolDetail = ({ name }) => {
  const tool = window.SITE_DATA.tools.find(t => t.name === name);
  const dd = window.SITE_DATA.toolDeepDives[name];
  if (!tool || !dd) {
    return <DetailShell eyebrow="// 404" title="Tool not found">
      <p>No deep-dive for "{name}". <a href="#">Back to portfolio.</a></p>
    </DetailShell>;
  }
  const Preview = window.ToolPreviews[tool.preview];
  return (
    <DetailShell eyebrow={`// tool · ${tool.tag}`} title={tool.name} sub={dd.subtitle}>
      <div className="tool-detail-grid">
        <div className="tool-detail-left">
          <window.Reveal>
            <div className="tool-detail-preview">
              <Preview />
            </div>
          </window.Reveal>
          <window.Reveal delay={80}>
            <dl className="tool-detail-facts">
              <div><dt>stack</dt><dd>{dd.stack}</dd></div>
              <div><dt>language</dt><dd>{tool.lang}</dd></div>
              <div><dt>status</dt><dd>{dd.status}</dd></div>
              <div><dt>year</dt><dd>{tool.year}</dd></div>
              <div><dt>repo</dt><dd><a href={tool.href} target="_blank" rel="noreferrer">{tool.href.replace("https://github.com/", "")} ↗</a></dd></div>
            </dl>
          </window.Reveal>
        </div>
        <div className="tool-detail-right">
          <window.Reveal>
            <section className="dd-section">
              <h3>The problem</h3>
              <p>{dd.problem}</p>
            </section>
          </window.Reveal>
          <window.Reveal delay={60}>
            <section className="dd-section">
              <h3>Approach</h3>
              <p>{dd.approach}</p>
            </section>
          </window.Reveal>
          <window.Reveal delay={120}>
            <section className="dd-section">
              <h3>What it does</h3>
              <ul className="dd-features">
                {dd.features.map((f, i) => (
                  <li key={i}><span className="dd-tick">◆</span><span>{f}</span></li>
                ))}
              </ul>
            </section>
          </window.Reveal>
          <window.Reveal delay={180}>
            <div className="dd-cta">
              <a className="btn-ghost" href={tool.href} target="_blank" rel="noreferrer">open on GitHub ↗</a>
              <a className="btn-ghost" href="#tools">back to all tools</a>
            </div>
          </window.Reveal>
        </div>
      </div>

      <window.Reveal delay={240}>
        <section className="related">
          <div className="eyebrow">// also see</div>
          <div className="related-grid">
            {window.SITE_DATA.tools.filter(t => t.name !== name).slice(0, 3).map(t => (
              <a key={t.name} href={`#/tools/${encodeURIComponent(t.name)}`} className="related-card">
                <div className="related-tag">{t.tag}</div>
                <div className="related-name">{t.name}</div>
                <div className="related-blurb">{t.blurb}</div>
              </a>
            ))}
          </div>
        </section>
      </window.Reveal>
    </DetailShell>
  );
};

// -------------------- Pillar detail --------------------
const PillarDetail = ({ id }) => {
  const pillar = window.SITE_DATA.pillars.find(p => p.id === id);
  const dd = window.SITE_DATA.pillarDeepDives[id];
  if (!pillar || !dd) {
    return <DetailShell eyebrow="// 404" title="Thread not found">
      <p><a href="#">Back to portfolio.</a></p>
    </DetailShell>;
  }
  const otherPillars = window.SITE_DATA.pillars.filter(p => p.id !== id);
  return (
    <DetailShell eyebrow={`// research · 0${window.SITE_DATA.pillars.findIndex(p => p.id === id) + 1}`}
                 title={pillar.title}
                 sub={dd.tagline}>
      <div className="pillar-detail">
        <window.Reveal>
          <p className="pillar-opening">{dd.opening}</p>
        </window.Reveal>
        <window.Reveal delay={80}>
          <section className="dd-section">
            <h3>Open questions</h3>
            <ul className="dd-questions">
              {dd.questions.map((q, i) => (
                <li key={i}><span className="q-num">Q{i + 1}</span><span>{q}</span></li>
              ))}
            </ul>
          </section>
        </window.Reveal>
        <window.Reveal delay={140}>
          <section className="dd-section">
            <h3>Projects & threads</h3>
            <ul className="dd-projects">
              {dd.projects.map((p, i) => (
                <li key={i}>
                  <div className="proj-year">{p.y}</div>
                  <div className="proj-body">
                    <div className="proj-title">{p.t}</div>
                    <div className="proj-lab">{p.lab}</div>
                    <p className="proj-detail">{p.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </window.Reveal>
        <window.Reveal delay={200}>
          <section className="dd-section">
            <h3>Other threads</h3>
            <div className="related-grid">
              {otherPillars.map(p => (
                <a key={p.id} href={`#/research/${p.id}`} className="related-card">
                  <div className="related-tag">// research</div>
                  <div className="related-name">{p.title}</div>
                  <div className="related-blurb">{p.lede}</div>
                </a>
              ))}
            </div>
          </section>
        </window.Reveal>
      </div>
    </DetailShell>
  );
};

// -------------------- Now archive --------------------
const NowArchive = () => {
  const archive = window.SITE_DATA.nowArchive;
  return (
    <DetailShell eyebrow="// archive" title="Past focuses"
                 sub="Snapshots of what I was working on, month by month.">
      <ul className="archive-list">
        {archive.map((a, i) => (
          <window.Reveal key={i} delay={i * 80}>
            <li>
              <div className="archive-month">{a.m}</div>
              <ul className="archive-items">
                {a.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            </li>
          </window.Reveal>
        ))}
      </ul>
    </DetailShell>
  );
};

// -------------------- Router --------------------
const Router = ({ route }) => {
  const m = route.match(/^#\/tools\/(.+)$/);
  if (m) return <ToolDetail name={decodeURIComponent(m[1])} />;
  const m2 = route.match(/^#\/research\/(.+)$/);
  if (m2) return <PillarDetail id={decodeURIComponent(m2[1])} />;
  if (route === "#/now/archive") return <NowArchive />;
  return null;
};

Object.assign(window, { Router, ToolDetail, PillarDetail, NowArchive });
