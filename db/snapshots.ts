import { env } from "cloudflare:workers";

type Article = { outlet: string; url: string };
type Event = {
  id: string;
  title: string;
  sourceCount: number;
  locationLabel: string;
  articles: Article[];
};

type SnapshotRow = {
  event_id: string;
  headline: string;
  source_names: string;
  article_urls: string;
  source_count: number;
  location_label: string;
};

type Prepared = {
  bind: (...values: unknown[]) => Prepared;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

type Database = {
  prepare: (sql: string) => Prepared;
  batch: (statements: Prepared[]) => Promise<unknown>;
};

function describeChange(event: Event, previous?: SnapshotRow) {
  if (!previous) return "New to the daily five since the last saved briefing.";
  const previousSources = new Set<string>(JSON.parse(previous.source_names));
  const addedSources = event.articles.map((article) => article.outlet).filter((outlet) => !previousSources.has(outlet));
  const changes: string[] = [];
  if (event.title !== previous.headline) changes.push("The lead development changed as new reporting moved the story forward.");
  if (addedSources.length) changes.push(`${addedSources.join(", ")} ${addedSources.length === 1 ? "has" : "have"} joined the source cluster.`);
  if (event.sourceCount !== previous.source_count) changes.push(`Source breadth moved from ${previous.source_count} to ${event.sourceCount} reporting organizations.`);
  if (event.locationLabel !== previous.location_label) changes.push(`The reporting focus shifted from ${previous.location_label} to ${event.locationLabel}.`);
  return changes.length ? changes.join(" ") : "Coverage remains active, with no material headline, source, or mapped-location change since the prior snapshot.";
}

export async function attachDailyChanges<T extends Event>(events: T[]) {
  const database = (env as unknown as { DB?: Database }).DB;
  if (!database) return {
    events: events.map((event) => ({ ...event, change: "Daily comparison becomes available after the first production snapshot." })),
    snapshotStatus: "Local preview; durable snapshots are active in production.",
  };

  try {
    const today = new Date().toISOString().slice(0, 10);
    await database.batch([
      database.prepare(`
        CREATE TABLE IF NOT EXISTS daily_snapshots (
          id TEXT PRIMARY KEY NOT NULL,
          snapshot_date TEXT NOT NULL,
          event_id TEXT NOT NULL,
          headline TEXT NOT NULL,
          source_names TEXT NOT NULL,
          article_urls TEXT NOT NULL,
          source_count INTEGER NOT NULL,
          location_label TEXT NOT NULL,
          captured_at TEXT NOT NULL
        )
      `),
      database.prepare("CREATE INDEX IF NOT EXISTS daily_snapshots_date_idx ON daily_snapshots (snapshot_date)"),
      database.prepare("CREATE INDEX IF NOT EXISTS daily_snapshots_event_idx ON daily_snapshots (event_id)"),
    ]);
    const previous = await database.prepare(`
      SELECT event_id, headline, source_names, article_urls, source_count, location_label
      FROM daily_snapshots
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM daily_snapshots WHERE snapshot_date < ?
      )
    `).bind(today).all<SnapshotRow>();
    const previousByEvent = new Map((previous.results ?? []).map((row) => [row.event_id, row]));
    const enriched = events.map((event) => ({ ...event, change: describeChange(event, previousByEvent.get(event.id)) }));
    const capturedAt = new Date().toISOString();
    await database.batch(events.map((event) => database.prepare(`
      INSERT INTO daily_snapshots
        (id, snapshot_date, event_id, headline, source_names, article_urls, source_count, location_label, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        headline = excluded.headline,
        source_names = excluded.source_names,
        article_urls = excluded.article_urls,
        source_count = excluded.source_count,
        location_label = excluded.location_label,
        captured_at = excluded.captured_at
    `).bind(
      `${today}:${event.id}`,
      today,
      event.id,
      event.title,
      JSON.stringify(event.articles.map((article) => article.outlet)),
      JSON.stringify(event.articles.map((article) => article.url)),
      event.sourceCount,
      event.locationLabel,
      capturedAt,
    )));
    return { events: enriched, snapshotStatus: `Compared with the most recent saved daily briefing; ${today} snapshot captured.` };
  } catch {
    return {
      events: events.map((event) => ({ ...event, change: "Historical comparison is temporarily unavailable; current reporting remains live." })),
      snapshotStatus: "Live sources available; snapshot storage is temporarily unavailable.",
    };
  }
}
