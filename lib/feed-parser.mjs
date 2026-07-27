const namedEntities = {
  amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "-", mdash: "-",
  lsquo: "'", rsquo: "'", ldquo: "\"", rdquo: "\"", hellip: "...",
};

export function decodeEntities(value = "") {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const numeric = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : " ";
    }
    return namedEntities[code.toLowerCase()] ?? " ";
  });
}

export function sanitizeFeedText(value = "") {
  let text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let pass = 0; pass < 3; pass += 1) text = decodeEntities(text);
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/(?:&lt;|&#60;)[\s\S]*?(?:&gt;|&#62;)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function field(block, name, limit) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return sanitizeFeedText(match?.[1] ?? "").slice(0, limit);
}

export function parseFeedXml(xml, feed, limit = 45) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, limit).flatMap((match) => {
    const block = match[1];
    const title = field(block, "title", 260);
    const url = field(block, "link", 900) || field(block, "guid", 900);
    const evidence = field(block, "description", 900) || title;
    const seenAt = field(block, "pubDate", 120) || field(block, "dc:date", 120);
    return title && url ? [{
      title,
      url,
      domain: feed.domain,
      outlet: feed.outlet,
      seenAt,
      sourceCountry: feed.country,
      evidence,
    }] : [];
  });
}
