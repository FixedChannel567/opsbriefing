# OpsBriefing Technical Interview Guide

**A practical handbook for explaining the product, architecture, tradeoffs, failures, and engineering judgment behind a live geopolitical briefing system**

Project: **OpsBriefing — Daily Military & Geopolitical Brief Builder**  
Live application: https://opsbriefing-daily.coryfan2004.chatgpt.site/  
Primary stack: React 19, TypeScript, Vinext, Cloudflare Workers, Cloudflare D1, RSS/XML, Node test runner

---

## How to use this guide

Do not memorize every sentence. Learn the system's shape, choose two or three debugging stories you can tell naturally, and practice the short pitches until they sound like your own words. During an interview, lead with the user problem, explain the end-to-end request path, then go deep where the interviewer shows interest.

The most important rule is intellectual honesty: describe the implementation that exists today, distinguish deterministic heuristics from machine learning, and state the limits of public-source reporting. That candor is itself a senior engineering signal.

## 1. The short version

### 30-second pitch

> OpsBriefing is a live geopolitical news dashboard designed as a ten-minute executive read. A server-side API concurrently fetches six international newsroom feeds, normalizes inconsistent RSS and RDF XML, clusters articles into version-controlled geopolitical topics, requires publisher diversity, attaches source-linked evidence, resolves a constrained map location, and stores daily snapshots in Cloudflare D1 so the interface can explain what changed since yesterday. The frontend presents five prioritized developments, an interactive world map, and a citation-forward briefing, with graceful degradation when publishers or persistence are unavailable.

### 90-second pitch

> I built OpsBriefing because a normal news feed optimizes for engagement, while a time-constrained reader needs prioritization, provenance, and change detection. The system fetches BBC, The Guardian, Al Jazeera, DW, France 24, and The New York Times RSS feeds in parallel. I use `Promise.allSettled` because one publisher failing should reduce coverage rather than take down the whole briefing. A pure parser normalizes RSS and RDF variants and repeatedly decodes entities before stripping markup, which fixed a real bug where encoded HTML appeared on screen.
>
> The ranking is deliberately explainable. Articles match a version-controlled topic dictionary, are deduplicated to one article per publisher per event, and events are ordered primarily by independent publisher breadth. Location resolution is also constrained by the matched topic, because a generic mention-count geocoder once mapped an Iran story to Washington due to repeated references to the White House. Daily event snapshots are upserted into D1 and compared with the latest prior day to produce observable changes in headlines, sources, source counts, and locations.
>
> The frontend is responsive and map-centric, and the repository includes synthetic feed fixtures, contract tests, linting, builds, GitHub Actions, methodology documentation, and explicit limitations. The main lesson was that trustworthy news software is less about pretending to guarantee truth and more about transparent provenance, partial-failure handling, and preventing misleading output.

### One-line architecture

**Publisher feeds → concurrent ingestion → normalization and sanitization → deterministic clustering and deduplication → constrained geolocation → D1 snapshot diff → typed API → interactive React briefing**

## 2. Resume bullets

Use two or three bullets, not all of them.

- Built and deployed a full-stack geopolitical briefing dashboard with React 19, TypeScript, Vinext, Cloudflare Workers, and D1, aggregating six international newsroom feeds into five source-linked daily developments.
- Designed a fault-tolerant ingestion pipeline using concurrent fetches and `Promise.allSettled`, allowing partial publisher failures while preserving a usable briefing and explicit coverage metadata.
- Implemented a defensive RSS/RDF parser with repeated entity decoding, markup sanitization, URL extraction, and synthetic XML fixture tests to prevent raw HTML and malformed publisher content from reaching the UI.
- Developed explainable clustering and ranking heuristics based on version-controlled topic dictionaries, one-article-per-publisher deduplication, and independent publisher breadth instead of opaque or fabricated confidence scores.
- Added topic-constrained geolocation and an interactive responsive world map, preventing high-frequency but contextually secondary place names from producing misleading event locations.
- Modeled and persisted daily event snapshots in Cloudflare D1, generating deterministic “what changed since yesterday” summaries from source, headline, and location deltas.
- Established CI quality gates for linting, fixture tests, contract tests, and production builds; documented methodology, limitations, contribution workflow, and architecture for recruiter-facing review.

## 3. Product framing

### The user problem

News homepages answer “what might keep me reading?” OpsBriefing answers “what changed that I need to understand before my next meeting?” The target user has roughly ten to fifteen minutes, cares about global consequences, and needs direct access to evidence.

### Core requirements

1. Show five current geopolitical developments rather than an infinite feed.
2. Cross-reference coverage across major international publishers.
3. Keep source links adjacent to the claims they support.
4. Make geography useful, interactive, and readable on desktop and mobile.
5. Explain the actors, consequences, and conditions to watch.
6. Show what changed from the prior daily snapshot.
7. Continue operating when an individual feed or the database is unavailable.
8. Avoid exposing raw XML, HTML, script content, or implementation syntax to readers.

### Deliberate non-goals

- **Guaranteed truth:** No public-news aggregator can guarantee that every report is true. The product guarantees provenance and transparent handling, not metaphysical certainty.
- **A casualty or economic “impact index”:** Combining deaths, market effects, and strategic significance into one number would create false precision and hide value judgments.
- **Breaking-news alerting:** The ten-minute cache and briefing format favor current situational awareness, not sub-second alerts.
- **Full article reproduction:** The app uses headlines, short sanitized evidence, and outbound source links rather than republishing copyrighted reporting.
- **Machine-learned classification:** The current classifier is deterministic and explainable. It does not use embeddings or a trained model.
- **Autonomous intelligence conclusions:** “Connections” and watch conditions are structured editorial context, not a claim that the system has verified classified causal relationships.

