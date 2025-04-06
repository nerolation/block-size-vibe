FROM node:20-slim

WORKDIR /app

# Install wget for health check
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Environment variables for skipping type checks during build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_SKIP_TYPE_CHECK true

# Build the application with type checks skipped
RUN NODE_OPTIONS=--max_old_space_size=4096 npm run build

# Run the application
EXPOSE 3000
CMD ["npm", "start"] 