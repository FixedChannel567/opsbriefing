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
      <p className="method-lede">OpsBriefing is a news aggregation and research interface, not an intelligence authority. It reads current public reporting, preserves the source trail, compares accounts at passage level, and labels analysis separately from reported facts.</p>

      <section><span className="method-number">01</span><div><h2>Discovery, then reading</h2><p>The server reads current RSS feeds directly from six international newsrooms every ten minutes. Feeds identify timely reporting; after event selection, the server requests the underlying public article pages and extracts their structured article bodies. A failed source does not prevent the remaining sources from producing a briefing.</p><div className="method-source-grid">{sources.map(([name, role]) => <div key={name}><strong>{name}</strong><span>{role}</span></div>)}</div></div></section>

      <section><span className="method-number">02</span><div><h2>Access boundaries and extraction</h2><p>OpsBriefing reads only pages that publishers make publicly accessible. It does not circumvent paywalls, authentication, or access controls. Structured NewsArticle metadata is preferred; semantic article and main content are the secondary path. When neither is available, the interface explicitly marks the publisher&apos;s RSS description as a feed fallback.</p></div></section>

      <section><span className="method-number">03</span><div><h2>Same-story clustering</h2><p>A country or regional keyword is never enough to join an event. Articles must share a geopolitical actor or theater and a concrete event concept such as an attack, negotiation, election, sanction, military drill, or shipping incident. Clusters supported by only one publisher do not enter the daily five.</p></div></section>

      <section><span className="method-number">04</span><div><h2>Triage and evidence selection</h2><p>Cross-sourced story clusters are ordered using source breadth, recency, editorial theater priority, and observable consequence language such as casualties, displacement, sanctions, force movements, shipping disruption, and trade restrictions. This ordering is internal and is not presented as a certainty or impact score. Article bodies are then segmented and ranked using terms specific to that exact story.</p></div></section>

      <section><span className="method-number">05</span><div><h2>Analysis with boundaries</h2><p>Every reported passage in an event comes only from its admitted same-story source cluster. Each event then adds three explicitly labeled analytical lenses: why that development matters, which adjacent systems affect it, and what remains uncertain. These are research frameworks, not newly reported facts or predictions.</p></div></section>

      <section><span className="method-number">06</span><div><h2>Location and daily change</h2><p>The map resolves supported place names in the current source pack to real coordinates. A production database also compares each event&apos;s lead headline, source roster, source breadth, and mapped location with the most recent prior daily snapshot.</p></div></section>

      <section><span className="method-number">07</span><div><h2>Limitations</h2><ul><li>Paywalled or script-restricted pages may provide only a feed excerpt.</li><li>Related reporting is not proof of independent verification.</li><li>Strict same-story rules can omit a valid article whose headline uses very different language.</li><li>Topic dictionaries, event concepts, passage scoring, and the gazetteer are deterministic but not exhaustive.</li><li>Breaking reports can change as publishers correct or expand their coverage.</li></ul></div></section>

      <footer><strong>Editorial principle</strong><p>Reported facts stay attributable. Analysis stays labeled. Uncertainty stays visible.</p></footer>
    </article>
  </main>;
}
