export const dynamic = "force-dynamic";

import { attachDailyChanges } from "@/db/snapshots";
import { buildEventAnalysis, enrichArticle } from "@/lib/article-intelligence.mjs";
import { parseFeedXml } from "@/lib/feed-parser.mjs";
import { resolveEventLocation } from "@/lib/geocode.mjs";
import { selectTopStories } from "@/lib/story-cluster.mjs";

type Topic = {
  id: string;
  label: string;
  region: string;
  keywords: string[];
  priority: number;
  coordinates: { x: number; y: number };
  locationNames: string[];
  actors: string[];
  watch: string[];
  analysis: {
    whyItMatters: string;
    connection: string;
    uncertainty: string;
  };
};

const topics: Topic[] = [
  { id: "iran", label: "Iran and Gulf security", region: "Middle East", priority: 10, keywords: ["iran", "hormuz", "persian gulf", "houthi"], locationNames: ["Tehran, Iran", "Strait of Hormuz", "Red Sea", "Saudi Arabia"], coordinates: { x: 61, y: 46 }, actors: ["Iran", "United States", "Gulf states", "Regional armed groups"], watch: ["official military statements", "shipping notices", "energy-market reaction"], analysis: { whyItMatters: "Changes around Iran and the Gulf can transmit quickly through energy prices, commercial shipping, regional force posture, and escalation risk.", connection: "Read military developments alongside tanker routing, insurance costs, sanctions enforcement, and Gulf-state diplomacy; movement in one channel can precede pressure in the others.", uncertainty: "Public reporting may establish what occurred without establishing intent, attribution, or whether an action marks a lasting policy change." } },
  { id: "ukraine", label: "Russia-Ukraine war", region: "Europe", priority: 10, keywords: ["ukraine", "kyiv", "zelensky", "russian strike"], locationNames: ["Kyiv, Ukraine", "Odesa, Ukraine", "Black Sea", "Moscow, Russia", "Brussels, Belgium"], coordinates: { x: 55, y: 32 }, actors: ["Ukraine", "Russia", "European governments", "NATO members"], watch: ["civilian impact", "front-line changes", "air-defense and aid decisions"], analysis: { whyItMatters: "Battlefield pressure, attacks on infrastructure, and external assistance interact: each can alter negotiating leverage, civilian resilience, and European security planning.", connection: "Compare operational reporting with air-defense inventories, aid votes, sanctions decisions, Black Sea trade, and European defense production.", uncertainty: "Front-line claims and casualty figures are often difficult to verify quickly and may be presented selectively by belligerents." } },
  { id: "israel-gaza", label: "Israel, Gaza and regional conflict", region: "Middle East", priority: 10, keywords: ["gaza", "israel", "hamas", "west bank", "hezbollah"], locationNames: ["Gaza", "West Bank", "Jerusalem", "Lebanon"], coordinates: { x: 57, y: 43 }, actors: ["Israel", "Palestinian authorities and groups", "United States", "Regional mediators"], watch: ["ceasefire diplomacy", "humanitarian access", "regional escalation"], analysis: { whyItMatters: "Military operations, hostage negotiations, humanitarian access, and regional deterrence are linked; a change in one track can reshape the others.", connection: "Follow mediator statements and aid access alongside activity in Lebanon, the Red Sea, Iran, and domestic political pressure on the parties.", uncertainty: "Access constraints, contested casualty reporting, and rapidly changing negotiations can leave important details unresolved." } },
  { id: "china-taiwan", label: "China and Taiwan Strait", region: "Indo-Pacific", priority: 9, keywords: ["taiwan", "south china sea", "beijing", "china military"], locationNames: ["Taiwan Strait", "South China Sea", "Beijing, China"], coordinates: { x: 79, y: 44 }, actors: ["China", "Taiwan", "United States", "Japan and regional states"], watch: ["military activity", "trade restrictions", "official diplomatic responses"], analysis: { whyItMatters: "Cross-strait pressure affects regional deterrence, semiconductor supply chains, commercial shipping, and alliance planning.", connection: "Assess military activity together with official legal language, export controls, elections, coast-guard activity, and responses from Japan and the United States.", uncertainty: "Exercises and signaling can be observable while the intended threshold, duration, and escalation risk remain ambiguous." } },
  { id: "sudan-sahel", label: "Sudan and Sahel security", region: "Africa", priority: 7, keywords: ["sudan", "sahel", "mali", "burkina faso", "niger coup"], locationNames: ["Sudan", "Mali"], coordinates: { x: 53, y: 55 }, actors: ["Regional governments", "Armed groups", "African Union", "Humanitarian agencies"], watch: ["displacement", "territorial control", "aid access"], analysis: { whyItMatters: "Territorial control and aid access shape displacement, food security, cross-border instability, and the operating space for armed groups.", connection: "Link security reporting to refugee flows, port and road access, regional mediation, commodity prices, and humanitarian funding.", uncertainty: "Communications outages and limited independent access can delay confirmation of attacks, control changes, and casualty totals." } },
  { id: "trade", label: "Trade, sanctions and global economy", region: "Global", priority: 8, keywords: ["tariff", "trade war", "sanctions", "global economy", "oil price"], locationNames: [], coordinates: { x: 33, y: 39 }, actors: ["United States", "China", "European Union", "Major exporters"], watch: ["new policy text", "market reaction", "supply-chain changes"], analysis: { whyItMatters: "Trade and sanctions policy can move prices, reroute investment, and alter supply chains before the full macroeconomic effect appears in official data.", connection: "Separate announced policy from implemented rules, then track retaliation, exemptions, shipping patterns, corporate guidance, and market repricing.", uncertainty: "Headline tariff rates often differ from effective rates after timing, product coverage, exemptions, and legal challenges are considered." } },
  { id: "indo-pacific", label: "Korean Peninsula and Indo-Pacific", region: "Indo-Pacific", priority: 8, keywords: ["north korea", "south korea", "korean peninsula", "japan defense"], locationNames: ["North Korea", "Beijing, China", "Taiwan Strait"], coordinates: { x: 82, y: 38 }, actors: ["North Korea", "South Korea", "Japan", "United States and China"], watch: ["missile activity", "military exercises", "diplomatic contacts"], analysis: { whyItMatters: "Weapons testing and force posture affect deterrence calculations across South Korea, Japan, China, and the United States.", connection: "Read launch reporting with exercise schedules, sanctions enforcement, alliance consultations, and diplomatic contact.", uncertainty: "Initial assessments of weapons performance, payload, and intent often change after technical review." } },
  { id: "europe", label: "European security and diplomacy", region: "Europe", priority: 7, keywords: ["nato", "european union", "europe security", "european leaders"], locationNames: ["Brussels, Belgium", "Kyiv, Ukraine", "Moscow, Russia"], coordinates: { x: 50, y: 31 }, actors: ["European Union", "NATO", "National governments", "United States"], watch: ["joint statements", "defense commitments", "sanctions policy"], analysis: { whyItMatters: "European decisions on defense, sanctions, and industrial capacity shape both immediate crisis response and the continent's longer-term security architecture.", connection: "Compare summit language with national budgets, procurement, troop commitments, energy policy, and implementation deadlines.", uncertainty: "Joint political statements may conceal differences over funding, timing, and national execution." } },
  { id: "americas", label: "U.S. foreign policy and the Americas", region: "Americas", priority: 7, keywords: ["trump", "white house", "us foreign policy", "venezuela", "brazil"], locationNames: ["Washington, D.C.", "Venezuela", "Brazil"], coordinates: { x: 24, y: 39 }, actors: ["United States", "Regional governments", "Diplomatic partners", "International institutions"], watch: ["official policy changes", "diplomatic response", "economic spillovers"], analysis: { whyItMatters: "U.S. policy changes can reshape sanctions, migration, security cooperation, commodity flows, and diplomatic alignments across the hemisphere.", connection: "Distinguish presidential statements from agency implementation, court action, congressional funding, and responses by regional governments.", uncertainty: "Fast-moving political announcements may precede detailed policy, legal authority, or operational guidance." } },
  { id: "cyber", label: "Cyber and strategic technology", region: "Global", priority: 6, keywords: ["cyberattack", "semiconductor", "chip export", "ai military"], locationNames: [], coordinates: { x: 70, y: 27 }, actors: ["National governments", "Technology companies", "Cybersecurity agencies", "Critical-infrastructure operators"], watch: ["attribution", "service disruption", "export controls"], analysis: { whyItMatters: "Cyber incidents and technology controls can affect critical services, military capacity, industrial competitiveness, and supply-chain concentration.", connection: "Track technical indicators alongside government attribution, company disclosures, export-control text, and evidence of real-world disruption.", uncertainty: "Attribution is rarely immediate, and public statements may reflect incomplete technical evidence or strategic signaling." } },
];

