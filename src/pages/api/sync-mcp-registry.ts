import type { NextApiRequest, NextApiResponse } from "next";

const REGISTRY_BASE = "https://registry.modelcontextprotocol.io/v0.1";
const CMS_URL = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const CMS_API_TOKEN = (process.env.CMS_API_TOKEN || "").trim();
const SYNC_SECRET = process.env.SYNC_SECRET || "";

type RegistryServer = {
  server: {
    name: string;
    description: string;
    version: string;
    title?: string;
    websiteUrl?: string;
    repository?: { url: string; source: string; id?: string; subfolder?: string };
    packages?: Array<{
      registryType: string;
      identifier: string;
      version?: string;
      runtimeHint?: string;
    }>;
    remotes?: Array<{
      type: string;
      url: string;
      headers?: Array<{ name: string; value: string; description?: string; isRequired?: boolean; isSecret?: boolean }>;
    }>;
    icons?: Array<{ src: string; sizes?: string }>;
  };
  _meta?: {
    "io.modelcontextprotocol.registry/official"?: {
      status: string;
      publishedAt: string;
      updatedAt: string;
      isLatest: boolean;
    };
  };
};

type RegistryResponse = {
  servers: RegistryServer[];
  metadata: { nextCursor?: string; count: number };
};

function deriveSlug(name: string): string {
  if (!name.includes("/")) {
    return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  const parts = name.split("/").filter(Boolean);
  const vendor = parts[0];
  const server = parts[parts.length - 1];
  // If server name already starts with vendor prefix, just use server
  const vendorClean = vendor.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const serverClean = server.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const combined = serverClean.startsWith(vendorClean) ? server : `${vendor}-${server}`;
  return combined.replace(/[^a-z0-9-]/gi, "-").toLowerCase().replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function deriveDisplayName(entry: RegistryServer["server"]): string {
  if (entry.title) return entry.title;
  const parts = entry.name.split("/").filter(Boolean);
  const server = parts[parts.length - 1];
  const vendor = parts.length > 1 ? parts[0] : null;
  const titleCase = (s: string) =>
    s.replace(/[-_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const displayServer = titleCase(server);
  if (!vendor) return displayServer;
  const vendorDisplay = titleCase(vendor.replace(/^app\./i, ""));
  if (displayServer.toLowerCase().includes(vendorDisplay.toLowerCase()))
    return displayServer;
  return `${vendorDisplay} ${displayServer}`;
}

function deriveServerType(packages?: RegistryServer["server"]["packages"]): string {
  if (!packages || packages.length === 0) return "Remote";
  const rt = packages[0].registryType?.toLowerCase();
  if (rt === "npm") return "Package";
  if (rt === "pypi") return "Package";
  if (rt === "oci" || rt === "docker") return "Docker";
  return "Package";
}

function deriveInstallCommand(packages?: RegistryServer["server"]["packages"]): string | null {
  if (!packages || packages.length === 0) return null;
  const pkg = packages[0];
  const rt = pkg.registryType?.toLowerCase();
  if (rt === "npm") return `npx ${pkg.identifier}${pkg.version ? `@${pkg.version}` : ""}`;
  if (rt === "pypi") return `uvx ${pkg.identifier}${pkg.version ? `==${pkg.version}` : ""}`;
  if (rt === "oci" || rt === "docker") return `docker run ${pkg.identifier}${pkg.version ? `:${pkg.version}` : ""}`;
  return pkg.identifier || null;
}

function deriveLanguage(packages?: RegistryServer["server"]["packages"]): string {
  if (!packages || packages.length === 0) return "Unknown";
  const rt = packages[0].registryType?.toLowerCase();
  if (rt === "npm") return "JavaScript/TypeScript";
  if (rt === "pypi") return "Python";
  if (rt === "oci" || rt === "docker") return "Docker";
  if (rt === "nuget") return "C#/.NET";
  return "Unknown";
}

function mapRegistryToStrapi(entry: RegistryServer) {
  const srv = entry.server;
  const meta = entry._meta?.["io.modelcontextprotocol.registry/official"];
  const slug = deriveSlug(srv.name);

  return {
    registryName: srv.name,
    slug,
    name: deriveDisplayName(srv),
    description: srv.description || "",
    version: srv.version || null,
    sourceUrl: srv.repository?.url || null,
    docsUrl: srv.websiteUrl || null,
    source: "external",
    serverType: deriveServerType(srv.packages),
    installCommand: deriveInstallCommand(srv.packages),
    language: deriveLanguage(srv.packages),
    transportType: srv.remotes?.[0]?.type || null,
    lastUpdated: meta?.updatedAt || null,
    status: meta?.status === "active" ? "live" : meta?.status || "live",
    visibility: "public",
    openSource: Boolean(srv.repository?.url),
    registrySource: "official-mcp-registry",
    lastSyncedAt: new Date().toISOString(),
  };
}

async function fetchAllRegistryServers(): Promise<RegistryServer[]> {
  const all: RegistryServer[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 50; page++) {
    const url = new URL(`${REGISTRY_BASE}/servers`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("version", "latest");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Registry API error: ${res.status}`);
    const data: RegistryResponse = await res.json();

    all.push(...data.servers);

    if (!data.metadata.nextCursor || data.servers.length < 100) break;
    cursor = data.metadata.nextCursor;
  }

  return all;
}

async function findExistingByRegistryName(registryName: string): Promise<{ documentId: string } | null> {
  const url = `${CMS_URL}/api/mcp-servers?filters[registryName][$eq]=${encodeURIComponent(registryName)}&fields[0]=id&publicationState=live`;
  const headers: Record<string, string> = {};
  if (CMS_API_TOKEN) headers.Authorization = `Bearer ${CMS_API_TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const body = await res.json();
  const item = body?.data?.[0];
  return item ? { documentId: item.documentId } : null;
}

async function upsertToStrapi(data: ReturnType<typeof mapRegistryToStrapi>): Promise<"created" | "updated" | "skipped"> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CMS_API_TOKEN) headers.Authorization = `Bearer ${CMS_API_TOKEN}`;

  const existing = await findExistingByRegistryName(data.registryName!);

  if (existing) {
    const res = await fetch(`${CMS_URL}/api/mcp-servers/${existing.documentId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ data }),
    });
    return res.ok ? "updated" : "skipped";
  } else {
    const res = await fetch(`${CMS_URL}/api/mcp-servers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    });
    return res.ok ? "created" : "skipped";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  const providedSecret = authHeader?.replace("Bearer ", "") || (req.query.secret as string);
  if (SYNC_SECRET && providedSecret !== SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!CMS_URL) {
    return res.status(500).json({ error: "CMS_URL not configured" });
  }

  try {
    const registryServers = await fetchAllRegistryServers();
    const results = { total: registryServers.length, created: 0, updated: 0, skipped: 0, errors: 0 };

    for (const entry of registryServers) {
      try {
        const mapped = mapRegistryToStrapi(entry);
        const result = await upsertToStrapi(mapped);
        results[result]++;
      } catch {
        results.errors++;
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return res.status(500).json({ error: message });
  }
}
