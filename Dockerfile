FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++

# Only copy package files to install dependencies in the image
COPY package*.json ./
RUN npm install

# Create workspace for agent output
RUN mkdir -p /app/workspace

# Note: No 'COPY . .' here. We will mount the source via compose.
ENV NODE_ENV=development

CMD ["node", "index.js"]