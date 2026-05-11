# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (all, including dev for build tooling)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# NEXT_PUBLIC_* vars must be available at build time for Next.js to inline them
ARG NEXT_PUBLIC_CMS_URL=https://colaberry-ai-cms-prod-956818257204.us-east1.run.app/
ARG NEXT_PUBLIC_SITE_URL=https://www.colaberry.ai
ARG NEXT_PUBLIC_VTON_DEMO_URL=https://vton-demo-956818257204.us-east1.run.app
ARG NEXT_PUBLIC_VOICE_AGENT_URL=https://voice-agent-demo-ucwuixvwga-ue.a.run.app/voiceagent/demo
# CMS_API_TOKEN is needed at build time for getStaticProps to fetch content
# Pass via: --build-arg CMS_API_TOKEN=<token> or set in Cloud Build substitutions
ARG CMS_API_TOKEN
ENV NEXT_PUBLIC_CMS_URL=$NEXT_PUBLIC_CMS_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_VTON_DEMO_URL=$NEXT_PUBLIC_VTON_DEMO_URL
ENV NEXT_PUBLIC_VOICE_AGENT_URL=$NEXT_PUBLIC_VOICE_AGENT_URL
ENV CMS_API_TOKEN=$CMS_API_TOKEN

RUN npm run build

# ── Stage 2: Production runtime ────────────────────────────────
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production dependencies (dev deps not needed at runtime)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output and config from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src/lib/mcp-slug-aliases.ts ./src/lib/

# Give non-root user write access to .next for ISR page regeneration
RUN chown -R appuser:appgroup /app/.next

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start Next.js
CMD ["npm", "run", "start"]
