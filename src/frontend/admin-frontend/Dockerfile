# Multi-stage build for React admin frontend

# 1) Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2) Runtime: serve static files via a tiny Node server
# (Caddy will proxy to this container)
FROM node:20-alpine AS runtime
WORKDIR /app

# Install a simple static file server
RUN npm install -g serve

# Copy built assets
COPY --from=build /app/dist ./dist

# Expose port for Caddy to reach
EXPOSE 4173

# Use serve to host the built React app
CMD ["serve", "-s", "dist", "-l", "4173"]
