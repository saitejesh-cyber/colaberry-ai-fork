# Basecamp Update Draft — Thursday 2026-04-09

**Target post:** https://3.basecamp.com/3945211/buckets/6593808/todolists/9400838252
**Reply to / follow-up of:** Tuesday's "Claude Code Skills & 3-Layer Security Audit" update (recording 9761475294)
**Author:** Sai Tejesh, Senior Software Engineer (Full Stack)
**To:** Karun
**cc:** Ram

---

## Title

**Update: Substack Hybrid Signup shipped to production — email delivery live**

---

## Body

Following Tuesday's security audit update, today we shipped the Substack Hybrid signup surface end-to-end to production and verified the full email delivery path on `www.colaberry.ai`.

### What shipped

- **New component:** `SubstackEmbedSignup` — a single on-brand component with 4 variants (default, compact, sidebar, footer) that renders schema.org `SubscribeAction` microdata (AEO-indexable by ChatGPT / Claude / Perplexity) + Substack's native GET form handoff inside.
- **4 touchpoints on the live site, all converted:**
    1. Global footer (every page on colaberry.ai)
    2. `/resources/podcasts` sidebar
    3. `/resources/podcasts/[slug]` sidebar (per-episode)
    4. `/updates` inline signup
- **Email delivery path:** Substack native via the `colaberry.online` custom domain. Telemetry row still written to Strapi (`Newsletter Subscriber` collection) for internal analytics, but zero dependency on Resend / SendGrid.
- **Rationale captured in `docs/email-delivery-test-report-2026-04-09.md`.**

### Production blocker caught and fixed

On first deploy the form markup was correct but the browser silently blocked the submit. Root cause: the production Content-Security-Policy (`next.config.ts`) had:

```
form-action 'self'
```

This CSP directive restricts what origins a `<form>` can POST/GET to. Because the native Substack handoff targets `https://www.colaberry.online/subscribe`, every click was blocked at the browser layer before it ever left the page. Localhost worked fine because CSP is gated on `NODE_ENV === "production"`.

**One-line fix:**

```diff
- "form-action 'self'",
+ "form-action 'self' https://www.colaberry.online",
```

Allowlist only the exact Substack custom-domain endpoint we hand off to — no other directive touched.

### Deploy & proof

- `Release-1.0` (prod) — `a1908b9` pushed to both origin and upstream, Cloud Run redeployed, live on `www.colaberry.ai`.
- `Release-1.0.beta` — cherry-picked same fix (`169b012`), pushed to origin and upstream.
- **End-to-end verified in browser:** Subscribe button clicked on prod → form submitted to `colaberry.online/subscribe?email=...` → Substack confirm page → landed on `/account?free_signup_confirmation=true` (Substack's success confirmation screen).
- **Production CSP now correctly returns:**
    ```
    form-action 'self' https://www.colaberry.online
    ```
- **Markup audit on all 4 pages:** every form instance points at the native Substack domain, every instance emits `SubscribeAction` schema (AEO-safe), 7/7 forms present across the 4 touchpoints.

### Security posture of the new path

- 9-layer bot defense on the telemetry endpoint (UA filter, required browser headers, origin allowlist, content-type enforcement, honeypot, HMAC timing token, strict email validator + disposable-domain blocklist, per-IP + per-email rate limits).
- All failures silently fake-succeed with HTTP 200 to prevent enumeration.
- No new scripts, no new frame sources beyond what was already allowed, no new connect-src.
- CSP tightening scope: the allowlist addition is surgical — one directive, one origin, the exact endpoint Substack requires.

### What's next

- Monitor Substack delivery stats over the next 24h on the `colaberry.online` admin to confirm real-world opt-ins flow through.
- Security audit findings from Tuesday (1 High + 6 Medium still open) to be prioritized into the next sprint PRD.
- Newsletter Subscriber telemetry rows in Strapi CMS to be spot-checked against Substack's subscriber list for parity.

---

*cc: Ram*
