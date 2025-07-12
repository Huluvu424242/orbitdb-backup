FROM node:22-alpine

# API-Zugangsdaten (kann beim Start mit -e API_KEY überschrieben werden)
ENV DEBUG=false
ENV IPFS_API_URL=
ENV ORBITDB_ADDR=


# Datenbankverbindung (z.B. postgres://user:pass@host:port/db)
ENV DATABASE_URL=postgres://localhost:5432/db



# Alle weiteren Kommandos relativ zu /app
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/

CMD ["npm", "start"]

# ==============================================================
# Erwartete Umgebungsvariablen beim Containerstart:
#
# -e API_KEY=<dein API Schlüssel>
# -e DATABASE_URL=<DB Connection String>
# -e MODE=development|production
# ==============================================================
