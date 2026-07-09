# Stage 1: Build the React frontend and bundle the Express server
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and local shims first
COPY package*.json ./
COPY shims ./shims

# Install all dependencies (including devDependencies needed for the build)
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public

# Build the production assets
RUN npm run build

# Stage 2: Clean production runtime environment
FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and local shims
COPY package*.json ./
COPY shims ./shims

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend assets and bundled backend server from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose port 3000 (the port our Express server binds to)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
