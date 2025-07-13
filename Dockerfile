FROM node:22-alpine

LABEL net.unraid.docker.template="https://github.com/Huluvu424242/unraid-templates/blob/master/templates/"
LABEL net.unraid.docker.icon="https://github.com/Huluvu424242/unraid-templates/blob/master/templates/icon.png"

LABEL NODE_VERSION="Node Version"
LABEL YARN_VERSION="Yarn Installer Version"

# API-Zugangsdaten (kann beim Start mit -e API_KEY überschrieben werden)
ENV DEBUG=false
LABEL DEBUG="false"
ENV IPFS_API_URL="http://127.0.0.1:5001"
LABEL IPFS_API_URL="URL des IPFS APIs z.B. http://localhost:5001"
ENV ORBITDB_ADDR="appstorage"
LABEL ORBITDB_ADDR="Initiale OrbitDB Adresse, falls die DB bereits existiert"

VOLUME /data

# Alle weiteren Kommandos relativ zu /app
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/

CMD ["npm", "start"]

# ==============================================================
# Erwartete Umgebungsvariablen beim Containerstart:
#
# -e DEBUG=true or false
# -e IPFS_API_URL=http://127.0.0.1:5001
# -e ORBITDB_ADDR=appstore
# ==============================================================
