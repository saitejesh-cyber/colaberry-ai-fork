/**
 * Unit tests for src/lib/distribution/template.ts
 *
 * Sprint v5 · Task 5 acceptance: "Unit tests cover every supported token +
 * malformed input."
 *
 * Runner: Node 20+ built-in `node:test` (zero new deps — matches the existing
 * `scripts/verify-*.mjs` convention). Node 24 type-strips `.ts` natively so
 * this file runs without a transpiler:
 *
 *   node --test src/lib/distribution/__tests__/template.test.ts
 *
 * Covered surface:
 *   - Every interpolation token: {{title}}, {{summary}}, {{url}}, {{kind}},
 *     {{updatedAt}}, {{tags}} (comma-joined bare form)
 *   - Iteration section: {{#tags}}…{{/tags}} with {{.}} item slot
 *   - Truthy sections: {{#isNew}}, {{#hasTags}}, {{#hasSummary}}
 *   - Inverted sections: {{^isNew}}
 *   - escapeHtml option + URL immunity from escaping
 *   - maxLength truncation with word-boundary trimEnd + ellipsis
 *   - Unknown tokens render as empty string (never "undefined")
 *   - Malformed input: empty template, non-string template, unclosed {{, unclosed section
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { renderTemplate } from "../template.ts";
import type { DistributableEntry } from "../types.ts";

/* ---------- fixtures ---------------------------------------------------- */

const baseEntry: DistributableEntry = {
  id: "doc_abc123",
  kind: "agent",
  title: "Metric Auditor",
  summary: "Audits KPI drift across your analytics warehouse.",
  url: "https://colaberry.ai/aixcelerator/agents/metric-auditor",
  tags: ["analytics", "audit", "observability"],
  updatedAt: "2026-04-15T12:00:00.000Z",
  isNew: true,
};

function withEntry(overrides: Partial<DistributableEntry>): DistributableEntry {
  return { ...baseEntry, ...overrides };
}

/* ---------- interpolation tokens ---------------------------------------- */

describe("renderTemplate — interpolation tokens", () => {
  test("{{title}} interpolates entry.title", () => {
    assert.equal(renderTemplate("Hello {{title}}!", baseEntry), "Hello Metric Auditor!");
  });

  test("{{summary}} interpolates entry.summary", () => {
    assert.equal(renderTemplate("Summary: {{summary}}", baseEntry), `Summary: ${baseEntry.summary}`);
  });

  test("{{url}} interpolates entry.url", () => {
    assert.equal(renderTemplate("Read: {{url}}", baseEntry), `Read: ${baseEntry.url}`);
  });

  test("{{kind}} interpolates entry.kind", () => {
    assert.equal(renderTemplate("Kind={{kind}}", baseEntry), "Kind=agent");
  });

  test("{{updatedAt}} interpolates entry.updatedAt ISO string", () => {
    assert.equal(
      renderTemplate("@{{updatedAt}}", baseEntry),
      `@${baseEntry.updatedAt}`,
    );
  });

  test("{{tags}} bare form renders a comma-joined list", () => {
    assert.equal(
      renderTemplate("Tags: {{tags}}", baseEntry),
      "Tags: analytics, audit, observability",
    );
  });

  test("tokens with internal whitespace still resolve ({{ title }})", () => {
    assert.equal(renderTemplate("x {{ title }} y", baseEntry), "x Metric Auditor y");
  });

  test("unknown tokens render as empty string (never 'undefined')", () => {
    const out = renderTemplate("({{nonExistentKey}})", baseEntry);
    assert.equal(out, "()");
    assert.ok(!out.includes("undefined"));
  });

  test("multiple tokens on one line all resolve", () => {
    assert.equal(
      renderTemplate("{{title}} — {{url}}", baseEntry),
      `${baseEntry.title} — ${baseEntry.url}`,
    );
  });

  test("empty {{}} token is skipped silently", () => {
    assert.equal(renderTemplate("a {{}} b", baseEntry), "a  b");
  });
});

/* ---------- iteration section ({{#tags}}…{{/tags}}) --------------------- */

describe("renderTemplate — tags iteration", () => {
  test("{{#tags}}#{{.}} {{/tags}} expands each tag", () => {
    assert.equal(
      renderTemplate("{{#tags}}#{{.}} {{/tags}}", baseEntry).trim(),
      "#analytics #audit #observability",
    );
  });

  test("{{#tags}}{{.}}{{/tags}} with empty tags renders empty", () => {
    assert.equal(
      renderTemplate("A{{#tags}}{{.}}{{/tags}}B", withEntry({ tags: [] })),
      "AB",
    );
  });

  test("{{^tags}} inverted section fires when tags are empty", () => {
    assert.equal(
      renderTemplate("{{^tags}}no tags{{/tags}}", withEntry({ tags: [] })),
      "no tags",
    );
  });

  test("{{^tags}} inverted section is empty when tags present", () => {
    assert.equal(renderTemplate("{{^tags}}fallback{{/tags}}", baseEntry), "");
  });

  test("iteration body can reference entry-level tokens alongside {{.}}", () => {
    const out = renderTemplate("{{#tags}}[{{.}}:{{kind}}]{{/tags}}", baseEntry);
    assert.equal(out, "[analytics:agent][audit:agent][observability:agent]");
  });
});