const feeds = [
  { outlet: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml", domain: "bbc.com", country: "United Kingdom" },
  { outlet: "The Guardian", url: "https://www.theguardian.com/world/rss", domain: "theguardian.com", country: "United Kingdom" },
  { outlet: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", domain: "aljazeera.com", country: "Qatar" },
  { outlet: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all", domain: "dw.com", country: "Germany" },
  { outlet: "France 24", url: "https://www.france24.com/en/rss", domain: "france24.com", country: "France" },
  { outlet: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", domain: "nytimes.com", country: "United States" },
];

async function fetchFeed(feed: typeof feeds[number]) {
  const response = await fetch(feed.url, { next: { revalidate: 600 }, headers: { "User-Agent": "OpsBriefing/1.0" } });
  if (!response.ok) return [];
  const xml = await response.text();
  return parseFeedXml(xml, feed);
}

export async function GET() {
  try {
    const settled = await Promise.allSettled(feeds.map(fetchFeed));
    const articles = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const candidates = selectTopStories(articles, topics, 5).map(({ topic, storyKey, articles: storyArticles, focusTerms }) => {
      const byOutlet = storyArticles.slice(0, 6);
      const geocoded = resolveEventLocation(byOutlet, { coordinates: topic.coordinates, label: topic.region }, topic.locationNames);
      return { ...topic, id: storyKey, topicId: topic.id, ...geocoded, focusTerms, title: byOutlet[0].title, sourceCount: byOutlet.length, articles: byOutlet };
    });
    const usedHeadlines = new Set<string>();
    const selectedEvents = candidates.slice(0, 5).map((event, index) => {
      const lead = event.articles.find((article) => !usedHeadlines.has(article.title)) ?? event.articles[0];
      usedHeadlines.add(lead.title);
      return { ...event, title: lead.title, rank: index + 1 };
    });

    const events = await Promise.all(selectedEvents.map(async (event) => {
      const evidenceTerms = [...event.keywords, ...event.focusTerms];
      const enrichedArticles = await Promise.all(event.articles.slice(0, 4).map((article) => enrichArticle(article, evidenceTerms)));
      const remainingArticles = event.articles.slice(4).map((article) => ({
        ...article,
        wordCount: article.evidence.split(/\s+/).filter(Boolean).length,
        access: "Newsroom feed excerpt",
        passages: [{ text: article.evidence, kind: "Publisher summary" }],
      }));
      const enrichedEvent = { ...event, articles: [...enrichedArticles, ...remainingArticles] };
      return { ...enrichedEvent, intelligence: buildEventAnalysis(enrichedEvent) };
    }));

    if (!events.length) throw new Error("No current major-network evidence was available");

    const briefing = await attachDailyChanges(events);
    return Response.json({
      updatedAt: new Date().toISOString(),
      source: "Direct newsroom feeds from BBC, The Guardian, Al Jazeera, Deutsche Welle, France 24, and The New York Times",
      snapshotStatus: briefing.snapshotStatus,
      events: briefing.events,
    });
  } catch (error) {
    return Response.json({
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Live source fetch failed",
      events: [],
    }, { status: 502 });
  }
}
