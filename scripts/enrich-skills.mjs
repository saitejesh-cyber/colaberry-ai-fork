#!/usr/bin/env node

/**
 * Enrich Skills in Strapi CMS with rich HTML longDescription content.
 * Generates structured Overview content based on skill name, summary, category.
 *
 * Usage:
 *   node scripts/enrich-skills.mjs [options]
 *
 * Options:
 *   --dry-run          Preview without updating CMS
 *   --limit <n>        Only process first n skills
 *   --url <cms-url>    CMS URL (default: env NEXT_PUBLIC_CMS_URL)
 *   --token <token>    CMS API token (default: env CMS_API_TOKEN)
 *   --force-update     Re-enrich ALL skills (even those with existing content)
 *   --max-len <n>      Threshold for "thin" content (default: 200 chars)
 */

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const dryRun = hasFlag("--dry-run");
const forceUpdate = hasFlag("--force-update");
const limitArg = getArg("--limit");
const limit = limitArg ? parseInt(limitArg, 10) : 0;
const maxLen = parseInt(getArg("--max-len", "200"), 10);

const urlOverride = getArg("--url");
const tokenOverride = getArg("--token");
if (urlOverride) process.env.NEXT_PUBLIC_CMS_URL = urlOverride;
if (tokenOverride) process.env.CMS_API_TOKEN = tokenOverride;

const baseUrl = (process.env.CMS_URL || process.env.NEXT_PUBLIC_CMS_URL || "").trim().replace(/\/$/, "");
const token = (process.env.CMS_API_TOKEN || "").trim();