/* ---------- truthy / inverted sections ---------------------------------- */

describe("renderTemplate — truthy + inverted sections", () => {
  test("{{#isNew}} renders body when isNew=true", () => {
    assert.equal(renderTemplate("{{#isNew}}NEW{{/isNew}}", baseEntry), "NEW");
  });

  test("{{#isNew}} renders empty when isNew=false", () => {
    assert.equal(
      renderTemplate("{{#isNew}}NEW{{/isNew}}", withEntry({ isNew: false })),
      "",
    );
  });

  test("{{^isNew}} inverted renders body when isNew=false", () => {
    assert.equal(
      renderTemplate("{{^isNew}}UPD{{/isNew}}", withEntry({ isNew: false })),
      "UPD",
    );
  });

  test("{{^isNew}} inverted renders empty when isNew=true", () => {
    assert.equal(renderTemplate("{{^isNew}}UPD{{/isNew}}", baseEntry), "");
  });

  test("combined {{#isNew}}/{{^isNew}} produces exactly one branch", () => {
    const tpl = "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}";
    assert.equal(renderTemplate(tpl, baseEntry), "New: Metric Auditor");
    assert.equal(
      renderTemplate(tpl, withEntry({ isNew: false })),
      "Updated: Metric Auditor",
    );
  });

  test("{{#hasTags}} fires when tags.length > 0", () => {
    assert.equal(renderTemplate("{{#hasTags}}yes{{/hasTags}}", baseEntry), "yes");
  });

  test("{{#hasTags}} is empty when tags empty", () => {
    assert.equal(
      renderTemplate("{{#hasTags}}yes{{/hasTags}}", withEntry({ tags: [] })),
      "",
    );
  });

  test("{{#hasSummary}} fires when summary non-empty", () => {
    assert.equal(
      renderTemplate("{{#hasSummary}}y{{/hasSummary}}", baseEntry),
      "y",
    );
  });

  test("{{#hasSummary}} treats whitespace-only summary as empty", () => {
    assert.equal(
      renderTemplate(
        "{{#hasSummary}}y{{/hasSummary}}",
        withEntry({ summary: "   \n  \t " }),
      ),
      "",
    );
  });
});

/* ---------- escapeHtml behavior ---------------------------------------- */

describe("renderTemplate — escapeHtml", () => {
  const attackerEntry = withEntry({
    title: 'Metric <script>alert("x")</script> & "Friends"',
    summary: "5 < 7 > 3 & true",
    tags: ["<b>bold</b>", "a&b"],
  });

  test("escapeHtml=false leaves content raw", () => {
    const out = renderTemplate("{{title}}", attackerEntry, { escapeHtml: false });
    assert.ok(out.includes("<script>"));
    assert.ok(out.includes('"'));
  });

  test("escapeHtml=true escapes <, >, &, \", '", () => {
    const out = renderTemplate("{{title}}", attackerEntry, { escapeHtml: true });
    assert.ok(!out.includes("<script>"));
    assert.ok(out.includes("&lt;script&gt;"));
    assert.ok(out.includes("&amp;"));
    assert.ok(out.includes("&quot;"));
  });

  test("escapeHtml=true escapes summary too", () => {
    const out = renderTemplate("{{summary}}", attackerEntry, { escapeHtml: true });
    assert.equal(out, "5 &lt; 7 &gt; 3 &amp; true");
  });

  test("escapeHtml=true escapes iterated tag items", () => {
    const out = renderTemplate(
      "{{#tags}}[{{.}}]{{/tags}}",
      attackerEntry,
      { escapeHtml: true },
    );
    assert.ok(!out.includes("<b>"));
    assert.ok(out.includes("&lt;b&gt;bold&lt;/b&gt;"));
    assert.ok(out.includes("a&amp;b"));
  });

  test("escapeHtml=true does NOT escape {{url}} (link preservation)", () => {
    const hostileUrl = "https://colaberry.ai/agents/?q=a&b=c";
    const out = renderTemplate(
      "{{url}}",
      withEntry({ url: hostileUrl }),
      { escapeHtml: true },
    );
    // URL must pass through verbatim — escaping it breaks the link.
    assert.equal(out, hostileUrl);
  });
});

/* ---------- maxLength truncation --------------------------------------- */