## 4. System design

### High-level components

| Layer | Responsibility | Main implementation |
|---|---|---|
| Presentation | Five-event queue, briefing view, map interactions, source links, responsive states | React 19, TypeScript, CSS |
| API/orchestration | Fetch feeds, tolerate partial failure, cluster, rank, geolocate, attach change data | `app/api/live/route.ts` |
| Parsing | Normalize RSS/RDF fields, decode entities, sanitize excerpts, extract canonical links | `lib/feed-parser.mjs` |
| Location | Detect allowed place mentions and project coordinates into map space | `lib/geocode.mjs` |
| Persistence | Store one event snapshot per topic/day and compare against prior state | `db/snapshots.ts`, Cloudflare D1 |
| Quality | Synthetic fixtures, behavior contracts, lint, build, CI | `tests/`, GitHub Actions |

### End-to-end request flow

1. The client requests `/api/live` when the dashboard loads.
2. The API starts all publisher requests concurrently with a ten-minute revalidation policy and an identifying user agent.
3. `Promise.allSettled` collects successful feeds and records failures without failing the whole request.
4. The parser converts each successful XML document into normalized articles with outlet, title, URL, publication time, and sanitized evidence.
5. Each article is evaluated against topic-specific keyword dictionaries using its title plus evidence text.
6. For each matched topic, a map keyed by publisher keeps at most one supporting article from each outlet.
7. Candidate events are enriched with actors, watch conditions, and a topic-constrained geographic location.
8. Events are sorted by independent source count and the top five are selected.
9. D1 loads the latest earlier snapshot for each event, computes a human-readable delta, and upserts today's state.
10. The typed JSON response returns events plus coverage metadata. The React client renders the event queue, citations, briefing, and map.

### Why this decomposition works

Parsing and geocoding are pure modules, so they can be tested without network access or Cloudflare bindings. The API route owns orchestration and ranking. Persistence owns temporal comparison. The UI consumes a stable response contract. These boundaries reduce coupling and let failures degrade locally.

### Runtime and deployment

Vinext provides a Next-compatible development model while producing a Cloudflare-oriented worker bundle. The API executes near the edge, while D1 provides serverless relational persistence. Static assets include the map and social preview. A production deployment is built from a committed source state, and CI verifies the same lint, test, and build gates before changes are accepted.

## 5. Data model and contracts

### Normalized article

Conceptually, every publisher item becomes:

```ts
type Article = {
  outlet: string;
  title: string;
  url: string;
  publishedAt: string | null;
  evidence: string;
};
```

This is an anti-corruption layer: the rest of the system does not need to know whether a publisher used RSS `<link>`, RDF resources, CDATA, `dc:date`, or encoded HTML.

### Event candidate

```ts
type BriefingEvent = {
  id: string;
  headline: string;
  summary: string;
  actors: string[];
  watch: string;
  sources: Article[];
  sourceCount: number;
  location: {
    name: string;
    lat: number;
    lon: number;
    x: number;
    y: number;
    fallback: boolean;
  };
  changedSinceYesterday?: string;
};
```

The exact code shape may vary, but these fields explain the contract. The UI never receives arbitrary publisher HTML.

### Snapshot identity

The durable identity is `(event_id, snapshot_date)`. A daily upsert makes a repeated request idempotent: it refreshes today's state instead of creating duplicates. Indexes support retrieval of the latest snapshot before today.

Snapshot comparisons inspect:

- lead headline
- sorted publisher roster
- source count
- resolved location
- snapshot date

This is intentionally observable and deterministic. It does not pretend to infer every semantic development inside the underlying articles.

## 6. Important algorithms

### A. Defensive feed parsing

Publisher XML is not uniform. The parser supports common RSS and RDF variants and applies a careful transformation order:

1. Extract item boundaries and candidate fields.
2. Remove script and style payloads.
3. Decode named and numeric HTML entities repeatedly because some feeds double-encode content.
4. Strip the tags exposed by decoding.
5. Collapse whitespace and return plain text.
6. Normalize the URL from link or GUID representations.

The order matters. An early version stripped literal tags before decoding entities. A value such as `&lt;p&gt;Update&lt;/p&gt;` contained no literal tag during the first strip, so decoding later produced visible `<p>` markup. Repeated decode-then-strip fixed the bug, and fixture tests prevent regression.

### B. Deterministic topic matching

Each topic has a stable identifier, label, keyword set, actor list, watch condition, fallback coordinate, and allowed place candidates. An article matches when its normalized title and evidence contain configured signals.

Advantages:

- easy to inspect during an incident
- deterministic and inexpensive
- version controlled and testable
- no model latency or external AI dependency

Limitations:

- synonyms and novel events require dictionary maintenance
- keyword overlap can cause false positives
- it is not semantic understanding
- source breadth is not the same as global impact

### C. Publisher deduplication

For each event, the API stores supporting articles in a `Map` keyed by outlet. That enforces one article per publisher, preventing a prolific feed from looking like independent corroboration. The first useful article from a publisher is retained, and the supporting list is capped to keep payloads and the UI bounded.

