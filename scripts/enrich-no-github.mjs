#!/usr/bin/env node

/**
 * Enrich MCP servers that have no GitHub sourceUrl with rich HTML longDescription.
 * Generates contextual content based on server name, description, serverType, and language.
 *
 * Usage:
 *   node scripts/enrich-no-github.mjs [options]
 *
 * Options:
 *   --dry-run          Preview changes without updating CMS
 *   --limit <n>        Only process first n servers
 *   --url <cms-url>    CMS URL (default: env NEXT_PUBLIC_CMS_URL)
 *   --token <token>    CMS API token (default: env CMS_API_TOKEN)
 */

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const dryRun = hasFlag("--dry-run");
const limitArg = getArg("--limit");
const limit = limitArg ? parseInt(limitArg, 10) : 0;

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const baseUrl = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const token = (process.env.CMS_API_TOKEN || "").trim();

if (!baseUrl || !token) {
  console.error("Missing CMS_URL or CMS_API_TOKEN");
  process.exit(1);
}

/* ---------- CMS Fetch ---------------------------------------------------- */

async function fetchCMS(path, opts = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CMS ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/* ---------- Fetch all no-sourceUrl servers -------------------------------- */

async function fetchThinServers(maxLen = 300) {
  // Fetch ALL servers and filter client-side for thin longDescription
  const all = [];
  let page = 1;
  while (true) {
    const json = await fetchCMS(
      `/api/mcp-servers?pagination[pageSize]=100&pagination[page]=${page}&sort=name:asc`
    );
    if (!json.data || json.data.length === 0) break;
    for (const s of json.data) {
      const len = (s.longDescription || "").length;
      if (len < maxLen) {
        all.push(s);
      }
    }
    if (page >= json.meta.pagination.pageCount) break;
    page++;
  }
  return all;
}

/* ---------- Content Generation ------------------------------------------- */

/**
 * Infer domain keywords from server name and description to generate contextual content.
 */
function inferDomain(name, desc) {
  const text = `${name} ${desc}`.toLowerCase();

  // Category mappings: pattern → { category, capabilities[], useCases[] }
  const domains = [
    {
      patterns: ["database", "mysql", "postgres", "mongo", "sql", "supabase", "redis", "sqlite", "dynamodb", "firebase", "firestore", "prisma", "drizzle"],
      category: "Database & Data",
      capabilities: [
        "Execute database queries and retrieve results",
        "Manage database schemas and migrations",
        "Monitor database performance and health",
        "Handle data import/export operations"
      ],
      useCases: [
        "Querying and analyzing data without writing raw SQL",
        "Automating database maintenance tasks",
        "Building data-driven applications with AI assistance",
        "Monitoring and optimizing database performance"
      ]
    },
    {
      patterns: ["api", "rest", "graphql", "webhook", "endpoint", "integration"],
      category: "API & Integration",
      capabilities: [
        "Connect to and interact with external APIs",
        "Handle authentication and authorization flows",
        "Transform and process API responses",
        "Manage webhook subscriptions and events"
      ],
      useCases: [
        "Integrating third-party services into AI workflows",
        "Automating API-driven business processes",
        "Building multi-service orchestration pipelines",
        "Testing and debugging API integrations"
      ]
    },
    {
      patterns: ["security", "auth", "oauth", "encrypt", "vulnerability", "penetration", "scan", "compliance", "audit"],
      category: "Security & Compliance",
      capabilities: [
        "Perform security assessments and vulnerability scans",
        "Manage authentication and authorization",
        "Monitor compliance and audit trails",
        "Detect and respond to security threats"
      ],
      useCases: [
        "Automated security testing in CI/CD pipelines",
        "Compliance monitoring and reporting",
        "Threat detection and incident response",
        "Identity and access management"
      ]
    },
    {
      patterns: ["deploy", "cloud", "aws", "azure", "gcp", "kubernetes", "docker", "devops", "ci/cd", "pipeline", "infrastructure", "terraform", "hosting"],
      category: "DevOps & Cloud",
      capabilities: [
        "Manage cloud infrastructure and deployments",
        "Orchestrate CI/CD pipeline operations",
        "Monitor service health and performance",
        "Automate infrastructure provisioning"
      ],
      useCases: [
        "Streamlining deployment workflows",
        "Managing multi-cloud infrastructure",
        "Automating DevOps tasks with AI assistance",
        "Monitoring and scaling cloud resources"
      ]
    },
    {
      patterns: ["git", "github", "gitlab", "bitbucket", "code", "repository", "commit", "pull request", "version control"],
      category: "Developer Tools",
      capabilities: [
        "Manage repositories and version control operations",
        "Review and analyze code changes",
        "Automate code review and quality checks",
        "Track issues and project management"
      ],
      useCases: [
        "AI-assisted code review and analysis",
        "Automating repository management tasks",
        "Streamlining development workflows",
        "Tracking and managing project issues"
      ]
    },
    {
      patterns: ["email", "mail", "smtp", "inbox", "newsletter", "messaging", "notification", "slack", "discord", "chat", "communication"],
      category: "Communication",
      capabilities: [
        "Send and manage messages across channels",
        "Process and organize incoming communications",
        "Automate notification workflows",
        "Integrate with messaging platforms"
      ],
      useCases: [
        "Automating email and message management",
        "Building intelligent notification systems",
        "Streamlining team communication workflows",
        "Managing multi-channel messaging"
      ]
    },
    {
      patterns: ["analytics", "metrics", "dashboard", "reporting", "visualization", "chart", "data", "insight", "intelligence", "tracking"],
      category: "Analytics & Insights",
      capabilities: [
        "Collect and aggregate data metrics",
        "Generate reports and visualizations",
        "Analyze trends and patterns",
        "Deliver actionable business insights"
      ],
      useCases: [
        "Real-time data analysis and reporting",
        "Business intelligence and decision support",
        "Performance monitoring and optimization",
        "Data-driven strategy development"
      ]
    },
    {
      patterns: ["search", "browse", "scrape", "crawl", "web", "fetch", "extract", "parse"],
      category: "Web & Search",
      capabilities: [
        "Search and retrieve web content",
        "Extract structured data from web pages",
        "Navigate and interact with websites",
        "Process and analyze web content"
      ],
      useCases: [
        "Automated web research and data collection",
        "Content extraction and processing",
        "Market research and competitive analysis",
        "Building knowledge bases from web sources"
      ]
    },
    {
      patterns: ["file", "document", "pdf", "storage", "drive", "s3", "blob", "upload", "download", "filesystem"],
      category: "File & Storage",
      capabilities: [
        "Read, write, and manage files",
        "Handle file format conversions",
        "Manage cloud storage operations",
        "Process and transform documents"
      ],
      useCases: [
        "Automated document processing workflows",
        "Cloud storage management and organization",
        "File format conversion and transformation",
        "Content management and archival"
      ]
    },
    {
      patterns: ["ai", "llm", "model", "ml", "machine learning", "neural", "gpt", "claude", "agent", "prompt", "embedding"],
      category: "AI & Machine Learning",
      capabilities: [
        "Integrate with AI models and services",
        "Manage prompts and model interactions",
        "Process and analyze AI-generated content",
        "Orchestrate multi-agent workflows"
      ],
      useCases: [
        "Building AI-powered applications",
        "Multi-model experimentation and comparison",
        "AI agent orchestration and management",
        "Prompt engineering and optimization"
      ]
    },
    {
      patterns: ["ecommerce", "shop", "product", "cart", "marketplace", "catalog", "inventory", "price", "order"],
      category: "E-Commerce",
      capabilities: [
        "Browse and search product catalogs",
        "Manage inventory and pricing",
        "Process orders and transactions",
        "Analyze market data and trends"
      ],
      useCases: [
        "Product research and price comparison",
        "Inventory management and automation",
        "E-commerce analytics and optimization",
        "Market trend analysis and forecasting"
      ]
    },
    {
      patterns: ["crm", "salesforce", "hubspot", "customer", "lead", "pipeline", "sales", "marketing", "campaign", "ad ", "ads", "advertising"],
      category: "Sales & Marketing",
      capabilities: [
        "Manage customer relationships and data",
        "Track sales pipelines and campaigns",
        "Analyze marketing performance metrics",
        "Automate lead management workflows"
      ],
      useCases: [
        "CRM data management and enrichment",
        "Campaign performance analysis",
        "Lead scoring and qualification",
        "Marketing automation and optimization"
      ]
    },
    {
      patterns: ["project", "task", "jira", "asana", "trello", "linear", "issue", "ticket", "kanban", "agile", "sprint"],
      category: "Project Management",
      capabilities: [
        "Create and manage tasks and projects",
        "Track progress and milestones",
        "Assign and prioritize work items",
        "Generate project reports and updates"
      ],
      useCases: [
        "Automating project management workflows",
        "Sprint planning and tracking",
        "Cross-team task coordination",
        "Project status reporting and analysis"
      ]
    },
    {
      patterns: ["map", "location", "geo", "navigation", "gps", "places", "address", "local", "business directory"],
      category: "Location & Maps",
      capabilities: [
        "Search and discover locations and businesses",
        "Process geospatial data and coordinates",
        "Generate mapping and routing information",
        "Access local business and place data"
      ],
      useCases: [
        "Local business search and discovery",
        "Geospatial data analysis and visualization",
        "Route planning and optimization",
        "Location-based service integration"
      ]
    },
    {
      patterns: ["crypto", "blockchain", "web3", "defi", "nft", "token", "wallet", "ethereum", "solana", "bitcoin", "trading"],
      category: "Blockchain & Crypto",
      capabilities: [
        "Access blockchain data and analytics",
        "Monitor crypto market signals and trends",
        "Interact with smart contracts and protocols",
        "Track portfolio and transaction data"
      ],
      useCases: [
        "Cryptocurrency market analysis and research",
        "DeFi protocol monitoring and interaction",
        "Blockchain data exploration and analytics",
        "Smart contract development and testing"
      ]
    },
    {
      patterns: ["image", "video", "audio", "media", "photo", "design", "ui", "ux", "figma", "canvas", "diagram", "visual"],
      category: "Media & Design",
      capabilities: [
        "Process and transform media content",
        "Generate and manipulate visual assets",
        "Manage media libraries and resources",
        "Integrate with design tools and platforms"
      ],
      useCases: [
        "Automated media processing workflows",
        "Design asset management and generation",
        "Visual content creation and editing",
        "Media library organization and search"
      ]
    },
    {
      patterns: ["bookmark", "note", "knowledge", "wiki", "memory", "document", "content management", "cms", "blog", "publish"],
      category: "Knowledge & Content",
      capabilities: [
        "Organize and manage knowledge resources",
        "Create and publish content",
        "Search and retrieve stored information",
        "Manage content workflows and publishing"
      ],
      useCases: [
        "Knowledge base management and search",
        "Content creation and publishing workflows",
        "Personal knowledge management",
        "Documentation organization and retrieval"
      ]
    },
    {
      patterns: ["test", "qa", "quality", "debug", "monitor", "observability", "log", "trace", "performance"],
      category: "Testing & Observability",
      capabilities: [
        "Execute automated tests and quality checks",
        "Monitor application performance and health",
        "Collect and analyze logs and traces",
        "Generate test reports and metrics"
      ],
      useCases: [
        "Automated testing in development workflows",
        "Application performance monitoring",
        "Log analysis and troubleshooting",
        "Quality assurance and compliance checking"
      ]
    },
  ];

  for (const d of domains) {
    if (d.patterns.some((p) => text.includes(p))) {
      return d;
    }
  }

  // Default fallback
  return {
    category: "Productivity & Automation",
    capabilities: [
      "Connect AI assistants to specialized functionality",
      "Automate repetitive workflows and tasks",
      "Access and process data from external sources",
      "Enable intelligent decision-making with real-time data"
    ],
    useCases: [
      "Streamlining daily workflows with AI assistance",
      "Automating data processing and analysis tasks",
      "Building intelligent automation pipelines",
      "Enhancing productivity through AI-powered tools"
    ]
  };
}

/**
 * Generate rich HTML longDescription for a server.
 */
function generateRichContent(server) {
  const name = server.name || "Unknown";
  const desc = server.description || "";
  const serverType = server.serverType || "MCP";
  const language = server.language || null;
  const domain = inferDomain(name, desc);

  // Clean up name for natural language usage
  const cleanName = name.replace(/ Mcp Server$/i, "").replace(/ MCP$/i, "").replace(/ Server$/i, "").trim();
  const displayName = cleanName || name;

  // Build description paragraph — expand from the short desc
  let introParagraph = desc;
  if (desc.length < 100) {
    introParagraph = `${desc} This MCP server enables AI assistants like Claude to seamlessly interact with ${displayName}, providing structured access to its functionality through the Model Context Protocol (MCP).`;
  } else {
    introParagraph = `${desc} Through the Model Context Protocol (MCP), AI assistants like Claude gain structured, programmatic access to ${displayName}'s full capabilities.`;
  }

  // Build capabilities section — pick 3-4 relevant ones
  const caps = domain.capabilities;
  const capsHtml = caps.map((c) => `<li>${c}</li>`).join("");

  // Build use cases section — pick 3-4 relevant ones
  const ucs = domain.useCases;
  const ucsHtml = ucs.map((u) => `<li>${u}</li>`).join("");

  // Technical details
  const techParts = [];
  if (serverType) techParts.push(`Server type: ${serverType}`);
  if (language) techParts.push(`Language: ${language}`);
  const techLine = techParts.length > 0 ? techParts.join(" · ") : "MCP-compatible server";

  // Build full HTML
  const html = [
    `<p>${introParagraph}</p>`,
    `<p><strong>Key Capabilities:</strong></p>`,
    `<ul>${capsHtml}</ul>`,
    `<p><strong>Common Use Cases:</strong></p>`,
    `<ul>${ucsHtml}</ul>`,
    `<p><strong>How It Works:</strong> ${displayName} integrates with AI coding assistants and chat interfaces through the standardized MCP protocol. Once configured, your AI assistant can directly invoke ${displayName}'s tools, enabling natural language interaction with its features without manual API calls or custom integrations.</p>`,
    `<p><strong>Technical Details:</strong> ${techLine}</p>`,
  ].join("");

  return html;
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log(`\n🔧 Enriching MCP servers without GitHub sourceUrl`);
  console.log(`   CMS: ${baseUrl}`);
  console.log(`   Dry run: ${dryRun}\n`);

  const servers = await fetchThinServers(200);
  console.log(`Found ${servers.length} servers with thin longDescription (<200 chars)\n`);

  const toProcess = limit > 0 ? servers.slice(0, limit) : servers;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const server = toProcess[i];
    const richContent = generateRichContent(server);
    const oldLen = (server.longDescription || "").length;
    const newLen = richContent.length;

    if (dryRun) {
      console.log(`[${i + 1}/${toProcess.length}] ${server.name} — ${oldLen} → ${newLen} chars (dry run)`);
      if (i < 3) {
        console.log(`   Preview: ${richContent.slice(0, 200)}...\n`);
      }
      enriched++;
      continue;
    }

    try {
      await fetchCMS(`/api/mcp-servers/${server.documentId}`, {
        method: "PUT",
        body: JSON.stringify({ data: { longDescription: richContent } }),
      });
      enriched++;
      if (i % 25 === 0 || i < 5) {
        console.log(`[${i + 1}/${toProcess.length}] ✅ ${server.name} — ${oldLen} → ${newLen} chars`);
      }
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${toProcess.length}] ❌ ${server.name}: ${err.message}`);
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${servers.length - toProcess.length}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