describe("renderTemplate — maxLength truncation", () => {
  test("output under budget is returned unchanged", () => {
    assert.equal(
      renderTemplate("short", baseEntry, { maxLength: 280 }),
      "short",
    );
  });

  test("exceeding maxLength truncates with a single ellipsis char", () => {
    const tpl = "x".repeat(400);
    const out = renderTemplate(tpl, baseEntry, { maxLength: 50 });
    assert.equal(out.length, 50);
    assert.ok(out.endsWith("…"));
  });

  test("maxLength trims trailing whitespace before the ellipsis", () => {
    // 48 chars of 'x', then 2 spaces, then more 'x' → 400 total.
    const tpl = "x".repeat(48) + "  " + "x".repeat(350);
    const out = renderTemplate(tpl, baseEntry, { maxLength: 51 });
    assert.equal(out.length, 49, "trimmed tail should shorten below budget");
    // The char before the ellipsis must NOT be whitespace.
    const beforeEllipsis = out.slice(-2, -1);
    assert.notEqual(beforeEllipsis, " ");
    assert.ok(out.endsWith("…"));
  });

  test("maxLength=0 returns original (no truncation triggered)", () => {
    // maxLength 0 is falsy in the engine's guard — so it's effectively "no limit".
    const out = renderTemplate("abcdef", baseEntry, { maxLength: 0 });
    assert.equal(out, "abcdef");
  });

  test("X 280-char budget enforced on long rendered body", () => {
    const longTitle = "A".repeat(500);
    const out = renderTemplate(
      "{{title}}",
      withEntry({ title: longTitle }),
      { maxLength: 280 },
    );
    assert.equal(out.length, 280);
    assert.ok(out.endsWith("…"));
  });
});

/* ---------- malformed input -------------------------------------------- */

describe("renderTemplate — malformed input", () => {
  test("empty string template returns empty string", () => {
    assert.equal(renderTemplate("", baseEntry), "");
  });

  test("non-string template returns empty string (type guard)", () => {
    // Deliberately bypass TS to exercise the runtime guard.
    const out = renderTemplate(undefined as unknown as string, baseEntry);
    assert.equal(out, "");
    const out2 = renderTemplate(null as unknown as string, baseEntry);
    assert.equal(out2, "");
    const out3 = renderTemplate(42 as unknown as string, baseEntry);
    assert.equal(out3, "");
  });

  test("unclosed {{ renders the raw tail without crashing", () => {
    const out = renderTemplate("Hello {{title", baseEntry);
    // Per docstring: "Unclosed tag — render the raw text rather than crashing."
    assert.ok(out.startsWith("Hello "));
    assert.ok(out.includes("{{title"));
  });

  test("unclosed section warns, skips the open tag, renders trailing content verbatim", () => {
    // Silence the expected console.warn during this assertion.
    const origWarn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    try {
      const out = renderTemplate("before {{#isNew}}never-closed", baseEntry);
      // Engine behavior: the `{{#isNew}}` open tag is dropped (no close found),
      // and everything after it renders as-is. We'd rather leak "never-closed"
      // than silently drop content a CMS editor typed — they'll see it in the
      // dry-run preview and know to fix the template.
      assert.equal(out, "before never-closed");
      assert.ok(warned, "should have logged a warning for unclosed section");
    } finally {
      console.warn = origWarn;
    }
  });

  test("stray closing tag {{/foo}} is ignored silently", () => {
    assert.equal(
      renderTemplate("a {{/foo}} b", baseEntry),
      "a  b",
    );
  });

  test("template with only whitespace is preserved", () => {
    assert.equal(renderTemplate("   \n\t ", baseEntry), "   \n\t ");
  });
});

/* ---------- integration: the seed templates the scripts ship ------------ */

describe("renderTemplate — real seed templates", () => {
  test("X template (isNew branch) renders correctly", () => {
    const tpl =
      "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}\n\n{{summary}}\n\n{{url}}";
    const out = renderTemplate(tpl, baseEntry);
    assert.ok(out.startsWith("New: Metric Auditor"));
    assert.ok(out.includes(baseEntry.summary));
    assert.ok(out.endsWith(baseEntry.url));
  });

  test("X template (updated branch) renders correctly", () => {
    const tpl =
      "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}\n\n{{summary}}\n\n{{url}}";
    const out = renderTemplate(tpl, withEntry({ isNew: false }));
    assert.ok(out.startsWith("Updated: Metric Auditor"));
  });

  test("X template under 280-char budget with a huge summary", () => {
    const tpl =
      "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}\n\n{{summary}}\n\n{{url}}";
    const giant = "This is a very long summary. ".repeat(30); // ~870 chars
    const out = renderTemplate(tpl, withEntry({ summary: giant }), { maxLength: 280 });
    assert.equal(out.length, 280);
    assert.ok(out.endsWith("…"));
  });

  test("Moltbook title template renders the verb + title", () => {
    const out = renderTemplate(
      "{{#isNew}}New{{/isNew}}{{^isNew}}Updated{{/isNew}}: {{title}}",
      baseEntry,
    );
    assert.equal(out, "New: Metric Auditor");
  });
});
