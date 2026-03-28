# Stage 1: Build the frontend
FROM node:20-slim AS build-stage
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ .
RUN npm run build

# Stage 2: Build the backend and serve everything
FROM node:20-slim
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY . .

# Copy built frontend assets from stage 1
COPY --from=build-stage /app/client/dist ./client/dist

# Expose the port (Render uses PORT env var)
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