Time complexity is approximately `O(A × T × K)`, where `A` is article count, `T` is topic count, and `K` is average keywords per topic. At six feeds and ten topics this is tiny. At much larger scale, an inverted index, trie-based matcher, or dedicated search system would become appropriate.

### D. Explainable ranking

Events are ordered primarily by the number of distinct publishers supporting them. This is a proxy for coverage breadth, not a truth or impact score. Ties retain deterministic ordering from the topic configuration.

Why not a composite impact number? Casualties, GDP exposure, escalation risk, and diplomatic significance have different units, uncertain values, and moral implications. A single score would obscure rather than explain the judgment. A future system could expose separate dimensions with provenance and uncertainty instead of collapsing them.

### E. Topic-constrained geolocation

The geocoder searches a curated gazetteer for place aliases mentioned in the source text, but only among locations allowed for the matched topic. It counts mentions, selects the strongest candidate, and falls back to a disclosed topic coordinate when there is no match.

This constraint fixed a concrete failure: an Iran-related event was mapped to Washington because “White House” appeared repeatedly in political coverage. The place was present in the article, but it was not the event's primary geography. Restricting candidates converts the topic definition into useful domain context while preserving actual text evidence.

Coordinates are projected into SVG percentage space with an equirectangular approximation:

```text
x = (longitude + 180) / 360 × 100
y = (90 - latitude) / 180 × 100
```

This is sufficient for placing markers on a global overview, though it is not appropriate for distance or area calculations.

### F. Day-over-day diffing

For each event, the persistence layer loads the latest snapshot whose date is earlier than today. It compares observable fields and emits a concise explanation such as a new lead headline, additional or removed publishers, a changed location, or no recorded prior snapshot. Today's record is then inserted or updated.

The transaction shape is idempotent, and the database is optional at runtime. If D1 is unavailable, the live briefing still loads with a transparent snapshot fallback rather than producing a total outage.

## 7. The hardest problems and how they were solved

### Problem 1: “Live” data that was not actually trustworthy

**Symptom:** The first product version used hardcoded scenario cards and an “impact index.” It looked plausible but did not satisfy the requirement for current, cited reporting.

**Root cause:** The UI was built before the ingestion and provenance model. That encouraged presentation to outrun evidence.

**Fix:** Move the product center of gravity to a server-side live route, direct source links, publisher breadth, and explicit methodology. Remove confidence and impact scores that could not be defended.

**Lesson:** For evidence-heavy products, define provenance, freshness, and failure semantics before polishing the dashboard.

### Problem 2: Aggregator quality collapsed under strict filters

**Symptom:** A GDELT Context API experiment returned no usable results when restricted to major outlets. Relaxing the filter admitted random and low-quality domains.

**Root cause:** The aggregator's indexing and domain representation did not align with the product's curated-source requirement.

**Fix:** Fetch publisher RSS feeds directly. This traded broad discovery for predictable provenance and control.

**Tradeoff:** Direct feeds are easier to trust and explain, but they create source-specific parsing work and can miss important stories outside the configured roster.

### Problem 3: Encoded HTML appeared as visible code

**Symptom:** Readers saw HTML fragments and entity syntax inside news summaries.

**Root cause:** Sanitization happened in the wrong order. Encoded tags survived the initial strip and materialized after entity decoding. Some feeds were encoded more than once.

**Fix:** Extract parsing into a pure module, decode entities in bounded repeated passes, strip dangerous blocks and tags, normalize whitespace, and add synthetic Guardian- and DW-style fixture tests.

**Lesson:** Normalization order is part of the data contract. Security and presentation bugs often share the same root.

### Problem 4: The map was technically interactive but not useful

**Symptom:** Zooming enlarged geography while labels and marker counts remained cluttered, and users could not tell which event corresponded to which region.

**Root cause:** The first map treated markers as decoration instead of a coordinated navigation view. Responsive constraints and label collision behavior were incomplete.

**Fix:** Promote the map in the layout, add slider and button zoom controls, scale markers coherently, make the legend persistent and clickable, link map selection to event selection, and hide non-active labels until hover or focus where density demands it.

**Lesson:** “Interactive” is not the same as informative. Map controls, selection state, labels, and the event list must behave as one system.

### Problem 5: A valid place mention produced a misleading location

**Symptom:** An Iran event appeared over Washington.

**Root cause:** A generic mention-count algorithm selected a frequently repeated secondary actor location.

**Fix:** Add topic-scoped candidate locations and fallback disclosure. The algorithm still looks for source mentions but searches within a contextually valid set.

**Lesson:** More generic is not always more correct. Domain constraints are valuable when they are explicit, reviewable, and tested.

### Problem 6: Mobile layouts overflowed despite a one-column grid

**Symptom:** Cards and report content created horizontal scrolling on narrow screens.

**Root cause:** CSS Grid children default to `min-width: auto`, so their minimum-content size can exceed a `1fr` track.

**Fix:** Use `minmax(0, 1fr)` for tracks, apply `min-width: 0` to flexible children, and set overflow boundaries on long source and report content.

**Lesson:** Responsive bugs often come from intrinsic sizing, not just missing media queries.

### Problem 7: Citation lists produced duplicate React keys

**Symptom:** The same article supported more than one topic, causing key collisions in a global citation list.

**Root cause:** Event-level deduplication did not imply page-level uniqueness.

**Fix:** Deduplicate the final citation collection by canonical URL before rendering.

**Lesson:** Identity must be defined at every aggregation boundary.

### Problem 8: Network-based tests were flaky and legally awkward

