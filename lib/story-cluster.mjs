const stopWords = new Set([
  "about", "after", "against", "amid", "among", "and", "another", "around", "because", "been",
  "before", "being", "between", "could", "during", "from", "have", "into", "latest",
  "for", "has", "its", "more", "news", "official", "officials", "other", "over", "report", "reports", "said",
  "says", "than", "that", "their", "there", "these", "they", "this", "through", "under",
  "the", "were", "what", "when", "where", "which", "while", "will", "with", "world", "would",
]);

const conceptAliases = new Map(Object.entries({
  attacked: "attack", attacks: "attack", bombing: "attack", bombed: "attack", hit: "attack",
  missile: "attack", missiles: "attack", strike: "attack", strikes: "attack", struck: "attack",
  ceasefire: "ceasefire", truce: "ceasefire",
  negotiation: "talks", negotiations: "talks", talks: "talks", summit: "talks",
  sanctions: "sanction", sanctioned: "sanction",
  tariffs: "tariff", levies: "tariff",
  drills: "drill", exercises: "drill", exercise: "drill",
  election: "election", elected: "election", inauguration: "election", president: "election",
  cargo: "shipping", ship: "shipping", ships: "shipping", shipping: "shipping", vessel: "shipping",
  rescued: "shipwreck", missing: "shipwreck", sank: "shipwreck",
  drones: "drone", drone: "drone",
  troops: "troop", soldiers: "troop",
  weapons: "weapon", arms: "weapon",
  tariffs: "tariff", trade: "trade",
  floods: "flood", flooding: "flood", rainfall: "flood", deluge: "flood",
  typhoon: "storm", typhoons: "storm", cyclone: "storm",
}));

const geopoliticalSignals = [
  "airstrike", "attack", "border", "ceasefire", "conflict", "coup", "defence", "defense",
  "diplomacy", "diplomatic", "disputed", "election", "exports", "government", "invasion",
  "military", "minister", "missile", "nato", "negotiations", "policy", "president", "sanctions",
  "security", "strike", "tariff", "trade", "troops", "war", "weapon",
];

const consequenceSignals = [
  "casualties", "civilian", "civilians", "closed", "closure", "dead", "displaced", "exports",
  "hostage", "hostages", "killed", "missing", "oil", "sanctions", "shipping", "tariff", "troops",
  "wounded",
];

const eventConcepts = new Set([
  "attack", "border", "ceasefire", "coup", "drill", "drone", "election", "policy", "sanction",
  "shipping", "shipwreck", "talks", "tariff", "trade", "troop", "weapon",
]);

const highSpecificityConcepts = new Set([
  "ceasefire", "coup", "drill", "election", "sanction", "shipwreck", "talks", "tariff",
]);

