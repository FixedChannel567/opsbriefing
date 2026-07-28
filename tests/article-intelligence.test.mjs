import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildEventAnalysis, enrichArticle, extractReadableArticle } from "../lib/article-intelligence.mjs";

test("extracts and ranks passages from structured public article text", async () => {
  const html = await readFile(new URL("./fixtures/article.html", import.meta.url), "utf8");
  const article = await extractReadableArticle(html, "https://example.com/report", ["shipping", "regional"]);
  assert.ok(article.wordCount >= 120);
  assert.equal(article.passages.length, 3);
  assert.match(article.passages[0].text, /shipping|regional/i);
  assert.equal(article.passages.some((passage) => /<[^>]+>/.test(passage.text)), false);
});

test("discloses a feed fallback when the article body cannot be accessed", async () => {
  const source = { title: "Current report", url: "https://example.com/blocked", evidence: "Officials announced a current policy change after regional talks on Tuesday.", outlet: "Example" };
  const fetchImpl = async () => new Response("blocked", { status: 403, headers: { "content-type": "text/html" } });
  const enriched = await enrichArticle(source, ["regional"], fetchImpl);
  assert.equal(enriched.access, "Newsroom feed excerpt");
  assert.equal(enriched.passages.length, 1);
});

test("keeps analytical context separate from source-backed developments", () => {
  const event = {
    keywords: ["shipping"],
    analysis: { whyItMatters: "System context", connection: "Related system", uncertainty: "Unknown detail" },
    articles: [
      { outlet: "Outlet A", url: "https://a.test", access: "Full public article", passages: [{ kind: "Impact indicator", text: "Shipping companies reported twelve route changes after authorities issued updated navigation guidance on Tuesday." }] },
      { outlet: "Outlet B", url: "https://b.test", access: "Full public article", passages: [{ kind: "Reported development", text: "Authorities issued updated shipping guidance on Tuesday after twelve commercial routes were changed." }] },
    ],
  };
  const result = buildEventAnalysis(event);
  assert.equal(result.analysis.whyItMatters, "System context");
  assert.equal(result.sourceAudit.fullTextSources, 2);
  assert.ok(result.sourceAudit.convergentClaims >= 1);
});