**Symptom:** Live feed tests depended on publisher uptime, changing data, and copyrighted payloads.

**Root cause:** Parsing behavior was coupled to external systems.

**Fix:** Extract pure parsing functions and test synthetic fixtures that reproduce the structural edge cases without copying full articles. Add contract tests for key architectural guarantees and keep CI deterministic.

**Lesson:** Test the behavior you own. Use limited integration checks for systems you do not control.

### Problem 9: “What changed yesterday” had no memory

**Symptom:** The label existed, but a stateless request could not know yesterday's state.

**Root cause:** Temporal product requirements were not represented in the data architecture.

**Fix:** Add a D1 snapshot table keyed by event and date, read the latest earlier snapshot, compare observable fields, and upsert today's event state.

**Lesson:** If the product uses words such as “history,” “trend,” or “changed,” persistence is a core requirement, not an enhancement.

## 8. Clever engineering choices worth discussing

### `Promise.allSettled` as a product decision

This is not merely an API preference. In a multi-source briefing, a single rejected promise should not erase five healthy publishers. `allSettled` models the actual requirement: degraded breadth is acceptable; a blank briefing is not. The API can also expose which feeds succeeded so the UI does not imply complete coverage.

### One article per publisher

A raw count can be gamed by feed volume. Keying support by outlet turns the ranking signal from “number of posts” into “number of distinct editorial organizations,” which better matches cross-reference breadth.

### Repeated, bounded entity decoding

Real feeds can double-encode snippets. Decoding until stable could be abused or become expensive, so the parser uses a small fixed number of passes. This handles practical publisher data while keeping runtime bounded.

### Topic-constrained geocoding

The location bug was not solved with more regex. It was solved by changing the model: a place mention is a candidate, and topic context defines which candidates are meaningful. That is a reusable systems insight about combining generic algorithms with explicit domain constraints.

### Graceful persistence fallback

The database enriches a briefing with historical comparison but does not own current availability. Catching D1 initialization or query failures preserves the live product while making the missing historical capability visible.

### Idempotent daily upserts

Repeated requests are normal under caching, retries, and multiple users. A unique event/day identity plus upsert semantics prevents duplicate snapshot rows and makes retries safe.

### Synthetic fixtures instead of copied articles

Tests model malformed CDATA, encoded markup, RDF links, and date variants with invented text. This keeps the repository deterministic, compact, and respectful of publisher content.

## 9. Failure modes and degradation strategy

| Failure | User-visible behavior | Engineering response |
|---|---|---|
| One feed times out | Fewer sources; briefing remains available | `Promise.allSettled`, coverage metadata |
| All feeds fail | Explicit API error rather than fabricated events | Return a non-success response and error state |
| Malformed feed item | Item is skipped or fields are safely normalized | Defensive parser and fixtures |
| D1 unavailable | Live events load; prior-day comparison is absent or marked unavailable | Persistence boundary catches errors |
| No place match | Use topic fallback with disclosure | Deterministic fallback flag |
| Topic has one publisher | Event can appear but source breadth is visibly low | Preserve source count; do not call it confirmed truth |
| Duplicate source URL | One global citation entry | Canonical URL deduplication |
| Slow publisher | Route waits within platform limits; cached response reduces frequency | Revalidation and future per-feed timeouts |
| Publisher changes XML | Parser tests may still pass but integration coverage drops | Observability plus fixture update |
| New conflict lacks keywords | It may be missed | Editorial dictionary review or future discovery layer |

### What should be added in production

- Per-feed `AbortController` timeouts and bounded retries with jitter.
- Structured logs for latency, item counts, parse failures, match rates, and fallback geocodes.
- Freshness service-level objectives and alerts when a feed has been stale for too long.
- A quarantine path for malformed or unexpectedly large payloads.
- Rate limiting and response size caps.
- Manual editorial override for location, event title, inclusion, and merge/split decisions.
- Schema migration discipline instead of relying only on runtime table initialization.

## 10. Testing strategy

### Existing layers

**Unit-style fixture tests** validate parsing behavior against synthetic Guardian- and DW-shaped XML, including encoded tags and RDF differences.

**Contract tests** inspect important product guarantees such as the presence of the live route, source breadth logic, map controls, snapshot behavior, and citation rendering. These are fast guardrails, though they are less robust than full behavioral tests.

**Static and build checks** run TypeScript-aware linting and a production bundle, catching module, type, and deployment incompatibilities.

**CI** runs install, lint, test, and build in a clean Node environment, preventing “works on my machine” drift.

### Tests to add next

1. Direct unit tests for topic matching, outlet deduplication, ranking ties, and top-five truncation.
2. Snapshot repository tests against a disposable D1-compatible database.
3. API integration tests with mocked `fetch` responses for partial and total feed failure.
4. React Testing Library tests for event-map selection synchronization and report opening.
5. Playwright tests at mobile and desktop widths for overflow, keyboard navigation, zoom, and citations.
6. Property-based parser tests for nested encodings and malformed fields.
7. Visual regression screenshots for the map, queue, and report.
8. Accessibility checks with axe plus manual keyboard and screen-reader testing.

### How to answer “Why contract tests?”

They were a pragmatic first layer for a portfolio-sized codebase and caught accidental removal of essential behavior. I would not present them as sufficient. The next step is to move core route logic into pure functions and assert outputs, then add browser-level tests for the workflows users actually perform.

## 11. Security, correctness, and ethics

### Untrusted content boundary

