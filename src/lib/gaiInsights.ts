import sanitizeHtml from "sanitize-html";

export type GaiRatingItem = {
  date?: string;
  rating?: string;
  title: string;
  url?: string;
  rationale?: string;
};

export type GaiBriefingItem = {
  title: string;
  url: string;
};

export type GaiBriefing = {
  date?: string;
  items: GaiBriefingItem[];
};

const BASE_URL = "https://gaiinsights.com";

export async function fetchGaiInsightsRatings(): Promise<GaiRatingItem[]> {
  const html = await fetchHtml(`${BASE_URL}/ratings`);
  return parseRatingsHtml(html);
}

export async function fetchGaiInsightsBriefing(): Promise<GaiBriefing> {
  const html = await fetchHtml(`${BASE_URL}/articles`);
  return parseBriefingHtml(html);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ColaberryAI/1.0 (+https://colaberry.ai)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`GAI Insights request failed: ${response.status}`);
  }
  return response.text();
}

function parseRatingsHtml(html: string): GaiRatingItem[] {
  const tableItems = parseRatingsFromTable(html);
  if (tableItems.length > 0) {
    return tableItems;
  }

  const scriptItems = parseRatingsFromScripts(html);
  if (scriptItems.length > 0) {
    return scriptItems;
  }

  return [];
}

function parseRatingsFromTable(html: string): GaiRatingItem[] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return [];
  }

  const tableHtml = tableMatch[1];
  const rows = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const items: GaiRatingItem[] = [];

  rows.forEach((row) => {
    const cells = Array.from(row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(
      (cell) => cell[1]
    );
    if (cells.length < 4) {
      return;
    }

    const date = normalizeText(stripHtml(cells[0]));
    const rating = normalizeText(stripHtml(cells[1]));
    const { text: titleText, href } = extractLink(cells[2]);
    const rationale = normalizeText(stripHtml(cells[3]));

    if (!date || date.toLowerCase() === "date") {
      return;
    }

    if (!titleText) {
      return;
    }

    items.push({
      date,
      rating,
      title: titleText,
      url: href,
      rationale,
    });
  });

  return items;
}

