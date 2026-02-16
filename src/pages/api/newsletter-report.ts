import type { NextApiRequest, NextApiResponse } from "next";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
const CMS_TOKEN = process.env.CMS_API_TOKEN;
const REPORT_API_KEY = process.env.NEWSLETTER_REPORT_API_KEY || "";
const REQUEST_TIMEOUT_MS = Number(process.env.NEWSLETTER_API_TIMEOUT_MS || 8000);
const MAX_ROWS = Number(process.env.NEWSLETTER_REPORT_MAX_ROWS || 20000);

type CMSPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

type CMSMeta = {
  pagination?: CMSPagination;
};

type SubscriberAttributes = {
  email?: string | null;
  status?: string | null;
  sourcePage?: string | null;
  sourcePath?: string | null;
  subscribedAt?: string | null;
  unsubscribedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CMSCollectionResponse = {
  data?: Array<{
    id?: number | string;
    documentId?: string;
    attributes?: SubscriberAttributes;
  }>;
  meta?: CMSMeta;
};

type CMSCollectionItem = NonNullable<CMSCollectionResponse["data"]>[number];

type ReportRow = {
  id: string;
  email: string;
  status: string;
  sourcePage: string;
  sourcePath: string;
  subscribedAt: string;
  unsubscribedAt: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getApiKey(req: NextApiRequest) {
  const rawHeader = req.headers["x-colaberry-admin-key"];
  const apiKey = Array.isArray(rawHeader) ? rawHeader[0] || "" : rawHeader || "";
  if (apiKey) return apiKey;

  const auth = req.headers.authorization;
  const bearer = Array.isArray(auth) ? auth[0] || "" : auth || "";
  const prefix = "Bearer ";
  if (bearer.startsWith(prefix)) {
    return bearer.slice(prefix.length).trim();
  }
  return "";
}

function isLocalDevelopmentRequest(req: NextApiRequest) {
  if (process.env.NODE_ENV === "production") return false;
  const rawHost = req.headers.host;
  const host = Array.isArray(rawHost) ? rawHost[0] || "" : rawHost || "";
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/i.test(host);
}

function isAuthorized(req: NextApiRequest) {
  if (isLocalDevelopmentRequest(req)) return true;
  if (!REPORT_API_KEY) return false;
  const apiKey = getApiKey(req);
  return apiKey === REPORT_API_KEY;
}

function parseStatusFilter(input: string) {
  const value = input.toLowerCase();
  if (value === "subscribed" || value === "unsubscribed" || value === "bounced") {
    return value;
  }
  return "";
}

async function cmsFetch<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${CMS_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CMS_TOKEN}`,
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CMS ${response.status}: ${text || "request failed"}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function toRow(entry: CMSCollectionItem): ReportRow {
  const attrs = entry.attributes ?? {};
  return {
    id: String(entry.documentId || entry.id || ""),
    email: normalizeText(attrs.email, 220),
    status: normalizeText(attrs.status, 32) || "unknown",
    sourcePage: normalizeText(attrs.sourcePage, 120),
    sourcePath: normalizeText(attrs.sourcePath, 220),
    subscribedAt: normalizeText(attrs.subscribedAt, 64),
    unsubscribedAt: normalizeText(attrs.unsubscribedAt, 64),
    createdAt: normalizeText(attrs.createdAt, 64),
    updatedAt: normalizeText(attrs.updatedAt, 64),
  };
}

function escapeCsv(value: string) {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function rowsToCsv(rows: ReportRow[]) {
  const headers = [
    "id",
    "email",
    "status",
    "sourcePage",
    "sourcePath",
    "subscribedAt",
    "unsubscribedAt",
    "createdAt",
    "updatedAt",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((key) => escapeCsv(String(row[key as keyof ReportRow] || "")));
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

function buildSummary(rows: ReportRow[]) {
  const summary = {
    total: rows.length,
    subscribed: 0,
    unsubscribed: 0,
    bounced: 0,
    unknown: 0,
    bySourcePage: {} as Record<string, number>,
  };

  for (const row of rows) {
    const status = row.status.toLowerCase();
    if (status === "subscribed") summary.subscribed += 1;
    else if (status === "unsubscribed") summary.unsubscribed += 1;
    else if (status === "bounced") summary.bounced += 1;
    else summary.unknown += 1;

    const key = row.sourcePage || "unknown";
    summary.bySourcePage[key] = (summary.bySourcePage[key] || 0) + 1;
  }

  return summary;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }
  if (!CMS_URL || !CMS_TOKEN) {
    return res.status(503).json({ ok: false, message: "Report service unavailable." });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  const format = normalizeText(readQueryValue(req.query.format), 16).toLowerCase() || "json";
  if (format !== "json" && format !== "csv") {
    return res.status(400).json({ ok: false, message: "Invalid format. Use json or csv." });
  }
  const statusFilter = parseStatusFilter(normalizeText(readQueryValue(req.query.status), 32));
  const pageSize = 200;
  const rows: ReportRow[] = [];
  let page = 1;

  try {
    while (rows.length < MAX_ROWS) {
      const statusQuery = statusFilter
        ? `&filters[status][$eq]=${encodeURIComponent(statusFilter)}`
        : "";
      const response = await cmsFetch<CMSCollectionResponse>(
        `/api/newsletter-subscribers?pagination[page]=${page}&pagination[pageSize]=${pageSize}${statusQuery}&fields[0]=email&fields[1]=status&fields[2]=sourcePage&fields[3]=sourcePath&fields[4]=subscribedAt&fields[5]=unsubscribedAt&fields[6]=createdAt&fields[7]=updatedAt&sort=createdAt:desc`
      );
      const pageRows = (response.data || []).map(toRow);
      rows.push(...pageRows);

      const pageCount = response.meta?.pagination?.pageCount || page;
      if (page >= pageCount) break;
      page += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return res.status(500).json({ ok: false, message: `Failed to build report: ${message}` });
  }

  if (format === "csv") {
    const csv = rowsToCsv(rows);
    const suffix = statusFilter ? `-${statusFilter}` : "";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="newsletter-report${suffix}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csv);
  }

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    appliedFilters: { status: statusFilter || null },
    summary: buildSummary(rows),
    rows,
  });
}