RSS content is untrusted input. The system converts excerpts to plain text server-side and does not inject publisher HTML with `dangerouslySetInnerHTML`. Source URLs are rendered as links, not executable markup. In a hardened version, URLs should be parsed with the standard `URL` class and restricted to `http:` and `https:` protocols.

### Server-side request considerations

The feed list is static and version controlled, which avoids a general-purpose SSRF endpoint. The API does not accept an arbitrary user-provided feed URL. Per-request timeouts, size limits, and content-type validation would strengthen the boundary further.

### Source diversity is not truth

Multiple outlets can repeat the same wire report or official claim. Publisher count indicates editorial breadth, but not source independence at the claim level. A stronger provenance model would track wire-service origin, primary documents, named officials, satellite evidence, and whether sources are genuinely independent.

### Casualty and economic data

These figures can be disputed, revised, or strategically manipulated. The product should attach each number to a source, timestamp, geography, definition, and status such as reported, verified, estimated, or modeled. It should never silently merge incompatible estimates.

### Copyright and attribution

The app should retain headlines, short factual excerpts, commentary, and links rather than reproducing article bodies. Feed terms vary by publisher, so a commercial version would require legal review and potentially licensing agreements.

### Bias and editorial power

Choosing publishers, topics, keywords, and the number of visible events is an editorial act. The methodology page makes those choices inspectable. A mature system would measure regional coverage balance, provide change logs for topic definitions, and support expert review.

### The phrase to use in an interview

> I do not claim the system guarantees truth. I designed it to make provenance visible, require diverse coverage, avoid fabricated certainty, and degrade honestly when evidence or infrastructure is incomplete.

## 12. Performance and scale

### Current scale

With six feeds, roughly tens to low hundreds of items per request, ten topics, and five output events, in-memory processing is simple and cost-effective. Network latency dominates CPU time. Concurrent fetching reduces wall-clock latency from the sum of publisher times toward the slowest healthy publisher.

### Current complexity

- Feed fetches: `O(F)` concurrent network operations.
- Parsing: `O(B)` in total XML bytes, subject to regex-based parser limitations.
- Matching: approximately `O(A × T × K)`.
- Deduplication: expected `O(A)` map operations after matching.
- Ranking: `O(T log T)` for candidate events; negligible at current topic count.
- Snapshot lookup/upsert: bounded by five selected events with indexed queries.

### Scaling to hundreds of sources

I would separate ingestion from reads:

1. Scheduled workers fetch feeds continuously and publish normalized items to a queue.
2. Consumers validate, deduplicate, enrich, and persist articles.
3. A clustering service maintains event groups and provenance edges.
4. A ranking job creates immutable briefing editions.
5. A read API serves the latest edition from a cache or database without waiting on publishers.
6. A review console allows human correction before or after publication.

The data model would separate `publishers`, `articles`, `claims`, `events`, `event_article_edges`, `locations`, `actors`, `briefing_editions`, and `snapshot_diffs`. Search or vector infrastructure might aid discovery, but final inclusion and explanations should remain auditable.

### Cache strategy

The current ten-minute revalidation reduces publisher load and response latency. At larger scale, use stale-while-revalidate so readers receive the last known briefing during refreshes, tag caches by edition, and store feed-level freshness independently. Never label cached data “live” without displaying its retrieval time.

## 13. Tradeoffs and alternatives

### RSS versus publisher APIs

RSS is broadly available, cheap, and easy to attribute, but fields are inconsistent and feeds may be incomplete. Official APIs can offer structured metadata and clearer terms, but require credentials, quotas, and publisher-specific integrations. The project chose RSS for a deployable public-source prototype.

### Regex extraction versus a full XML parser

The pure parser is compact and handles controlled feed shapes, but XML is not a regular language and regex is fragile around namespaces and malformed nesting. A production system should use a hardened streaming XML parser with entity expansion disabled, input limits, and namespace-aware field handling.

### Deterministic keywords versus embeddings

Keywords are explainable, cheap, and easy to debug. Embeddings improve semantic recall and discovery but add cost, model drift, threshold tuning, and explainability challenges. A sensible next design is hybrid: embeddings propose clusters; deterministic rules and provenance checks gate publication.

### Curated gazetteer versus geocoding API

A curated gazetteer is deterministic and avoids network calls, quotas, and privacy concerns. It has limited coverage. A future system could use a geocoder for candidates, then apply event-aware validation and cache reviewed results.

### Request-time ingestion versus background jobs

Request-time ingestion keeps the prototype simple and always attempts a refresh when a reader arrives. It couples page latency to external publishers. Background ingestion is the right production architecture once traffic or source count grows.

### D1 versus a conventional relational database

D1 fits the Cloudflare deployment and small relational snapshot workload. A larger system may need Postgres for richer indexing, analytics, transactions, operational tooling, and portability. The repository boundary should make that replacement possible.

## 14. Observability and operations

### Metrics that matter

- successful feed ratio per refresh
- feed fetch latency and timeout count by publisher
- newest item age by publisher
- parse success and skipped-item counts
- articles matched per topic
- distinct publishers per selected event
- geocode fallback rate and manual correction rate
- API latency at p50, p95, and p99
- snapshot read/write error rate
- briefing edition age
- outbound citation click rate, used carefully as a usability metric rather than a ranking target

### Logs

Emit structured records with a request or refresh identifier, publisher, duration, status, item count, parse errors, selected topics, and snapshot result. Do not log full copyrighted article bodies or secrets.

