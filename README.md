# OrbitDB Backup Replikator (Variante 2)

Dieses Projekt implementiert einen OrbitDB-Backup-Replikator, der direkt im IPFS-Docker-Container auf Unraid betrieben werden kann (Shell-basiert).

## Nutzung

### Ohne Docker

npm -i
mpm start

#### Mit Docker

1. Image bauen
docker build -t orbit-backup .
2. container von image starten 
docker run --network host --name orbitdb-backup-container orbitdb-backup
3. ggf. muss ein verbundenen Container vorher gelöscht werden:
docker rm <hash>
4. laufenden Container Logs beobachten
docker logs -f orbitdb-backup-container
6. Eine Shell im Container öffnen
docker exec -it orbitdb-backup-container sh
5. Testeintrag vornehmen
node tests/int-test.js

