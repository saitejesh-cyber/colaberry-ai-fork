# Use official Node image
FROM node:20-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies deterministically
RUN npm ci

# Copy rest of the app
COPY . .

# Build Next.js app
RUN npm run build

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