### Alerts

Alert on all-feed failure, stale briefing age, sustained single-feed failure, sudden zero matches, elevated geocode fallback rates, D1 write failures, and build/deployment health. Thresholds should avoid paging on one transient publisher outage.

## 15. Frontend and UX decisions

### Information hierarchy

The first viewport answers three questions: what are the five developments, where are they, and when was the briefing refreshed? Event detail progressively reveals sources, actors, watch conditions, and change context. The comprehensive report is an explicit command, not a marketing card.

### Coordinated selection

An event selected in the queue becomes the active map marker and legend item. A map or legend click selects the same event in the queue. This shared state turns the map into navigation rather than decoration.

### Responsive behavior

Desktop can present queue and map together for comparison. Mobile stacks the experience, preserves readable hit targets, prevents minimum-content overflow, and keeps citations wrap-safe. Stable marker and control dimensions avoid layout shifts while zooming.

### Accessibility points to mention

Use semantic buttons for controls, visible focus states, labels or tooltips for icons, keyboard-operable selection, sufficient color contrast, and text equivalents for geographic state. A map cannot be the only way to access an event; the list and legend preserve a non-spatial path.

## 16. Likely technical interview questions

### “Walk me through the architecture.”

Start at `/api/live`. Six fixed publisher feeds are fetched concurrently. Successful XML is normalized into a common article type. Deterministic topic definitions classify articles; a publisher-keyed map deduplicates support. Candidate events are ranked by distinct publisher count, constrained geolocation adds map coordinates, D1 compares today's event with the latest earlier snapshot, and the React client renders five developments, a map, and citations. Emphasize partial failure and the pure parsing/geocoding boundaries.

### “How do you know an event is true?”

You do not guarantee truth. You show which publishers support the event, keep links adjacent to evidence, deduplicate by publisher, and avoid confidence scores. Explain that multiple outlets may still share one underlying source and describe claim-level provenance as future work.

### “Why `Promise.allSettled` instead of `Promise.all`?”

`Promise.all` rejects on the first failure and would discard healthy results. `allSettled` lets the route preserve five successful publishers when one fails, which matches the product's graceful-degradation requirement.

### “How do you prevent XSS from RSS?”

Treat every feed as untrusted, remove scripts/styles and tags server-side, decode entities in bounded passes, collapse to plain text, avoid raw HTML injection, and render source URLs through normal link attributes. Add protocol validation, payload limits, and a hardened XML parser in production.

### “Why did HTML appear in the UI?”

The sanitizer stripped literal tags before decoding encoded entities. Encoded tags therefore became literal only after the stripping phase. Reordering and repeating the transformation fixed it, and synthetic regression fixtures lock in the behavior.

### “How does clustering work?”

It is deterministic keyword matching against version-controlled topic definitions, not an ML model. Text combines title and sanitized evidence. Matched items are grouped by topic, deduplicated by publisher, and capped. Discuss recall and maintenance limitations openly.

### “How do you rank importance?”

The current system uses distinct publisher breadth as an explainable prioritization signal and selects five events. It does not quantify casualties or economic consequences into one score. For production, use separate evidence-backed dimensions, novelty, geographic reach, escalation, and human editorial review.

### “Why not use an LLM to summarize everything?”

An LLM could improve synthesis, but it creates attribution, hallucination, cost, latency, and evaluation problems. I would only add it behind a retrieval and claim-provenance layer, require citations for every generated claim, run consistency checks, and retain deterministic fallback output.

### “How does the map choose a location?”

It counts aliases from a curated gazetteer in article text, restricted to candidates allowed by the topic. It then converts latitude/longitude to SVG percentage coordinates. A disclosed fallback is used when no candidate appears.

### “What was wrong with generic geocoding?”

Mention frequency confused actor location with event location. Washington won because the White House was referenced repeatedly in an Iran story. The fix introduced explicit domain context through topic-scoped candidates.

### “How is ‘changed since yesterday’ implemented?”

D1 stores a unique event/day snapshot. The route reads the latest snapshot before today, compares observable fields such as lead headline, publisher roster, source count, and location, emits a concise delta, and upserts today's state. Repeated requests are idempotent.

### “What happens without D1?”

Persistence errors are caught at the boundary. The current briefing still renders, while historical comparison is absent or marked unavailable. This separates current availability from enrichment availability.

### “What would break first at 100× traffic?”

Request-time publisher fetching would be the wrong shape before CPU matching became a problem. I would move ingestion to scheduled jobs and queues, create immutable briefing editions, and serve reads from cache/database. Publisher rate limits and freshness monitoring become first-class concerns.

### “What would you refactor first?”

Extract topic matching, event assembly, and ranking from the route into typed pure functions. Then add mocked API integration tests. The current route owns too much orchestration logic for long-term growth.

### “Why Cloudflare D1?”

It colocates a small relational snapshot workload with the worker deployment, minimizes operational overhead, and supports the needed indexed lookup/upsert pattern. I would reevaluate it for richer transactional or analytical workloads.

### “How do you handle duplicate stories?”

Within an event, a map keyed by publisher keeps one article per outlet. Across the final report, citations are deduplicated by canonical URL. A production system would also normalize tracking parameters and use content fingerprints or publisher IDs.

### “How fresh is the data?”

The route uses a ten-minute revalidation policy, so it is near-real-time rather than instantaneous. The UI should display retrieval time and successful source coverage. For alerts, I would build a separate continuously scheduled pipeline.

