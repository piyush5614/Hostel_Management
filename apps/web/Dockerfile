# Frontend Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Copy source and static assets
COPY src ./src
COPY public ./public

# Install dependencies
RUN npm ci

# Expose Vite dev server port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