function normalizeToken(token) {
  const lower = token.toLowerCase().replace(/['’]s$/, "");
  if (conceptAliases.has(lower)) return conceptAliases.get(lower);
  if (lower.length > 5 && lower.endsWith("ing")) return lower.slice(0, -3);
  if (lower.length > 4 && lower.endsWith("ed")) return lower.slice(0, -2);
  if (lower.length > 4 && lower.endsWith("s")) return lower.slice(0, -1);
  return lower;
}

function tokens(value = "") {
  return new Set((value.match(/[A-Za-z][A-Za-z'’-]{2,}/g) ?? [])
    .map(normalizeToken)
    .filter((token) => !stopWords.has(token)));
}

function corpus(article, evidenceLimit = 360) {
  return `${article.title} ${article.evidence.slice(0, evidenceLimit)}`.toLowerCase();
}

function keywordTokens(topic) {
  return new Set(topic.keywords.flatMap((keyword) => [...tokens(keyword)]));
}

function matchedKeywords(article, topic) {
  const searchable = corpus(article);
  return topic.keywords.filter((keyword) => searchable.includes(keyword));
}

export function isRelevantToTopic(article, topic) {
  const matches = matchedKeywords(article, topic);
  if (!matches.length) return false;
  if (matches.length >= 2) return true;
  const searchable = corpus(article);
  return geopoliticalSignals.some((signal) => searchable.includes(signal));
}

function eventTerms(article, topic) {
  const broad = keywordTokens(topic);
  return new Set([...tokens(`${article.title} ${article.evidence.slice(0, 240)}`)]
    .filter((token) => !broad.has(token)));
}

function shared(left, right) {
  return [...left].filter((value) => right.has(value));
}

export function compareStoryArticles(left, right, topic) {
  const leftCorpus = corpus(left);
  const rightCorpus = corpus(right);
  const sharedAnchors = topic.keywords.filter((keyword) => leftCorpus.includes(keyword) && rightCorpus.includes(keyword));
  const sharedTerms = shared(eventTerms(left, topic), eventTerms(right, topic));
  const sharedConcrete = sharedTerms.filter((term) => eventConcepts.has(term));
  const sharedSpecific = sharedConcrete.filter((term) => highSpecificityConcepts.has(term));
  const sameStory = (
    (sharedAnchors.length >= 1 && sharedSpecific.length >= 1)
    || (sharedAnchors.length >= 1 && sharedConcrete.length >= 1 && sharedTerms.length >= 2)
    || (sharedConcrete.length >= 1 && sharedTerms.length >= 3)
  );
  const score = sharedAnchors.length * 4 + sharedTerms.length + sharedConcrete.length * 3;
  return { sameStory, score, sharedAnchors, sharedTerms };
}

function storyFocus(articles, topic) {
  const counts = new Map();
  for (const article of articles) {
    for (const term of eventTerms(article, topic)) counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([term]) => term);
}

function stableStoryKey(topic, articles, focusTerms) {
  const seed = focusTerms.length ? focusTerms.join("-") : articles.map((article) => article.title).sort()[0];
  const slug = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 46);
  return `${topic.id}-${slug || "current-development"}`;
}

function parsedTime(article) {
  const value = Date.parse(article.seenAt);
  return Number.isFinite(value) ? value : 0;
}

function importance(cluster, topic) {
  const searchable = cluster.articles.map((article) => corpus(article)).join(" ");
  const consequences = consequenceSignals.filter((signal) => searchable.includes(signal)).length;
  const freshest = Math.max(...cluster.articles.map(parsedTime), 0);
  const ageHours = freshest ? Math.max(0, (Date.now() - freshest) / 3_600_000) : 48;
  const recency = Math.max(0, 24 - ageHours) / 8;
  return cluster.articles.length * 12 + consequences * 1.5 + recency + (topic.priority ?? 0);
}

export function clusterTopicArticles(articles, topic) {
  const relevant = articles.filter((article) => isRelevantToTopic(article, topic));
  const clusters = [];

  for (const article of relevant.sort((a, b) => parsedTime(b) - parsedTime(a))) {
    let best = null;
    for (const cluster of clusters) {
      if (cluster.articles.some((candidate) => candidate.outlet === article.outlet)) continue;
      const comparisons = cluster.articles.map((candidate) => compareStoryArticles(article, candidate, topic));
      const strongest = comparisons.sort((a, b) => b.score - a.score)[0];
      if (strongest?.sameStory && (!best || strongest.score > best.score)) best = { cluster, score: strongest.score };
    }
    if (best) best.cluster.articles.push(article);
    else clusters.push({ articles: [article] });
  }

  return clusters
    .filter((cluster) => cluster.articles.length >= 2)
    .map((cluster) => {
      const focusTerms = storyFocus(cluster.articles, topic);
      return {
        ...cluster,
        topic,
        focusTerms,
        storyKey: stableStoryKey(topic, cluster.articles, focusTerms),
        importance: importance(cluster, topic),
      };
    });
}

export function selectTopStories(articles, topics, limit = 5) {
  const candidates = topics
    .flatMap((topic) => clusterTopicArticles(articles, topic))
    .sort((a, b) => b.importance - a.importance || b.articles.length - a.articles.length);
  const selected = [];
  const usedUrls = new Set();

  for (const candidate of candidates) {
    const overlapCount = candidate.articles.filter((article) => usedUrls.has(article.url)).length;
    if (overlapCount >= Math.ceil(candidate.articles.length / 2)) continue;
    selected.push(candidate);
    candidate.articles.forEach((article) => usedUrls.add(article.url));
    if (selected.length === limit) break;
  }
  return selected;
}
