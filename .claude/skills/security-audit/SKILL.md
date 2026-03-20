# Security Audit

Orchestrate all 7 security agents for a comprehensive security audit of the codebase.

## Steps

1. **Secrets Scan** — Check for leaked API keys, tokens, committed `.env` files, `NEXT_PUBLIC_` variable exposure:
   - Search for hardcoded API keys, tokens, passwords in source code
   - Check `.gitignore` covers all `.env*` files
   - Verify no secrets in `NEXT_PUBLIC_` env vars (these are client-exposed)

2. **Input Sanitization** — Audit XSS vectors and injection points:
   - Check all uses of `dangerouslySetInnerHTML`
   - Verify email input sanitization
   - Check CSP headers in `next.config.js`

3. **Rate Limiting** — Verify API route protection:
   - Check all `src/pages/api/` routes use `src/lib/rate-limit.ts`
   - Verify IP spoofing prevention (X-Forwarded-For handling)

4. **Auth Architecture** — Audit authentication:
   - Verify admin routes use `src/lib/api-auth.ts`
   - Check for localhost bypass vulnerabilities
   - Verify timing-safe comparison for auth tokens

5. **API Security** — Check configuration:
   - CORS configuration in API routes
   - Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
   - Error response leakage (no stack traces in production)
   - SSRF prevention in any URL-accepting endpoints

6. **File Upload Security** — If applicable:
   - Upload size limits
   - MIME type validation
   - Path traversal prevention

7. **Dependency Audit** — Supply chain security:
   ```bash
   npm audit
   ```
   - Check Dockerfile for hardening (non-root user, minimal base image)
   - Review any new dependencies added since last audit

8. **Consolidated Report** — Output findings organized by severity:
   - **Critical** — Immediate fix required
   - **High** — Fix before next deploy
   - **Medium** — Fix within sprint
   - **Low** — Track for improvement

## References

- Security agents: `.claude/agents/security-*.md`
- Security libraries: `src/lib/api-auth.ts`, `src/lib/rate-limit.ts`
- Previous audit: `docs/security-audit-report.md`
- Runbook: `docs/runbooks/security-audit.md`
