const places = [
  ["Kyiv, Ukraine", ["kyiv", "kiev"], 50.4501, 30.5234],
  ["Odesa, Ukraine", ["odesa", "odessa"], 46.4825, 30.7233],
  ["Black Sea", ["black sea"], 43.0, 34.0],
  ["Moscow, Russia", ["moscow"], 55.7558, 37.6173],
  ["Gaza", ["gaza"], 31.3547, 34.3088],
  ["West Bank", ["west bank"], 31.9466, 35.3027],
  ["Jerusalem", ["jerusalem"], 31.7683, 35.2137],
  ["Lebanon", ["lebanon", "beirut"], 33.8938, 35.5018],
  ["Tehran, Iran", ["tehran"], 35.6892, 51.389],
  ["Strait of Hormuz", ["strait of hormuz", "hormuz"], 26.5667, 56.25],
  ["Red Sea", ["red sea"], 20.0, 38.0],
  ["Saudi Arabia", ["saudi arabia", "riyadh"], 24.7136, 46.6753],
  ["Taiwan Strait", ["taiwan strait", "taiwan", "taipei"], 24.0, 120.8],
  ["South China Sea", ["south china sea"], 12.0, 113.0],
  ["Beijing, China", ["beijing"], 39.9042, 116.4074],
  ["Sudan", ["sudan", "khartoum", "darfur"], 15.5007, 32.5599],
  ["Mali", ["mali", "bamako"], 12.6392, -8.0029],
  ["North Korea", ["north korea", "pyongyang"], 39.0392, 125.7625],
  ["Washington, D.C.", ["washington", "white house"], 38.9072, -77.0369],
  ["Venezuela", ["venezuela", "caracas"], 10.4806, -66.9036],
  ["Brazil", ["brazil", "brasilia"], -15.7939, -47.8828],
  ["Brussels, Belgium", ["brussels", "european union", "nato"], 50.8503, 4.3517],
];

function project(latitude, longitude) {
  return {
    x: Number((((longitude + 180) / 360) * 100).toFixed(2)),
    y: Number((((90 - latitude) / 180) * 100).toFixed(2)),
  };
}

export function resolveEventLocation(articles, fallback, allowedNames = []) {
  const corpus = articles.map((article) => `${article.title} ${article.evidence}`).join(" ").toLowerCase();
  const eligiblePlaces = allowedNames.length ? places.filter(([name]) => allowedNames.includes(name)) : places;
  const ranked = eligiblePlaces.map(([name, aliases, latitude, longitude]) => ({
    name,
    aliases,
    latitude,
    longitude,
    hits: aliases.reduce((count, alias) => count + corpus.split(alias).length - 1, 0),
  })).filter((place) => place.hits > 0).sort((a, b) => b.hits - a.hits || b.aliases[0].length - a.aliases[0].length);
  const match = ranked[0];
  if (!match) return { ...fallback, locationLabel: fallback.label, geoBasis: "Regional fallback; no supported place name was found in the source excerpts." };
  return {
    coordinates: project(match.latitude, match.longitude),
    locationLabel: match.name,
    geoBasis: `Mapped from ${match.hits} place-name mention${match.hits === 1 ? "" : "s"} in current reporting.`,
  };
}
