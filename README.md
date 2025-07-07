# OrbitDB Backup Replikator

![AI unterstützt von ChatGPT](src/docs/markdown/images/callout_ai_unterstuetzt_von_chatgpt.svg)

> ℹ️ Info: Dieses Projekt enthält hauptsächlich Inhalte, die mithilfe von ChatGPT (OpenAI) generiert, überarbeitet oder zusammengefasst wurden.


## Was realisiert das Projekt?
Dieses Projekt implementiert einen OrbitDB Backup-Replikator, der auf einem Unraid-System als ergänzender Docker-Container zum IPFS-Knoten (z.B. einem IPFS Kubo Node) betrieben werden kann. Ziel ist die automatische Sicherung und langfristige Verfügbarkeit einer OrbitDB-Datenbank.

# Arbeitsweise eines PEM-gestützten OrbitDB Backup Replikators

Ein **OrbitDB Backup Replikator** dient der Sicherung und langfristigen Verfügbarkeit einer OrbitDB-Datenbank im IPFS-Netzwerk. Er erfüllt dabei zwei zentrale Aufgaben: **Pinning** neuer Daten und **Backup-Erstellung**.

## 1. Initiale Konfiguration

Beim Start wird der Replikator mit der Adresse einer bestehenden OrbitDB konfiguriert. Zusätzlich wird ihm per Konfiguration eine **PEM-Datei** mit einem privaten Schlüssel übergeben, mit dem er Nachrichten signieren kann.

## 2. Beobachtung und Pinning

Nach dem Start beobachtet der Replikator die konfigurierte Datenbank:

- Er lauscht auf **Replication-** und **Update-Events**.
- Bei jedem eintreffenden Event, das eine Änderung am Datenbestand signalisiert, **pinnt** der Replikator die betroffenen Inhalte.
- Dadurch wird sichergestellt, dass diese Inhalte vom **lokalen IPFS-Node dauerhaft gespeichert**  und nicht durch Garbage Collection entfernt werden.

## 3. Schutz vor Datenverlust

Indem der Replikator sämtliche Inhalte der Datenbank pinnt, verhindert er das unbeabsichtigte Verschwinden der Daten aus dem IPFS. Ausführliche Informationen hierzu finden sich im Abschnitt  
[`Persistenz von Orbit Datenbanken`](src/docs/markdown/PersistenzVonOrbitDatenbanken.md).

Da ein Totalverlust – z.B. durch globale Internetausfälle oder den gleichzeitigen Ausfall aller Replikatoren – **nie ausgeschlossen** werden kann, erstellt der Replikator regelmäßig **Backups** im JSON-Format.

## 4. Erkennung von Datenbankverlust und Neuinitialisierung

Der Replikator prüft regelmäßig, ob die konfigurierte OrbitDB-Adresse noch eine funktionierende Datenbank liefert. Falls dies nicht der Fall ist, z.B. weil alle gepinnten Daten verschwunden sind:

- erstellt der Replikator automatisch eine **neue OrbitDB**,
- und publiziert deren Adresse über einen **signierten PubSub-Kanal**.

## 5. Kommunikation mit Clients über PubSub

- Clients können beim Start die aktuelle OrbitDB-Adresse über denselben PubSub-Kanal **anfragen**.
- Die Antworten des Replikators sind mit dessen PEM-Schlüssel **signiert**, sodass Clients deren Echtheit mit dem **öffentlich bekannten Schlüssel** prüfen können.
- Dadurch wird sichergestellt, dass nur vertrauenswürdige Replikatoren die Adresse bekannt geben.

## 6. Replikator-Redundanz

Für eine sichere Infrastruktur sollten **mehrere Replikatoren parallel** betrieben werden. Dabei gilt:

- Mindestens **ein Replikator muss zu jeder Zeit online** sein, um Datenverlust zu verhindern.
- Temporäre Ausfälle einzelner Replikatoren, z.B. für Wartungsarbeiten, sind durch die Redundanz problemlos verkraftbar.

## 7. Wiederherstellung nach Datenverlust

Sollte es dennoch zum Verlust einer OrbitDB kommen, wird automatisch eine neue Instanz erstellt. Die Wiederherstellung des letzten gültigen Zustands erfolgt dann wie folgt:

- Ein Mitglied Ihres Betriebsteams spielt ein **aktuelles Backup** von einem der Replikatoren ein.
- Anschließend wird die neue Adresse über den PubSub-Kanal veröffentlicht.



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

