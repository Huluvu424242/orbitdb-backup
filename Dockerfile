FROM node:22-alpine

LABEL NODE_VERSION="Node Version"
LABEL YARN_VERSION="Yarn Installer Version"

# API-Zugangsdaten (kann beim Start mit -e API_KEY überschrieben werden)
ENV DEBUG=false
LABEL DEBUG="false"
ENV IPFS_API_URL=
LABEL IPFS_API_URL="URL des IPFS APIs z.B. http://localhost:5001"
ENV ORBITDB_ADDR=
LABEL ORBITDB_ADDR="Initiale OrbitDB Adresse, falls die DB bereits existiert"

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
