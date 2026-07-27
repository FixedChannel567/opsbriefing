import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseFeedXml, sanitizeFeedText } from "../lib/feed-parser.mjs";
import { resolveEventLocation } from "../lib/geocode.mjs";

const guardianFeed = { outlet: "The Guardian", domain: "theguardian.com", country: "United Kingdom" };
const dwFeed = { outlet: "Deutsche Welle", domain: "dw.com", country: "Germany" };

test("sanitizer removes literal and multiply encoded markup", () => {
  const value = "&amp;lt;p&amp;gt;Readable&amp;lt;/p&amp;gt;<script>hidden()</script>";
  assert.equal(sanitizeFeedText(value), "Readable");
});

test("parses Guardian-style CDATA without leaking HTML", async () => {
  const xml = await readFile(new URL("./fixtures/guardian.xml", import.meta.url), "utf8");
  const [article] = parseFeedXml(xml, guardianFeed);
  assert.equal(article.outlet, "The Guardian");
  assert.match(article.title, /Kyiv prepares/);
  assert.match(article.url, /campaign=test/);
  assert.equal(/<[^>]+>/.test(article.evidence), false);
  assert.equal(article.evidence.includes("unsafe"), false);
});

test("parses RDF items and resolves a place mentioned in reporting", async () => {
  const xml = await readFile(new URL("./fixtures/dw.xml", import.meta.url), "utf8");
  const articles = parseFeedXml(xml, dwFeed);
  const location = resolveEventLocation(articles, { coordinates: { x: 0, y: 0 }, label: "Fallback" });
  assert.equal(location.locationLabel, "Strait of Hormuz");
  assert.notDeepEqual(location.coordinates, { x: 0, y: 0 });
});
