import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.tsx", import.meta.url);
const stylesPath = new URL("../app/globals.css", import.meta.url);
const routePath = new URL("../app/api/live/route.ts", import.meta.url);
const mapPath = new URL("../public/map/world-map.svg", import.meta.url);
const snapshotPath = new URL("../db/snapshots.ts", import.meta.url);
const methodologyPath = new URL("../app/methodology/page.tsx", import.meta.url);
const workflowPath = new URL("../.github/workflows/ci.yml", import.meta.url);
const screenshotPath = new URL("../docs/images/dashboard.jpg", import.meta.url);

test("shows exactly five live events and no impact index", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /Today&apos;s five/);
  assert.match(page, /slice\(0, 5\)/);
  assert.doesNotMatch(page, /impact index/i);
  assert.doesNotMatch(page, /confidence/i);
});

test("comprehensive report has inline citations and a reference list", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /10-minute report/);
  assert.match(page, /citationNumber/);
  assert.match(page, /className="references"/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /What the reporting establishes/);
  assert.match(page, /What remains uncertain/);
  assert.match(page, /Source audit/);
});

test("live route retrieves direct newsroom feeds and keeps source context", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /feeds\.bbci\.co\.uk/);
  assert.match(route, /theguardian\.com\/world\/rss/);
  assert.match(route, /rss\.nytimes\.com/);
  assert.match(route, /parseFeedXml/);
  assert.match(route, /resolveEventLocation/);
  assert.match(route, /attachDailyChanges/);
  assert.match(route, /enrichArticle/);
  assert.match(route, /buildEventAnalysis/);
  assert.match(route, /selectTopStories/);
  assert.match(route, /Promise\.allSettled/);
});

test("map includes a real basemap, linked markers, and zoom controls", async () => {
  const page = await readFile(pagePath, "utf8");
  const css = await readFile(stylesPath, "utf8");
  await access(mapPath);
  assert.match(page, /map-marker/);
  assert.match(page, /setZoom/);
  assert.match(page, /Map zoom level/);
  assert.match(page, /map-legend/);
  assert.match(css, /\.map-stage img/);
  assert.match(css, /\.map-toolbar/);
});

test("portfolio infrastructure includes persistence, methodology, CI, and visual documentation", async () => {
  const snapshots = await readFile(snapshotPath, "utf8");
  const methodology = await readFile(methodologyPath, "utf8");
  const workflow = await readFile(workflowPath, "utf8");
  await access(screenshotPath);
  assert.match(snapshots, /daily_snapshots/);
  assert.match(snapshots, /describeChange/);
  assert.match(methodology, /How OpsBriefing builds the daily five/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run build/);
});
