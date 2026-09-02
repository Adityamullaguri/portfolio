# Base image with Node.js LTS
FROM node:20-alpine AS base

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Expose server port
EXPOSE 3000

# Start command
CMD ["npm", "start"]

