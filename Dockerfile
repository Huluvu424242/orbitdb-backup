FROM node:22-alpine

# Alle weiteren Kommandos relativ zu /app
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/

CMD ["npm", "start"]
