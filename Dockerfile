FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Only copy package files to install dependencies in the image
COPY package*.json ./
RUN npm install

# Install Playwright browser
RUN npx playwright install chromium

# Create workspace for agent output
RUN mkdir -p /app/workspace

# Note: No 'COPY . .' here. We will mount the source via compose.
ENV NODE_ENV=development

CMD ["node", "index.js"]