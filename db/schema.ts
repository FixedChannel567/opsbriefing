import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dailySnapshots = sqliteTable("daily_snapshots", {
  id: text("id").primaryKey(),
  snapshotDate: text("snapshot_date").notNull(),
  eventId: text("event_id").notNull(),
  headline: text("headline").notNull(),
  sourceNames: text("source_names").notNull(),
  articleUrls: text("article_urls").notNull(),
  sourceCount: integer("source_count").notNull(),
  locationLabel: text("location_label").notNull(),
  capturedAt: text("captured_at").notNull(),
}, (table) => [
  index("daily_snapshots_date_idx").on(table.snapshotDate),
  index("daily_snapshots_event_idx").on(table.eventId),
]);
