# Frontend Dockerfile - Production Optimized with SSL Support
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Vue app
RUN npm run build

# --- Production Image with Nginx ---
FROM nginx:alpine AS production

# Security: Run as non-root user (nginx user exists by default)
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (main config from root, not conf.d)
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built Vue app
COPY --from=build --chown=nginx:nginx /app/dist /var/www/html

# Create directory for SSL certificates (mounted from host)
RUN mkdir -p /etc/letsencrypt && \
    chown -R nginx:nginx /etc/letsencrypt && \
    mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    mkdir -p /var/www/certbot && \
    chown -R nginx:nginx /var/www/certbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -q --spider https://localhost/ || exit 1

# Expose ports (80 for HTTP redirect, 443 for HTTPS)
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
