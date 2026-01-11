# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including dev dependencies for building
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Copy other necessary files (like templates if any)
# COPY --from=builder /app/src/templates ./dist/templates

# Generate Prisma Client for production
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 4011

# Command to run migrations and then start the server
# Note: In a real production setup, migrations might be run in a separate step
CMD ["sh", "-c", "npm run migrate && npm start"]
