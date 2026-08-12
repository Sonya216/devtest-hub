### Multi-stage Dockerfile for Vercel / custom Docker builds
# - Accepts build-time args for Vite envs so client build sees them
# - Builds the app in a node image, then copies artifacts to a smaller runtime image

#########################
# Build stage
#########################
FROM node:18-alpine AS build

# Build-time args (Vercel will supply these from Project > Environment Variables)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Expose them to the build as env vars so Vite's import.meta.env sees them
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

WORKDIR /app

# Install dependencies (cache package.json separately)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY . .

# Write a .env file so Vite picks up VITE_* variables during build.
# This prefers build-time ARG values but will also use any environment
# variables available in the build environment.
RUN printf "VITE_SUPABASE_URL=%s\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n" \ 
	"${VITE_SUPABASE_URL:-$VITE_SUPABASE_URL}" \ 
	"${VITE_SUPABASE_PUBLISHABLE_KEY:-$VITE_SUPABASE_PUBLISHABLE_KEY}" \ 
	> .env

# Build the project (ensure your package.json has a "build" script)
RUN npm run build

#########################
# Production stage
#########################
FROM node:18-alpine AS prod
WORKDIR /app

# Copy built assets and necessary files from build stage
COPY --from=build /app .

ENV NODE_ENV=production

# Default port (change if your server uses a different one)
EXPOSE 3000

# Default start command - ensure package.json has a "start" script that runs the built server
CMD ["npm", "run", "start"]
# Multi-stage build for Vite app
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Simple nginx config could be added if needed
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
