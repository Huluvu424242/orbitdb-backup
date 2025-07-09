# Zugriff auf Konfiguration und Rechte einer OrbitDB

## Ausgangsfrage

Kann man bei Kenntnis der Adresse einer OrbitDB die ursprüngliche Konfiguration der Datenbank – insbesondere die Lese- und Schreibrechte – auslesen, um diese ggf. bei einer neuen Instanz wiederzuverwenden?

## Erkenntnisse

- Eine OrbitDB-Adresse verweist auf eine **Manifest-Datei**, die u.a. den Typ der Datenbank, ihren Namen und die Adresse des verwendeten Access Controllers enthält.
- Die **Access Controller Konfiguration** (z.B. Schreibrechte) ist in einer **separaten OrbitDB** gespeichert.
- **Lese-Rechte gibt es nicht**, da IPFS standardmäßig öffentlich lesbar ist (sofern Daten nicht verschlüsselt wurden).
- Die Schreibrechte lassen sich **nur dann rekonstruieren**, wenn die zugehörige AccessController-Datenbank im IPFS weiterhin verfügbar ist (z.B. durch Pinning).
- Nach dem Verlust einer DB kann ein Replikator eine neue OrbitDB anlegen. Wenn dieser die **Manifest-Datei und die AccessController-DB pinnt**, bleiben die Konfigurationsdaten auch für andere Clients auslesbar.

## Empfehlung

Für eine robuste Replikation und Wiederherstellung:
- Manifest und AccessController gezielt pinnen.
- Optional Backup der Schreibrechte als JSON exportieren.

### Beispiel für Rechte-Backup

```ts
const rightsBackup = {
  write: acStore.get('write'),
  type: 'OrbitDBAccessController',
  address: acStore.address.toString()
}
fs.writeFileSync('backup-access.json', JSON.stringify(rightsBackup, null, 2))
```

## Fazit

➡️ Mit einer korrekt gepinnten Manifest- und AccessController-Struktur können Schreibrechte auch nach einem Datenverlust rekonstruiert werden.  
❌ Ohne Zugriff auf die ursprüngliche AccessController-DB ist keine Wiederherstellung der Rechte möglich.

