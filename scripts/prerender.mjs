// Post-build step (runs after `vite build` and the SSR build; see "build" in package.json).
//
// 1. Renders the React app to static HTML and puts it inside #root in dist/index.html, so
//    crawlers, link previews and no-JS visitors get the full page; React then hydrates it.
// 2. Generates schema.org structured data (ProfilePage + Person + publications) from
//    src/data.js, so it never drifts from what the page shows.
// 3. Writes sitemap.xml, robots.txt and llms.txt.
//
// Everything is derived from src/data.js: edit content there, never here.

import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SITE = "https://neurorishika.github.io/";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");

const { render, SITE_DATA } = await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href);
const today = new Date().toISOString().slice(0, 10);
const { identity: id } = SITE_DATA;

// ---------- structured data ----------
const personId = `${SITE}#person`;
const doiOf = (href = "") => href.match(/doi\.org\/(10\..+)$/)?.[1];

const person = {
  "@type": "Person",
  "@id": personId,
  name: id.name,
  givenName: "Rishika",
  familyName: "Mohanta",
  url: SITE,
  image: `${SITE}img/og-portrait.jpg`,
  description: id.pitch,
  jobTitle: "Graduate Fellow, David Rockefeller Graduate Program in Biosciences",
  affiliation: { "@type": "CollegeOrUniversity", name: "The Rockefeller University", url: "https://www.rockefeller.edu/" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Indian Institute of Science Education and Research (IISER) Pune", url: "https://www.iiserpune.ac.in/" },
  identifier: { "@type": "PropertyValue", propertyID: "ORCID", value: id.orcid },
  knowsAbout: [
    "Neuroscience", "Neuroethology", "Insect olfaction", "Olfactory navigation",
    "Drosophila melanogaster", "Ooceraea biroi", "Connectomics", "Computational neuroscience",
    "Learning and decision-making", "Multi-animal tracking", "Behavioral rigs", "Open-source scientific software",
  ],
  sameAs: id.social.map((s) => s.href),
};

const publications = SITE_DATA.publications.map((p) => {
  const doi = doiOf(p.href);
  return {
    "@type": /thesis/i.test(p.venue) ? "Thesis" : "ScholarlyArticle",
    "@id": `${SITE}#publication-${p.n}`,
    name: p.title,
    headline: p.title.length > 110 ? `${p.title.slice(0, 107)}...` : p.title,
    datePublished: p.year,
    url: p.href,
    isPartOf: { "@type": "CreativeWork", name: p.venue },
    author: { "@id": personId },
    creditText: p.authors,
    ...(doi && { sameAs: `https://doi.org/${doi}`, identifier: { "@type": "PropertyValue", propertyID: "DOI", value: doi } }),
  };
});

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}#website`,
      url: SITE,
      name: id.name,
      inLanguage: "en",
      publisher: { "@id": personId },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE}#profile`,
      url: SITE,
      name: `${id.name} · Insect Neuroscientist, Rockefeller University`,
      isPartOf: { "@id": `${SITE}#website` },
      mainEntity: { "@id": personId },
      dateModified: today,
      inLanguage: "en",
    },
    person,
    ...publications,
  ],
};
// "<" is escaped so no string in the data can close the <script> tag early.
const jsonLd = `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;

// ---------- index.html ----------
const indexPath = path.join(dist, "index.html");
let html = await readFile(indexPath, "utf8");
for (const marker of ["<!--app-html-->", "<!--app-jsonld-->"]) {
  if (!html.includes(marker)) throw new Error(`prerender: ${marker} missing from dist/index.html`);
}
html = html.replace("<!--app-html-->", () => render()).replace("<!--app-jsonld-->", () => jsonLd);
await writeFile(indexPath, html);

// ---------- sitemap.xml / robots.txt ----------
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${today}</lastmod>
    <image:image><image:loc>${SITE}img/og-portrait.jpg</image:loc></image:image>
  </url>
</urlset>
`);

await writeFile(path.join(dist, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${SITE}sitemap.xml
`);

// ---------- llms.txt (plain-text summary for AI search tools; llmstxt.org) ----------
const line = (s) => s.replace(/\s+/g, " ").trim();
const llms = [
  `# ${id.name}`,
  "",
  `> ${line(id.pitch)}`,
  "",
  `${id.name} (${id.pronouns}) is at ${id.location}. Website: ${SITE}. CV: ${id.cv}.`,
  "",
  "## Research questions",
  ...SITE_DATA.pillars.map((p) => `- **${p.title}** ${line(p.lede)}`),
  "",
  "## Publications",
  ...SITE_DATA.publications.map((p) => `- [${p.title}](${p.href}): ${p.authors} ${p.venue}, ${p.year}.`),
  "",
  "## Models",
  ...SITE_DATA.models.map((m) => `- **${m.name}** (${m.year}): ${line(m.desc)}`),
  "",
  "## Software",
  ...SITE_DATA.tools.map((t) => `- ${t.href ? `[${t.name}](${t.href})` : t.name} (${t.year}, ${t.lang}): ${line(t.blurb)}`),
  "",
  "## Behavioral rigs",
  ...SITE_DATA.rigs.map((r) => `- **${r.name}** (${r.year}): ${line(r.desc)}`),
  "",
  "## Links",
  ...id.social.map((s) => `- [${s.label}](${s.href})`),
  "",
  "## Contact",
  `- Work: ${id.emails.work}`,
  `- Personal: ${id.emails.personal}`,
  "",
].join("\n");
await writeFile(path.join(dist, "llms.txt"), llms);

await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: index.html (${(html.length / 1024).toFixed(1)} kB), sitemap.xml, robots.txt, llms.txt`);
