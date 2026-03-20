# Security Audit Runbook

## Overview

Seven specialized security agents in `.claude/agents/` provide continuous auditing. Run them individually or use the `/security-audit` skill to orchestrate all 7.

## Agents

| Agent | File | What It Checks |
|-------|------|----------------|
| Secrets Scanner | `@security-secrets` | API keys, tokens, `.env` files in git, `NEXT_PUBLIC_` exposure |
| Input Sanitization | `@security-input` | XSS, email injection, CSP headers, `dangerouslySetInnerHTML` |
| Rate Limiting | `@security-ratelimit` | API route rate limits, IP spoofing, brute force protection |
| Auth Architecture | `@security-auth` | Admin route auth, localhost bypass, timing-safe comparisons |
| API Security | `@security-api` | CORS config, security headers, error leakage, SSRF prevention |
| File Uploads | `@security-uploads` | Upload validation, path traversal, MIME type checks |
| Dependencies | `@security-deps` | `npm audit`, Dockerfile hardening, supply chain risks |

## Running a Full Audit

### Option 1: Skill (recommended)
```
/security-audit
```
This orchestrates all 7 agents and produces a consolidated report.

### Option 2: Individual Agents
```
@security-secrets
@security-input
@security-ratelimit
@security-auth
@security-api
@security-uploads
@security-deps
```

## Reading the Report

Each agent outputs findings with severity levels:
- **Critical** — Immediate fix required (leaked secrets, auth bypass)
- **High** — Fix before next deploy (missing rate limits, XSS vectors)
- **Medium** — Fix within sprint (missing headers, error leakage)
- **Low** — Track for improvement (code quality, best practices)

## Remediation Workflow

1. Triage findings by severity
2. Create specs for Critical/High findings using SDD workflow
3. Fix and verify — `npm run build` + re-run the specific agent
4. Update `docs/security-audit-report.md` with findings and fixes

## Shared Security Libraries

- `src/lib/api-auth.ts` — Admin authentication with timing-safe comparisons
- `src/lib/rate-limit.ts` — Shared rate limiter (use on all API routes)
