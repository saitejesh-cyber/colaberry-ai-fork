import type { NextApiRequest, NextApiResponse } from "next";
import {
  CATALOG_HEALTH_ENTITIES,
  CatalogHealthEntity,
  buildCatalogHealthReport,
  catalogHealthRowsToCsv,
} from "../../lib/catalogHealth";
import { isAdminAuthorized } from "../../lib/api-auth";

const REPORT_API_KEY = (process.env.CATALOG_REPORT_API_KEY || process.env.NEWSLETTER_REPORT_API_KEY || "").trim();

function normalizeText(value: unknown, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function parseEntity(value: string): CatalogHealthEntity | "all" {
  const normalized = value.trim();
  if (!normalized || normalized === "all") return "all";
  const matched = CATALOG_HEALTH_ENTITIES.find((item) => item === normalized);
  return matched || "all";
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }
  if (!isAdminAuthorized(req, REPORT_API_KEY)) {
    return res.status(401).json({ ok: false, message: "Unauthorized." });
  }

  const format = normalizeText(readQueryValue(req.query.format), 16).toLowerCase() || "json";
  if (format !== "json" && format !== "csv") {
    return res.status(400).json({ ok: false, message: "Invalid format. Use json or csv." });
  }

  const entity = parseEntity(normalizeText(readQueryValue(req.query.entity), 32).toLowerCase());
  const allowPrivate = normalizeText(readQueryValue(req.query.includePrivate), 16).toLowerCase() === "true";
  const freshnessDays = parsePositiveInt(
    normalizeText(readQueryValue(req.query.freshnessDays), 8),
    Number(process.env.CATALOG_HEALTH_FRESH_DAYS || 90)
  );
  const maxRecordsPerEntity = parsePositiveInt(
    normalizeText(readQueryValue(req.query.maxRecords), 8),
    Number(process.env.CATALOG_HEALTH_MAX_RECORDS || 1000)
  );

  try {
    const report = await buildCatalogHealthReport({
      allowPrivate,
      freshnessDays,
      maxRecordsPerEntity,
    });
    const rows = entity === "all" ? report.rows : report.rows.filter((row) => row.entity === entity);

    if (format === "csv") {
      const csv = catalogHealthRowsToCsv(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="catalog-health-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      ok: true,
      generatedAt: report.generatedAt,
      filters: {
        entity,
        includePrivate: allowPrivate,
        freshnessDays,
        maxRecordsPerEntity,
      },
      totals: {
        rows: rows.length,
        warnings: report.warnings.length,
      },
      summaryByEntity: report.summaryByEntity,
      warnings: report.warnings,
      rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ ok: false, message: `Failed to build catalog health report: ${message}` });
  }
}
