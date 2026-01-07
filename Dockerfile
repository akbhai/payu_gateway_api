# Use Node.js Alpine
FROM node:18-alpine

# Install Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app
COPY legend.js .

# Create screenshots dir
RUN mkdir -p screenshots

EXPOSE 3000

CMD ["node", "legend.js"]
