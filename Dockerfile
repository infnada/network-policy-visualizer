# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all files
COPY . .

# Build the React application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy the package.json files for server dependencies
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --production

# Copy server.js
COPY server.js ./

# Copy built app from build stage
COPY --from=build /app/dist ./dist

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Run the server
CMD ["node", "server.js"]
