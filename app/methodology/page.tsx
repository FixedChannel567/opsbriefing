import Link from "next/link";

const sources = [
  ["BBC", "Global breaking news and public-service reporting"],
  ["The Guardian", "International reporting and investigations"],
  ["Al Jazeera", "Middle East-based global and regional reporting"],
  ["Deutsche Welle", "German public international broadcasting"],
  ["France 24", "French public international broadcasting"],
  ["The New York Times", "U.S.-based international reporting"],
];

export default function Methodology() {
  return <main className="method-page">
    <header className="method-header"><Link className="brand" href="/"><span>OB</span> OpsBriefing</Link><Link className="primary-button" href="/">Return to briefing</Link></header>
    <article className="method-content">
      <p className="eyebrow">Transparent by design</p>
      <h1>How OpsBriefing builds the daily five</h1>
      <p className="method-lede">OpsBriefing is a news aggregation and research interface, not an intelligence authority. It shows what established publishers are reporting, preserves the source trail, and labels analytical prompts separately from reported facts.</p>

      <section><span className="method-number">01</span><div><h2>Direct-source ingestion</h2><p>The server reads current RSS feeds directly from six international newsrooms every ten minutes. Each adapter normalizes titles, publication dates, article links, and publisher-supplied descriptions. A failed feed does not prevent the remaining sources from producing a briefing.</p><div className="method-source-grid">{sources.map(([name, role]) => <div key={name}><strong>{name}</strong><span>{role}</span></div>)}</div></div></section>

      <section><span className="method-number">02</span><div><h2>Sanitization and attribution</h2><p>Feed markup, scripts, styles, and encoded HTML are removed before evidence reaches the client. Factual passages remain extractive: every one is a publisher-provided description connected to its original article through a numbered citation.</p></div></section>

      <section><span className="method-number">03</span><div><h2>Selection and ordering</h2><p>Articles are matched to transparent geopolitical topic dictionaries. Duplicate publishers are removed within a topic, and the five clusters with the broadest independent source coverage are selected. Source breadth is an ordering signal, not a claim that a story is true or more important in every context.</p></div></section>

      <section><span className="method-number">04</span><div><h2>Location resolution</h2><p>The map uses a curated geopolitical gazetteer. Place names found in the current source titles and descriptions are counted, resolved to latitude and longitude, and projected onto the world map. When no supported place appears, the interface discloses that it is using a regional fallback.</p></div></section>

      <section><span className="method-number">05</span><div><h2>Daily change detection</h2><p>A production database saves one snapshot per event and UTC day. The next briefing compares lead headlines, source rosters, source breadth, and mapped locations against the most recent prior day. The resulting delta explains exactly which observable inputs changed.</p></div></section>

      <section><span className="method-number">06</span><div><h2>Limitations</h2><ul><li>RSS descriptions vary in depth and may omit context available in the full article.</li><li>Publisher framing can differ; citations are provided so readers can inspect each account.</li><li>Topic dictionaries and the gazetteer are deterministic but not exhaustive.</li><li>Breaking-news reports can change as publishers correct or expand their coverage.</li><li>Watchpoints are analytical prompts, not predictions or verified facts.</li></ul></div></section>

      <footer><strong>Editorial principle</strong><p>Reported facts stay attributable. Analysis stays labeled. Uncertainty stays visible.</p></footer>
    </article>
  </main>;
}
