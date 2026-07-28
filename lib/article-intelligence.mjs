const actionTerms = [
  "announced", "approved", "attacked", "blocked", "closed", "confirmed", "deployed",
  "expanded", "imposed", "killed", "launched", "met", "ordered", "rejected", "reported",
  "resumed", "sanctioned", "signed", "struck", "suspended", "warned", "withdrew",
];

const impactTerms = [
  "casualties", "civilian", "displaced", "exports", "humanitarian", "inflation", "military",
  "oil", "shipping", "supply", "tariff", "trade", "troops", "weapons",
];

const stopWords = new Set([
  "about", "after", "again", "against", "also", "among", "because", "before", "being",
  "could", "from", "have", "into", "more", "other", "over", "said", "says", "than", "that",
  "their", "there", "these", "they", "this", "through", "under", "were", "what", "when",
  "where", "which", "while", "with", "would", "your",
]);

function normalizeText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function splitSentences(text = "") {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 80 && sentence.length <= 520);
}

function sentenceScore(sentence, keywords = []) {
  const lower = sentence.toLowerCase();
  let score = Math.min(sentence.length / 120, 2.4);
  score += keywords.filter((keyword) => lower.includes(keyword)).length * 2.2;
  score += actionTerms.filter((term) => lower.includes(term)).length * 1.3;
  score += impactTerms.filter((term) => lower.includes(term)).length * 0.8;
  if (/\b\d[\d,.%$]*\b/.test(sentence)) score += 1.6;
  if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|yesterday)\b/i.test(sentence)) score += 0.7;
  if (/^(sign up|click here|read more|follow us|advertisement)/i.test(sentence)) score -= 8;
  return score;
}

function passageKind(sentence) {
  if (/\b(according to|said|says|told|statement|officials?)\b/i.test(sentence)) return "Attributed account";
  if (/\b\d[\d,.%$]*\b/.test(sentence) || impactTerms.some((term) => sentence.toLowerCase().includes(term))) return "Impact indicator";
  return "Reported development";
}

function tokens(value = "") {
  return new Set((value.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter((token) => !stopWords.has(token)));
}

function overlap(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.min(leftTokens.size, rightTokens.size);
}

function selectPassages(text, keywords, limit = 3) {
  const selected = [];
  const ranked = splitSentences(text)
    .map((sentence) => ({ sentence, score: sentenceScore(sentence, keywords) }))
    .sort((a, b) => b.score - a.score);

  for (const candidate of ranked) {
    if (selected.some((item) => overlap(item.text, candidate.sentence) > 0.72)) continue;
    selected.push({ text: candidate.sentence, kind: passageKind(candidate.sentence) });
    if (selected.length === limit) break;
  }
  return selected;
}

function articleBodyFromJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, source] of scripts) {
    try {
      const parsed = JSON.parse(source.trim());
      const records = Array.isArray(parsed) ? parsed : [parsed];
      const queue = [...records];
      while (queue.length) {
        const record = queue.shift();
        if (!record || typeof record !== "object") continue;
        if (typeof record.articleBody === "string") return record.articleBody;
        if (Array.isArray(record["@graph"])) queue.push(...record["@graph"]);
      }
    } catch {
      // Malformed publisher metadata is ignored; the DOM extractor can still succeed.
    }
  }
  return "";
}

async function articleBodyFromDom(html) {
  if (typeof HTMLRewriter === "undefined") return "";
  const paragraphs = [];
  const seen = new Set();
  const makeHandler = () => {
    let content = "";
    return {
      element(element) {
        content = "";
        element.onEndTag(() => {
          const paragraph = normalizeText(content);
          if (paragraph.length >= 55 && !seen.has(paragraph)) {
            seen.add(paragraph);
            paragraphs.push(paragraph);
          }
        });
      },
      text(chunk) {
        content += chunk.text;
      },
    };
  };
  const response = new HTMLRewriter()
    .on("article p", makeHandler())
    .on("main p", makeHandler())
    .transform(new Response(html));
  await response.text();
  return paragraphs.join(" ");
}

export async function extractReadableArticle(html, url, keywords = []) {
  try {
    const jsonLdBody = articleBodyFromJsonLd(html);
    const text = normalizeText(jsonLdBody || await articleBodyFromDom(html));
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 120) return null;
    return {
      canonicalUrl: url,
      wordCount,
      passages: selectPassages(text, keywords),
    };
  } catch {
    return null;
  }
}

export async function enrichArticle(article, keywords, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetchImpl(article.url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "OpsBriefing/1.1 (+public-news-research; respects publisher access controls)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) throw new Error("Article body unavailable");
    const extracted = await extractReadableArticle(await response.text(), article.url, keywords);
    if (!extracted?.passages.length) throw new Error("No readable article body");
    return { ...article, ...extracted, access: "Full public article", passages: extracted.passages };
  } catch {
    return {
      ...article,
      wordCount: article.evidence.split(/\s+/).filter(Boolean).length,
      access: "Newsroom feed excerpt",
      passages: selectPassages(article.evidence, keywords, 1).length
        ? selectPassages(article.evidence, keywords, 1)
        : [{ text: article.evidence, kind: "Publisher summary" }],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function findRelatedCoverage(development, allDevelopments) {
  return allDevelopments
    .filter((candidate) => candidate.url !== development.url && overlap(development.text, candidate.text) >= 0.34)
    .map((candidate) => candidate.outlet)
    .filter((outlet, index, values) => values.indexOf(outlet) === index);
}

export function buildEventAnalysis(event) {
  const developments = event.articles
    .flatMap((article) => article.passages.slice(0, 2).map((passage) => ({
      ...passage,
      outlet: article.outlet,
      url: article.url,
      access: article.access,
    })))
    .sort((a, b) => sentenceScore(b.text, event.keywords) - sentenceScore(a.text, event.keywords));

  const distinct = [];
  for (const development of developments) {
    if (distinct.some((existing) => overlap(existing.text, development.text) > 0.68)) continue;
    distinct.push({ ...development, relatedOutlets: findRelatedCoverage(development, developments) });
    if (distinct.length === 6) break;
  }

  const fullTextSources = event.articles.filter((article) => article.access === "Full public article").length;
  const convergentClaims = distinct.filter((item) => item.relatedOutlets.length > 0).length;
  const lead = distinct[0] ?? {
    text: event.articles[0]?.evidence ?? event.title,
    outlet: event.articles[0]?.outlet ?? "Current reporting",
    url: event.articles[0]?.url ?? "",
    kind: "Reported development",
    access: "Newsroom feed excerpt",
    relatedOutlets: [],
  };

  return {
    bottomLine: lead,
    developments: distinct,
    sourceAudit: {
      fullTextSources,
      feedOnlySources: event.articles.length - fullTextSources,
      convergentClaims,
      summary: convergentClaims
        ? `${convergentClaims} selected passage${convergentClaims === 1 ? " has" : "s have"} materially related reporting from another outlet.`
        : "The selected passages emphasize different parts of the story; treat them as complementary accounts, not direct corroboration.",
    },
    analysis: event.analysis,
  };
}
