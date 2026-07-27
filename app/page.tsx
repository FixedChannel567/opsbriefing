"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Article = {
  title: string;
  url: string;
  domain: string;
  outlet: string;
  seenAt: string;
  sourceCountry: string;
  evidence: string;
};

type BriefingEvent = {
  id: string;
  rank: number;
  label: string;
  region: string;
  title: string;
  sourceCount: number;
  coordinates: { x: number; y: number };
  locationLabel: string;
  geoBasis: string;
  change: string;
  actors: string[];
  watch: string[];
  articles: Article[];
};

type LivePayload = {
  updatedAt?: string;
  source?: string;
  snapshotStatus?: string;
  error?: string;
  events?: BriefingEvent[];
};

const trimSentence = (text: string, max = 520) => {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("?"));
  return `${clipped.slice(0, sentenceEnd > 180 ? sentenceEnd + 1 : max).trim()}...`;
};

const sourceTime = (value: string) => {
  if (!value) return "Within the last 24 hours";
  const parsed = value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z");
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? "Within the last 24 hours" : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function Home() {
  const [payload, setPayload] = useState<LivePayload>({});
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const loadBrief = () => {
    setLoading(true);
    fetch("/api/live", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as LivePayload;
        if (!response.ok) throw new Error(data.error || "Live briefing unavailable");
        setPayload(data);
        setSelectedId((current) => current || data.events?.[0]?.id || "");
      })
      .catch((error) => setPayload({ error: error instanceof Error ? error.message : "Live briefing unavailable" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as LivePayload;
        if (!response.ok) throw new Error(data.error || "Live briefing unavailable");
        if (cancelled) return;
        setPayload(data);
        setSelectedId(data.events?.[0]?.id || "");
      })
      .catch((error) => {
        if (!cancelled) setPayload({ error: error instanceof Error ? error.message : "Live briefing unavailable" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const events = useMemo(() => payload.events ?? [], [payload.events]);
  const selected = events.find((event) => event.id === selectedId) ?? events[0];
  const citations = useMemo(() => {
    const unique = new Map<string, Article & { eventId: string }>();
    events.forEach((event) => event.articles.forEach((article) => {
      if (!unique.has(article.url)) unique.set(article.url, { eventId: event.id, ...article });
    }));
    return [...unique.values()];
  }, [events]);
  const citationNumber = (url: string) => citations.findIndex((citation) => citation.url === url) + 1;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="OpsBriefing home"><span>OB</span> OpsBriefing</a>
        <div className="top-actions">
          <span className="live-dot">Live source scan</span>
          <a className="method-link" href="/methodology">Methodology</a>
          <button className="ghost-button" onClick={loadBrief} type="button" disabled={loading}>Refresh</button>
          <button className="primary-button" onClick={() => setReportOpen(true)} type="button" disabled={!events.length}>Read 10-minute report</button>
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">Daily decision brief</p>
        <h1>Five events shaping the world right now.</h1>
        <p>Current reporting, source context, key actors, and a cited executive read. Updated from established global newsrooms throughout the day.</p>
        <div className="brief-meta">
          <span>{payload.updatedAt ? `Updated ${new Date(payload.updatedAt).toLocaleString()}` : "Connecting to live sources"}</span>
          <span>{citations.length} cited reports</span>
          <span>Live newsroom feeds</span>
          {payload.snapshotStatus && <span>{payload.snapshotStatus}</span>}
        </div>
      </section>

      {payload.error ? (
        <section className="error-state"><strong>Live briefing unavailable</strong><p>{payload.error}. Please refresh in a moment.</p><button className="primary-button" onClick={loadBrief} type="button">Try again</button></section>
      ) : loading ? (
        <section className="loading-state"><span /><p>Reading and cross-referencing current reporting...</p></section>
      ) : (
        <>
          <section className="workspace">
            <aside className="event-queue" aria-label="Five current events">
              <div className="section-title"><div><p>Today&apos;s five</p><span>Ordered by source breadth</span></div><b>5</b></div>
              {events.map((event) => (
                <button className={`event-row ${selected?.id === event.id ? "selected" : ""}`} key={event.id} onClick={() => setSelectedId(event.id)} type="button">
                  <span className="event-number">{event.rank}</span>
                  <span className="event-copy"><small>{event.region}</small><strong>{event.title}</strong><em>{event.sourceCount} independent outlets</em></span>
                </button>
              ))}
            </aside>

            <aside className="map-panel">
              <div className="map-heading">
                <div><p>World view</p><span>Explore where today&apos;s five stories are unfolding</span></div>
                <div className="map-toolbar" aria-label="Map zoom controls">
                  <button onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))} type="button" aria-label="Zoom out">−</button>
                  <label><span>Zoom {Math.round(zoom * 100)}%</span><input aria-label="Map zoom level" max="2.25" min="1" onChange={(event) => setZoom(Number(event.target.value))} step="0.05" type="range" value={zoom} /></label>
                  <button onClick={() => setZoom((value) => Math.min(2.25, Number((value + 0.25).toFixed(2))))} type="button" aria-label="Zoom in">+</button>
                  <button className="reset-map" onClick={() => setZoom(1)} type="button">Reset</button>
                </div>
              </div>
              <div className="map-frame" data-zoomed={zoom > 1.05}>
                <div className="map-stage" style={{ transform: `scale(${zoom})` }}>
                  <Image src="/map/world-map.svg" alt="World map showing the locations of today's five events" fill sizes="(max-width: 760px) 100vw, 75vw" unoptimized />
                </div>
                <div className="map-markers">
                  {events.map((event) => {
                    const markerScale = 1 + (zoom - 1) * 0.38;
                    const markerX = 50 + (event.coordinates.x - 50) * zoom;
                    const markerY = 50 + (event.coordinates.y - 50) * zoom;
                    return <button aria-label={`Open ${event.label}`} className={`map-marker marker-${event.id} ${selected?.id === event.id ? "active" : ""}`} key={event.id} onClick={() => setSelectedId(event.id)} style={{ left: `${markerX}%`, top: `${markerY}%`, transform: `translate(-50%, -50%) scale(${markerScale})` }} type="button"><span>{event.rank}</span><small>{event.label}</small></button>;
                  })}
                </div>
              </div>
              <div className="map-legend" aria-label="Map event legend">
                {events.map((event) => <button className={selected?.id === event.id ? "active" : ""} key={event.id} onClick={() => setSelectedId(event.id)} type="button"><span>{event.rank}</span><div><strong>{event.region}</strong><small>{event.label}</small></div></button>)}
              </div>
              {selected && <div className="map-caption"><span>Selected location</span><strong>{selected.locationLabel}</strong><p>{selected.geoBasis} {selected.sourceCount} reporting organizations.</p></div>}
            </aside>

            {selected && <article className="brief-card">
              <div className="brief-kicker"><span>{selected.label}</span><span>{selected.sourceCount} sources</span></div>
              <h2>{selected.title}</h2>
              <p className="brief-deck">The verified picture below is assembled directly from current article context. Each passage links to the report it came from.</p>

              <section className="change-card"><span>What changed since yesterday</span><p>{selected.change}</p></section>

              <section className="reported-facts">
                <h3>What is being reported</h3>
                {selected.articles.slice(0, 4).map((article) => (
                  <div className="evidence-block" key={article.url}>
                    <p>{trimSentence(article.evidence)} <a href={article.url} target="_blank" rel="noreferrer">[{citationNumber(article.url)}]</a></p>
                    <span>{article.outlet} · {sourceTime(article.seenAt)}</span>
                  </div>
                ))}
              </section>

              <div className="brief-columns">
                <section><h3>Actors in focus</h3><div className="tag-list">{selected.actors.map((actor) => <span key={actor}>{actor}</span>)}</div></section>
                <section><h3>What to watch next</h3><ul>{selected.watch.map((signal) => <li key={signal}>{signal}</li>)}</ul></section>
              </div>

              <section className="source-list"><h3>Source trail</h3>{selected.articles.map((article) => <a href={article.url} key={article.url} target="_blank" rel="noreferrer"><span><b>[{citationNumber(article.url)}] {article.outlet}</b><small>{article.title}</small></span><em>Open article ↗</em></a>)}</section>
            </article>}

          </section>

          <section className="report-callout">
            <div><p className="eyebrow">The complete picture</p><h2>One briefing. Five events. Every claim sourced.</h2><p>Open a focused executive report that connects the day&apos;s major developments without hiding the underlying reporting.</p></div>
            <button className="primary-button large" onClick={() => setReportOpen(true)} type="button">Generate today&apos;s 10-minute report</button>
          </section>
        </>
      )}

      {reportOpen && <div className="report-overlay" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="report-toolbar"><div className="brand"><span>OB</span> Daily Report</div><button className="close-button" onClick={() => setReportOpen(false)} type="button" aria-label="Close report">×</button></div>
        <article className="long-report">
          <p className="eyebrow">Executive intelligence brief · {payload.updatedAt ? new Date(payload.updatedAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Current briefing"}</p>
          <h1 id="report-title">The world in ten minutes</h1>
          <p className="report-lede">Five developments receiving the broadest current coverage across established international news sources. Reported facts are cited inline; the watchpoints are analytical prompts, not claims of fact.</p>
          <div className="report-summary">{events.map((event) => <a href={`#report-${event.id}`} key={event.id}><span>0{event.rank}</span>{event.label}</a>)}</div>
          {events.map((event) => <section className="report-section" id={`report-${event.id}`} key={event.id}>
            <p className="report-region">{event.region} · {event.sourceCount} reporting organizations</p>
            <h2>{event.title}</h2>
            {event.articles.slice(0, 5).map((article) => <p key={article.url}>{trimSentence(article.evidence, 700)} <a href={article.url} target="_blank" rel="noreferrer">[{citationNumber(article.url)}]</a></p>)}
            <div className="change-card report-change"><span>Since yesterday</span><p>{event.change}</p></div>
            <div className="watch-box"><strong>Watch next</strong><span>{event.watch.join(" · ")}</span></div>
          </section>)}
          <section className="references"><h2>Sources</h2>{citations.map((article, index) => <a href={article.url} target="_blank" rel="noreferrer" key={article.url}><b>[{index + 1}] {article.outlet}</b><span>{article.title}</span><small>{sourceTime(article.seenAt)}</small></a>)}</section>
        </article>
      </div>}
    </main>
  );
}