### “How would you evaluate quality?”

Create a labeled set of daily articles and expected event clusters. Measure precision and recall for matching, duplicate rate, publisher diversity, location accuracy, stale-data rate, and human correction rate. For summaries, score claim support and citation entailment, not prose fluency alone.

### “Why does the map use equirectangular projection?”

It is a simple, deterministic transform suited to positioning markers on a global overview. It distorts area and distance, so the app never uses it for quantitative spatial analysis.

### “What are the database indexes for?”

The key lookup is latest snapshot for an event before a date. A unique event/date constraint supports idempotent upsert, while an event/date index makes prior-state retrieval efficient.

### “How do you deal with a publisher changing its feed?”

Track per-publisher parse counts and freshness, alert on sudden drops, keep publisher-specific fixtures, and isolate adapters behind the normalized article contract. A malformed source should not affect other publishers.

### “What is your biggest technical compromise?”

Request-time deterministic ingestion keeps the prototype understandable and deployable, but it limits discovery and couples refresh latency to publishers. The production path is background ingestion plus reviewed briefing editions.

## 17. Behavioral stories using STAR

### Story A: Fixing the raw-HTML incident

**Situation:** News excerpts displayed encoded tags and code-like fragments, making a public-facing product look broken and raising sanitization concerns.  
**Task:** Remove all markup without losing readable evidence and prevent recurrence across different feed formats.  
**Action:** Traced the transformation order, reproduced the failure with synthetic XML, extracted parsing into a pure module, applied bounded repeated decoding followed by script/style and tag stripping, then added fixtures for RSS and RDF variants.  
**Result:** The UI returned to plain readable text, the parser became independently testable, and the regression was captured in CI.

### Story B: Correcting a misleading map

**Situation:** An Iran story appeared over Washington because White House references dominated the text.  
**Task:** Improve geographic usefulness without introducing a paid geocoder or opaque model.  
**Action:** Distinguished actor mentions from event geography, added topic-specific allowed candidates, retained source-text mention checks, and surfaced fallback state.  
**Result:** Locations became more representative and the reasoning remained deterministic and auditable.

### Story C: Replacing an unsuitable data source

**Situation:** Strict GDELT filters produced no results; relaxed filters admitted sources that violated the trusted-news requirement.  
**Task:** Restore current data while preserving provenance.  
**Action:** Evaluated the failure as a data-contract mismatch, replaced broad aggregation with six direct publisher feeds, normalized their differences behind one parser contract, and used source-level failure isolation.  
**Result:** The product gained predictable attribution, international coverage, and a clearer operational model, at the cost of narrower discovery.

### Story D: Turning a feature label into a real system

**Situation:** “What changed since yesterday” was impossible in a stateless route.  
**Task:** Add meaningful temporal comparison without making the database a single point of failure.  
**Action:** Designed an event/day snapshot model, indexed prior-state lookups, implemented idempotent upserts, compared observable fields, and wrapped persistence with graceful fallback.  
**Result:** The feature became real and testable while live briefing availability remained independent of D1.

## 18. A production redesign exercise

If asked to design OpsBriefing for millions of readers and hundreds of sources, draw these boxes:

```text
Schedulers → Source adapters → Queue → Normalizer/security gate
                                      ↓
                         Article + provenance store
                                      ↓
              Event clustering / claim extraction / geocoding
                                      ↓
                         Editorial review console
                                      ↓
                   Immutable briefing edition store
                                      ↓
                 CDN / read API → Web and mobile clients
```

Explain the key properties:

- **Asynchronous ingestion:** Reader latency is independent of publisher latency.
- **At-least-once delivery:** Consumers must be idempotent; use publisher item ID or canonical URL plus content hash.
- **Provenance graph:** Claims connect to articles, primary sources, publishers, and retrieval times.
- **Immutable editions:** Every published briefing can be audited and compared later.
- **Human review:** High-impact or disputed claims need correction and override workflows.
- **Backpressure:** Queues absorb feed bursts; consumers scale independently.
- **Regional redundancy:** The read path can serve the latest good edition during ingestion incidents.
- **Observability:** Freshness and source health matter as much as HTTP uptime.

### Suggested storage choices

Use object storage for raw feed payloads with short retention, Postgres for articles/events/provenance and editorial state, a search index for retrieval, and a CDN/cache for published editions. A vector index can support semantic candidate generation, but should not become the sole evidence store.

### Consistency model

Ingestion can be eventually consistent. Publication should be strongly versioned: a briefing edition references fixed event and citation revisions. Readers should never receive half of an edition. Corrections create a new revision with an audit trail.

## 19. Code walkthrough map

| File | What to say |
|---|---|
| `app/api/live/route.ts` | Orchestrates concurrent fetches, topic matching, publisher deduplication, ranking, geolocation, and response assembly. Best starting point for the full data flow. |
| `lib/feed-parser.mjs` | Pure normalization boundary; contains the important decode/sanitize ordering fix. |
| `lib/geocode.mjs` | Curated gazetteer, alias detection, topic constraints, fallback behavior, and map projection. |
| `db/snapshots.ts` | D1 initialization, prior snapshot lookup, deterministic change description, and daily upsert. |
| `app/page.tsx` | Coordinates event selection, map interaction, briefing presentation, citations, loading, and error states. |
| `app/globals.css` | Responsive layout, map/control sizing, readable content, and intrinsic-size overflow fixes. |
| `tests/feed-parser.test.mjs` | Synthetic regression fixtures for publisher format differences and encoded markup. |
| `tests/opsbriefing.test.mjs` | Fast architectural and user-facing contract guardrails. |
| `METHODOLOGY.md` | Explains source selection, ranking limits, location behavior, and editorial caveats. |
| `.github/workflows/ci.yml` | Reproducible install, lint, test, and build gates. |