if (!baseUrl || (!token && !dryRun)) {
  console.error("Missing CMS URL or CMS_API_TOKEN");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- CMS ---------------------------------------------------------- */

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

async function fetchAllSkills() {
  const all = [];
  let page = 1;
  while (true) {
    const json = await fetchCMS(
      `/api/skills?pagination[pageSize]=100&pagination[page]=${page}&sort=name:asc`
    );
    if (!json.data || json.data.length === 0) break;
    all.push(...json.data);
    if (page >= json.meta.pagination.pageCount) break;
    page++;
  }
  return all;
}

/* ---------- Domain Inference --------------------------------------------- */

const skillDomains = [
  {
    patterns: ["pdf", "docx", "word", "document", "excel", "xlsx", "spreadsheet", "pptx", "powerpoint", "slide", "presentation"],
    domain: "Document Management",
    capabilities: [
      "Generate, extract, and analyze document content programmatically",
      "Convert between document formats with formatting preserved",
      "Extract structured data from unstructured documents",
      "Automate document creation with templates and data binding"
    ],
    useCases: [
      "Automated report generation from data sources",
      "Batch document processing and format conversion",
      "Intelligent document analysis and data extraction",
      "Template-based document creation for business workflows"
    ]
  },
  {
    patterns: ["react", "next.js", "nextjs", "vue", "angular", "frontend", "web design", "css", "tailwind", "ui", "ux", "component"],
    domain: "Web & Frontend Development",
    capabilities: [
      "Enforce coding standards and best practices for web frameworks",
      "Audit web performance, accessibility, and SEO",
      "Generate optimized component architectures",
      "Apply design patterns specific to modern web frameworks"
    ],
    useCases: [
      "Building production-grade web applications with best practices",
      "Performance optimization and caching strategies",
      "Web accessibility compliance and auditing",
      "Frontend architecture design and code review"
    ]
  },
  {
    patterns: ["git", "github", "commit", "pr", "pull request", "branch", "merge", "ci/cd", "pipeline", "deploy", "docker", "devops"],
    domain: "DevOps & Workflow Automation",
    capabilities: [
      "Automate version control operations and conventions",
      "Generate and manage CI/CD pipeline configurations",
      "Enforce commit message standards and PR templates",
      "Streamline deployment and release workflows"
    ],
    useCases: [
      "Standardizing team development workflows",
      "Automating release management and deployment",
      "Enforcing code review policies and quality gates",
      "CI/CD pipeline optimization and monitoring"
    ]
  },
  {
    patterns: ["test", "lint", "code review", "quality", "security scan", "vulnerability", "audit", "tdd", "unit test"],
    domain: "Code Quality & Testing",
    capabilities: [
      "Generate comprehensive test suites automatically",
      "Perform security vulnerability scanning and analysis",
      "Enforce coding standards and linting rules",
      "Conduct systematic code review and analysis"
    ],
    useCases: [
      "Automated test generation for new features",
      "Security-first development with continuous scanning",
      "Enforcing consistent code quality across teams",
      "Test-driven development workflow automation"
    ]
  },
  {
    patterns: ["debug", "plan", "brainstorm", "task", "thinking", "reasoning", "systematic", "decompos"],
    domain: "Planning & Problem Solving",
    capabilities: [
      "Break down complex tasks into structured action plans",
      "Apply systematic debugging methodologies",
      "Generate file-based planning artifacts for multi-step work",
      "Explore user intent and requirements before implementation"
    ],
    useCases: [
      "Structured planning for multi-step development tasks",
      "Systematic root cause analysis for complex bugs",
      "Requirements exploration and design brainstorming",
      "Progress tracking across long-running projects"
    ]
  },
  {
    patterns: ["code gen", "scaffold", "boilerplate", "generator", "factory", "template", "pattern", "framework"],
    domain: "Code Generation",
    capabilities: [
      "Generate code following established design patterns",
      "Scaffold complete project structures from templates",
      "Create framework-specific boilerplate code",
      "Apply architectural patterns consistently across codebases"
    ],
    useCases: [
      "Rapid prototyping with consistent code structure",
      "Framework-specific route and controller generation",
      "Design pattern implementation (Factory, Repository, etc.)",
      "Project scaffolding for new microservices or modules"
    ]
  },
  {
    patterns: ["kubernetes", "k8s", "aws", "azure", "gcp", "cloud", "terraform", "infrastructure", "cloudflare", "serverless"],
    domain: "Cloud & Infrastructure",
    capabilities: [
      "Manage cloud infrastructure and container orchestration",
      "Generate and validate Terraform/IaC configurations",
      "Automate cloud resource provisioning and scaling",
      "Monitor and optimize cloud infrastructure costs"
    ],
    useCases: [
      "Infrastructure as Code development and management",
      "Kubernetes cluster configuration and operations",
      "Cloud migration planning and execution",
      "Multi-cloud architecture design and optimization"
    ]
  },
  {
    patterns: ["email", "gmail", "calendar", "slack", "notion", "meeting", "schedule", "crm", "sales", "marketing"],
    domain: "Business Operations",
    capabilities: [
      "Integrate with business communication and productivity tools",
      "Automate scheduling, notifications, and workflows",
      "Manage customer relationships and sales pipelines",
      "Generate business reports and analytics"
    ],
    useCases: [
      "Automating email management and communication workflows",
      "Calendar and meeting scheduling optimization",
      "CRM data management and sales pipeline tracking",
      "Business process automation across multiple tools"
    ]
  },
  {
    patterns: ["art", "design", "image", "photo", "video", "audio", "music", "creative", "brand", "content", "media", "gif"],
    domain: "Content & Media",
    capabilities: [
      "Create and manipulate visual and multimedia content",
      "Apply brand guidelines and design systems consistently",
      "Generate creative assets with AI-assisted tools",
      "Process and transform media across formats"
    ],
    useCases: [
      "Automated creative asset generation for marketing",
      "Brand-consistent design production at scale",
      "Video and audio content processing workflows",
      "Generative art and interactive visual experiences"
    ]
  },
  {
    patterns: ["agent", "orchestrat", "multi-agent", "sub-agent", "dispatch", "parallel", "skill writer", "self-improv", "meta"],
    domain: "Agent Orchestration",
    capabilities: [
      "Coordinate and dispatch tasks across multiple AI agents",
      "Author and verify new agent skills automatically",
      "Maintain session continuity and context across interactions",
      "Enable agents to self-improve through captured learnings"
    ],
    useCases: [
      "Building multi-agent systems for complex workflows",
      "Automated skill creation and quality verification",
      "Long-running agent session management and summarization",
      "Continuous agent improvement through error and learning capture"
    ]
  },
  {
    patterns: ["search", "browse", "scrape", "crawl", "web", "fetch", "summarize", "news", "weather", "rag", "knowledge"],
    domain: "Web & Information Retrieval",
    capabilities: [
      "Search, browse, and extract content from the web",
      "Summarize long-form content into actionable insights",
      "Build and query knowledge bases from multiple sources",
      "Access real-time data from external APIs and services"
    ],
    useCases: [
      "Automated web research and competitive intelligence",
      "Content summarization for rapid information processing",
      "Knowledge base construction from diverse sources",
      "Real-time data integration for AI-powered decisions"
    ]
  },
  {
    patterns: ["database", "sql", "postgres", "mongo", "redis", "data", "analytics", "obsidian", "note", "knowledge graph"],
    domain: "Data & Knowledge Management",
    capabilities: [
      "Query, manage, and transform structured data",
      "Build and maintain knowledge graphs and note systems",
      "Process and analyze datasets at scale",
      "Connect data sources for integrated insights"
    ],
    useCases: [
      "Knowledge management and personal note systems",
      "Database query optimization and management",
      "Data pipeline orchestration and transformation",
      "Building connected knowledge bases for AI retrieval"
    ]
  },
  {
    patterns: ["python", "typescript", "javascript", "rust", "go", "java", "coding", "programming", "refactor", "api"],
    domain: "Software Development",
    capabilities: [
      "Generate, refactor, and optimize code across languages",
      "Apply language-specific idioms and best practices",
      "Build and consume APIs with proper error handling",
      "Integrate with development tools and package managers"
    ],
    useCases: [
      "Multi-language code generation and translation",
      "API development with comprehensive error handling",
      "Codebase refactoring and modernization",
      "Development tool integration and automation"
    ]
  },
  {
    patterns: ["auth", "security", "encrypt", "sso", "oauth", "access control", "compliance"],
    domain: "Security & Authentication",
    capabilities: [
      "Implement authentication and authorization flows",
      "Manage encryption and secure data handling",
      "Audit security configurations and detect vulnerabilities",
      "Enforce compliance requirements and access policies"
    ],
    useCases: [
      "Implementing secure authentication workflows",
      "Security auditing and compliance verification",
      "Access control and permissions management",
      "Secure data handling and encryption setup"
    ]
  },
];

function inferDomain(name, summary) {
  const text = `${name} ${summary}`.toLowerCase();
  for (const d of skillDomains) {
    if (d.patterns.some((p) => text.includes(p))) {
      return d;
    }
  }
  return {
    domain: "Productivity & Automation",
    capabilities: [
      "Extend AI agent capabilities with specialized functionality",
      "Automate repetitive tasks and workflows",
      "Provide structured access to external tools and services",
      "Enable intelligent decision-making with contextual data"
    ],
    useCases: [
      "Streamlining daily development workflows",
      "Automating repetitive tasks with AI assistance",
      "Building intelligent automation pipelines",
      "Enhancing productivity through specialized agent skills"
    ]
  };
}

/* ---------- Content Generation ------------------------------------------- */

function generateRichContent(skill) {
  const name = skill.name || "Unknown";
  const summary = skill.summary || "";
  const category = skill.category || "";
  const skillType = skill.skillType || "";
  const domain = inferDomain(name, summary);

  // Build intro paragraph
  let intro;
  if (summary.length > 50) {
    intro = `${summary} As a ${category.toLowerCase() || "specialized"} skill, ${name} extends AI agent capabilities by providing structured instructions and tools that agents can dynamically load and execute.`;
  } else {
    intro = `${name} is a ${domain.domain.toLowerCase()} skill that extends AI agent capabilities. ${summary ? summary + ". " : ""}This skill provides modular instruction packages that AI coding agents like Claude Code, GitHub Copilot, and Cursor can dynamically load to perform specialized tasks.`;
  }

  // Capabilities HTML
  const capsHtml = domain.capabilities.map((c) => `<li>${c}</li>`).join("");

  // Use cases HTML
  const ucsHtml = domain.useCases.map((u) => `<li>${u}</li>`).join("");

  // How it works — adapted for skills (not MCP)
  const howItWorks = `${name} works as a modular skill package that AI agents load on demand. When you ask an agent to perform a related task, it dynamically activates this skill's instructions, scripts, and templates — no configuration changes or API keys required. Skills are portable across Claude Code, GitHub Copilot, VS Code, Cursor, Windsurf, and other compatible agents.`;

  // Category/type info
  const metaParts = [];
  if (category) metaParts.push(`Category: ${category}`);
  if (skillType) metaParts.push(`Type: ${skillType}`);
  if (skill.provider) metaParts.push(`Provider: ${skill.provider}`);
  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : "";

  // Build full HTML
  const html = [
    `<p>${intro}</p>`,
    `<p><strong>Key Capabilities:</strong></p>`,
    `<ul>${capsHtml}</ul>`,
    `<p><strong>Common Use Cases:</strong></p>`,
    `<ul>${ucsHtml}</ul>`,
    `<p><strong>How It Works:</strong> ${howItWorks}</p>`,
    metaLine ? `<p><strong>Details:</strong> ${metaLine}</p>` : "",
  ].filter(Boolean).join("");

  return html;
}

/* ---------- Main --------------------------------------------------------- */

async function main() {
  console.log(`\n=== Skills Content Enrichment ===`);
  console.log(`   CMS: ${baseUrl}`);
  console.log(`   Dry run: ${dryRun} | Force: ${forceUpdate} | Threshold: ${maxLen} chars\n`);

  const allSkills = await fetchAllSkills();
  console.log(`Total skills in CMS: ${allSkills.length}`);

  // Filter to skills needing enrichment
  const toProcess = allSkills.filter((s) => {
    if (forceUpdate) return true;
    const len = (s.longDescription || "").length;
    return len < maxLen;
  });

  console.log(`Skills needing enrichment: ${toProcess.length}\n`);

  const batch = limit > 0 ? toProcess.slice(0, limit) : toProcess;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const skill = batch[i];
    const richContent = generateRichContent(skill);
    const oldLen = (skill.longDescription || "").length;
    const newLen = richContent.length;

    if (dryRun) {
      console.log(`  [${i + 1}/${batch.length}] ${skill.name} — ${oldLen} → ${newLen} chars`);
      if (i < 3) {
        console.log(`    Preview: ${richContent.slice(0, 200)}...\n`);
      }
      enriched++;
      continue;
    }

    try {
      const docId = skill.documentId || skill.id;
      await fetchCMS(`/api/skills/${docId}`, {
        method: "PUT",
        body: JSON.stringify({ data: { longDescription: richContent } }),
      });
      enriched++;

      if (enriched % 50 === 0) {
        console.log(`  Progress: ${enriched}/${batch.length} enriched`);
      }

      await sleep(50);
    } catch (err) {
      console.error(`  FAIL [${skill.slug}]: ${err.message}`);
      failed++;
    }
  }

  console.log(`
=== Enrichment Complete ===
  Enriched: ${enriched}
  Failed:   ${failed}
  Total:    ${batch.length}
`);

  // Final stats check
  if (!dryRun) {
    const final = await fetchAllSkills();
    const empty = final.filter((s) => (s.longDescription || "").length < maxLen).length;
    const rich = final.filter((s) => (s.longDescription || "").length >= 500).length;
    const medium = final.filter((s) => {
      const l = (s.longDescription || "").length;
      return l >= maxLen && l < 500;
    }).length;
    console.log(`Final state: ${final.length} total | ${rich} rich (500+) | ${medium} medium | ${empty} thin/empty`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
