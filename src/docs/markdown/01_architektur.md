# Architektur

Das System besteht aus mehreren Komponenten:

- **ipfs-kubo**: Ein existierender Docker-Container auf dem Homeserver, über den Daten ausgetauscht werden.
- **Replikator-Container**: Liest aus IPNS, prüft die OrbitDB-Adresse, pinnt neue Einträge und erneuert ggf. die DB.
- **OrbitDB Clients**: Verwenden die über IPNS referenzierte OrbitDB-Adresse, um Daten zu lesen und zu schreiben (je nach Rechtevergabe).
- **Optionaler Write-Backend-Container**: Führt Schreiboperationen aus, falls Clients schreibgeschützt bleiben sollen.
