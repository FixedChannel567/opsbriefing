export const dynamic = "force-dynamic";

import { attachDailyChanges } from "@/db/snapshots";
import { parseFeedXml } from "@/lib/feed-parser.mjs";
import { resolveEventLocation } from "@/lib/geocode.mjs";

type Topic = {
  id: string;
  label: string;
  region: string;
  keywords: string[];
  coordinates: { x: number; y: number };
  locationNames: string[];
  actors: string[];
  watch: string[];
};

const topics: Topic[] = [
  { id: "iran", label: "Iran and Gulf security", region: "Middle East", keywords: ["iran", "hormuz", "persian gulf", "houthi"], locationNames: ["Tehran, Iran", "Strait of Hormuz", "Red Sea", "Saudi Arabia"], coordinates: { x: 61, y: 46 }, actors: ["Iran", "United States", "Gulf states", "Regional armed groups"], watch: ["official military statements", "shipping notices", "energy-market reaction"] },
  { id: "ukraine", label: "Russia-Ukraine war", region: "Europe", keywords: ["ukraine", "kyiv", "zelensky", "russian strike"], locationNames: ["Kyiv, Ukraine", "Odesa, Ukraine", "Black Sea", "Moscow, Russia", "Brussels, Belgium"], coordinates: { x: 55, y: 32 }, actors: ["Ukraine", "Russia", "European governments", "NATO members"], watch: ["civilian impact", "front-line changes", "air-defense and aid decisions"] },
  { id: "israel-gaza", label: "Israel, Gaza and regional conflict", region: "Middle East", keywords: ["gaza", "israel", "hamas", "west bank", "hezbollah"], locationNames: ["Gaza", "West Bank", "Jerusalem", "Lebanon"], coordinates: { x: 57, y: 43 }, actors: ["Israel", "Palestinian authorities and groups", "United States", "Regional mediators"], watch: ["ceasefire diplomacy", "humanitarian access", "regional escalation"] },
  { id: "china-taiwan", label: "China and Taiwan Strait", region: "Indo-Pacific", keywords: ["taiwan", "south china sea", "beijing", "china military"], locationNames: ["Taiwan Strait", "South China Sea", "Beijing, China"], coordinates: { x: 79, y: 44 }, actors: ["China", "Taiwan", "United States", "Japan and regional states"], watch: ["military activity", "trade restrictions", "official diplomatic responses"] },
  { id: "sudan-sahel", label: "Sudan and Sahel security", region: "Africa", keywords: ["sudan", "sahel", "mali", "burkina faso", "niger coup"], locationNames: ["Sudan", "Mali"], coordinates: { x: 53, y: 55 }, actors: ["Regional governments", "Armed groups", "African Union", "Humanitarian agencies"], watch: ["displacement", "territorial control", "aid access"] },
  { id: "trade", label: "Trade, sanctions and global economy", region: "Global", keywords: ["tariff", "trade war", "sanctions", "global economy", "oil price"], locationNames: [], coordinates: { x: 33, y: 39 }, actors: ["United States", "China", "European Union", "Major exporters"], watch: ["new policy text", "market reaction", "supply-chain changes"] },
  { id: "indo-pacific", label: "Korean Peninsula and Indo-Pacific", region: "Indo-Pacific", keywords: ["north korea", "south korea", "korean peninsula", "japan defense"], locationNames: ["North Korea", "Beijing, China", "Taiwan Strait"], coordinates: { x: 82, y: 38 }, actors: ["North Korea", "South Korea", "Japan", "United States and China"], watch: ["missile activity", "military exercises", "diplomatic contacts"] },
  { id: "europe", label: "European security and diplomacy", region: "Europe", keywords: ["nato", "european union", "europe security", "european leaders"], locationNames: ["Brussels, Belgium", "Kyiv, Ukraine", "Moscow, Russia"], coordinates: { x: 50, y: 31 }, actors: ["European Union", "NATO", "National governments", "United States"], watch: ["joint statements", "defense commitments", "sanctions policy"] },
  { id: "americas", label: "U.S. foreign policy and the Americas", region: "Americas", keywords: ["trump", "white house", "us foreign policy", "venezuela", "brazil"], locationNames: ["Washington, D.C.", "Venezuela", "Brazil"], coordinates: { x: 24, y: 39 }, actors: ["United States", "Regional governments", "Diplomatic partners", "International institutions"], watch: ["official policy changes", "diplomatic response", "economic spillovers"] },
  { id: "cyber", label: "Cyber and strategic technology", region: "Global", keywords: ["cyberattack", "semiconductor", "chip export", "ai military"], locationNames: [], coordinates: { x: 70, y: 27 }, actors: ["National governments", "Technology companies", "Cybersecurity agencies", "Critical-infrastructure operators"], watch: ["attribution", "service disruption", "export controls"] },
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
    const candidates = topics
      .map((topic) => {
        const matched = articles.filter((article) => {
          const searchable = `${article.title} ${article.evidence}`.toLowerCase();
          return topic.keywords.some((keyword) => searchable.includes(keyword));
        });
        const byOutlet = [...new Map(matched.map((article) => [article.outlet, article])).values()].slice(0, 6);
        if (!byOutlet.length) return null;
        const geocoded = resolveEventLocation(byOutlet, { coordinates: topic.coordinates, label: topic.region }, topic.locationNames);
        return { ...topic, ...geocoded, title: byOutlet[0].title, sourceCount: byOutlet.length, articles: byOutlet };
      })
      .flatMap((event) => event ? [event] : [])
      .sort((a, b) => b.sourceCount - a.sourceCount || b.articles.length - a.articles.length);
    const usedHeadlines = new Set<string>();
    const events = candidates.slice(0, 5).map((event, index) => {
      const lead = event.articles.find((article) => !usedHeadlines.has(article.title)) ?? event.articles[0];
      usedHeadlines.add(lead.title);
      return { ...event, title: lead.title, rank: index + 1 };
    });

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