function parseRatingsFromScripts(html: string): GaiRatingItem[] {
  const items: GaiRatingItem[] = [];
  const seen = new Set<string>();
  const searchSpaces = buildSearchSpaces(html);
  const rationaleRegexes = [
    /rationale\s*[:=]\s*(['"])([\s\S]*?)\1/gi,
    /rationale\s*[:=]\s*(?:&quot;|&#34;|\\\")([\s\S]*?)(?:&quot;|&#34;|\\\")/gi,
    /rationale\s*[:=]\s*`([\s\S]*?)`/gi,
  ];

  searchSpaces.forEach((space) => {
    rationaleRegexes.forEach((rationaleRegex) => {
      rationaleRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rationaleRegex.exec(space)) !== null) {
        const rationale = normalizeText(stripHtml(match[2] ?? match[1] ?? ""));
        const contextStart = Math.max(0, match.index - 1400);
        const contextEnd = Math.min(space.length, match.index + 400);
        const context = space.slice(contextStart, contextEnd);

        const anchor = findLastAnchor(context);
        const rawTitle =
          findLastMatch(context, /(title|headline|name)\s*[:=]\s*`([\s\S]*?)`/gi, 2) ??
          findLastMatch(context, /(title|headline|name)\s*[:=]\s*(['"])([\s\S]*?)\2/gi, 3);
        const rawUrl = findLastMatch(context, /(link|url|href)\s*[:=]\s*['"]([^'"]+)['"]/gi, 2);
        const date = normalizeText(
          findLastMatch(context, /(date|published|rating_date)\s*[:=]\s*['"]([^'"]+)['"]/gi, 2) ||
            ""
        );
        const rating = normalizeText(
          findLastMatch(context, /(rating|score)\s*[:=]\s*['"]([^'"]+)['"]/gi, 2) || ""
        );

        const title = normalizeText(stripHtml(anchor?.text || rawTitle || ""));
        const href = normalizeUrl(anchor?.href || rawUrl || "");

        if (!title) {
          continue;
        }

        const key = `${date}|${rating}|${title}|${href}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        items.push({
          date: date || undefined,
          rating: rating || undefined,
          title,
          url: href || undefined,
          rationale: rationale || undefined,
        });
      }
    });
  });

  return items;
}

function buildSearchSpaces(html: string): string[] {
  const decoded = decodeEntities(html);
  const normalized = normalizeEmbeddedText(decoded);
  const spaces = [html, decoded, normalized];
  const unique = new Set<string>();
  const results: string[] = [];
  spaces.forEach((space) => {
    if (space && !unique.has(space)) {
      unique.add(space);
      results.push(space);
    }
  });
  return results;
}

function normalizeEmbeddedText(value: string): string {
  return value
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0022/gi, "\"")
    .replace(/\\u0027/gi, "'")
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function parseBriefingHtml(html: string): GaiBriefing {
  const headingMatch = html.match(
    /In Today'?s News Briefing\s*[–-]\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i
  );
  const headingIndex = headingMatch?.index ?? html.indexOf("In Today's News Briefing");
  const sliceStart = headingIndex >= 0 ? headingIndex : 0;
  const slice = html.slice(sliceStart, sliceStart + 12000);

  const anchors = Array.from(
    slice.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)
  );
  const items = anchors
    .map((anchor) => {
      const href = normalizeUrl(anchor[1]);
      const title = normalizeText(stripHtml(anchor[2]));
      return { href, title };
    })
    .filter((item) => item.href && item.title)
    .filter((item) => isExternalNewsLink(item.href))
    .map((item) => ({ url: item.href, title: item.title }));

  const uniqueItems: GaiBriefingItem[] = [];
  const seen = new Set<string>();
  items.forEach((item) => {
    const key = `${item.title}|${item.url}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueItems.push(item);
  });

  return {
    date: headingMatch?.[1],
    items: uniqueItems.slice(0, 12),
  };
}

function stripHtml(value: string): string {
  const cleaned = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return decodeEntities(cleaned);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractLink(value: string): { text: string; href?: string } {
  const match = value.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (match) {
    return {
      text: normalizeText(stripHtml(match[2])),
      href: normalizeUrl(match[1]),
    };
  }
  return { text: normalizeText(stripHtml(value)) };
}

function findLastAnchor(value: string): { href: string; text: string } | null {
  const matches = Array.from(
    value.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)
  );
  if (matches.length === 0) {
    return null;
  }
  const last = matches[matches.length - 1];
  return {
    href: normalizeUrl(last[1]),
    text: normalizeText(stripHtml(last[2])),
  };
}

function findLastMatch(value: string, regex: RegExp, group = 1): string | undefined {
  const re = new RegExp(regex.source, regex.flags);
  let match: RegExpExecArray | null;
  let last: string | undefined;
  while ((match = re.exec(value)) !== null) {
    last = match[group];
  }
  return last;
}

function normalizeUrl(href: string): string {
  if (!href) {
    return "";
  }
  const trimmed = href.trim();
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return "";
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${BASE_URL}${trimmed}`;
  }
  if (!trimmed.startsWith("http")) {
    return `${BASE_URL}/${trimmed}`;
  }
  return trimmed;
}

function isExternalNewsLink(url: string): boolean {
  const lowered = url.toLowerCase();
  if (!lowered.startsWith("http")) {
    return false;
  }
  if (lowered.includes("gaiinsights.com")) {
    return false;
  }
  if (
    lowered.includes("linkedin.com") ||
    lowered.includes("facebook.com") ||
    lowered.includes("instagram.com") ||
    lowered.includes("youtube.com") ||
    lowered.includes("x.com") ||
    lowered.includes("twitter.com")
  ) {
    return false;
  }
  return true;
}