## 20. Claims you should and should not make

### Say this

- “The app aggregates six curated international publisher feeds.”
- “It uses deterministic, version-controlled topic matching.”
- “Publisher breadth is a prioritization signal, not proof or confidence.”
- “The report is citation-forward and built from sanitized source excerpts plus structured context.”
- “D1 enables observable day-over-day comparisons.”
- “The system tolerates partial feed and persistence failures.”
- “The map uses topic-constrained place resolution.”

### Do not say this

- “It guarantees every event is true.”
- “It uses AI to verify the news.”
- “It has semantic clustering” unless you later implement and evaluate it.
- “The report is fully generated by an LLM.”
- “The source count is a confidence score.”
- “The map pin is always the exact incident location.”
- “It covers all important world events.”
- “It is real time” without clarifying the approximate ten-minute refresh window.

## 21. What to build next

### Highest-value engineering work

1. Extract route business logic into typed pure modules and expand behavioral tests.
2. Add per-feed timeouts, size limits, canonical URL normalization, and structured health telemetry.
3. Move ingestion to scheduled jobs and persist immutable briefing editions.
4. Build a claim-level provenance model that distinguishes original reporting, wire copy, official statements, and primary documents.
5. Add an editorial review and correction interface.
6. Add Playwright, visual regression, and accessibility tests.
7. Introduce a discovery layer for novel events, with deterministic publication gates.
8. Display explicit freshness and successful-source coverage in every report.

### Responsible AI extension

If adding an LLM, first retrieve source passages and assign stable citation IDs. Ask the model to produce structured claims where every sentence lists supporting citation IDs. Reject unsupported claims, compare named entities and numbers against source passages, and keep a deterministic extractive fallback. Evaluate claim support with a human-labeled dataset before calling it production ready.

## 22. Interview-day cheat sheet

### Five facts to remember

1. Six feeds are fetched concurrently; one failure does not blank the briefing.
2. Ten configured topic families produce five ranked developments.
3. One supporting article per publisher prevents volume from impersonating corroboration.
4. D1 stores one event snapshot per day for observable change detection.
5. The most important bug fixes were sanitization order, contextual geolocation, and intrinsic CSS sizing.

### Three tradeoffs to volunteer

1. Explainability over semantic recall: deterministic keywords instead of embeddings.
2. Provenance control over discovery breadth: direct publisher RSS instead of a broad aggregator.
3. Prototype simplicity over ingestion scalability: request-time refresh instead of scheduled queues.

### Three future improvements

1. Background ingestion and immutable editions.
2. Claim-level provenance and editorial review.
3. Behavioral API/UI tests plus observability.

### A strong closing statement

> The project taught me that a trustworthy information product is not defined by how confidently it speaks. It is defined by how clearly it shows its evidence, how honestly it handles missing information, and how predictably it behaves when external systems fail. I built the prototype around those constraints, and I can explain exactly where it is strong and where I would take it next.

## Appendix A: Rapid-fire questions

**Why five events?** It enforces prioritization and supports a ten-minute reading budget.  
**Why international sources?** It reduces dependence on one national editorial frame and improves regional coverage.  
**Why keep topics in code?** Version control makes selection criteria reviewable, testable, and deployable.  
**Why cap sources?** It bounds payload and visual density while preserving publisher diversity.  
**Why cache for ten minutes?** It balances freshness, publisher load, edge cost, and reader latency.  
**Why store snapshots rather than full articles?** The first requirement is event-state comparison; full provenance storage is the next architecture step.  
**Why a fallback location?** A briefing needs stable rendering even when no candidate place appears, but the fallback must be disclosed.  
**Why not count every place?** Actor headquarters and diplomatic references can outweigh the actual event geography.  
**Why synthetic fixtures?** They are deterministic, compact, and avoid copying publisher content into tests.  
**Why build a methodology page?** Ranking and source selection are editorial choices; users and reviewers should be able to inspect them.  
**What is the availability strategy?** Partial source failure degrades breadth; database failure degrades history; total source failure becomes an explicit error.  
**What is the main data integrity rule?** Never fabricate an event to fill the five slots.  
**What is the main UI integrity rule?** Never render untrusted publisher markup.  
**What is the main ranking caveat?** Coverage breadth reflects attention, not necessarily importance or independent confirmation.  
**What is the main map caveat?** A marker represents the best configured briefing geography, not a precise incident boundary.  
**What is the main scale bottleneck?** External fetches on the read request path.  
**What is the best refactor?** Pure typed event-assembly functions with direct output tests.  
**What is the best product feature next?** An auditable briefing edition with corrections and claim-level citations.  
**What is the strongest debugging story?** The encoded HTML bug because it combines data normalization, security thinking, modularization, and regression testing.  
**What is the strongest system-design story?** Separating source failure, persistence failure, and read availability into different degradation levels.

## Appendix B: Repository commands

```bash
npm ci
npm run lint
npm test
npm run build
```

Use a clean install before an interview demo. Open the live application and repository in advance, verify the current briefing loads, and keep one screenshot available in case an upstream publisher is temporarily unavailable.

