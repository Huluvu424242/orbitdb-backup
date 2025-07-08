# OrbitDB: Sicherheitsaspekte, Datenkonsistenz und Architekturüberlegungen

## 🔍 Ausgangsfrage

Wie kann OrbitDB veränderliche Daten verwalten, obwohl IPFS nur unveränderliche, inhaltadressierte Daten speichert?

### Antwort:
OrbitDB verwendet:
- **Append-only Logs (Merkle-DAG)**,
- **IPNS oder alternative Adressverteilung (z.B. PubSub)**,
- **CRDTs zur Konfliktlösung**,
- Um Veränderungen als neue Zustände zu modellieren, während alte erhalten bleiben.

---

## 🔐 Sicherheit und Multi-Writer-Szenarien

### Problem:
Mehrere Nutzer mit Schreibrechten können Daten anderer Nutzer **überschreiben, löschen oder manipulieren** – absichtlich oder versehentlich.

### OrbitDB-Schutzmechanismen:
- Einträge werden signiert und nur bei gültigem Schlüssel akzeptiert.
- Ein *AccessController* erlaubt Schreiboperationen für definierte Public Keys.
- **Aber**: Keine feingranulare Kontrolle auf Daten- oder Feldebene.

---

## 🧨 Kritisches Beispiel

Ein Nutzer `A` schreibt verschlüsselte Logininformationen für `user1`.  
Ein böswilliger oder sich vertippender Nutzer `B` schreibt versehentlich auch unter `user1`.  
→ Die LWW-Strategie (Last-Write-Wins) wählt `B`’s Eintrag aus.  
→ Nutzer `A` ist ausgeschlossen – potenzieller Denial-of-Service.

---

## 🧠 Erkenntnisse

- OrbitDB ist eher ein **unveränderliches, verteiltes Speicherprotokoll**, keine vollständige DB mit semantischer Autorisierung.
- **CRDTs lösen Konflikte mathematisch korrekt**, aber **nicht semantisch sicher**.
- **Fehlende Kontextprüfung** (z.B. wer darf `user1` ändern?) macht gezielte Angriffe oder versehentliche Datenzerstörung möglich.

---

## ✅ Mögliche Gegenmaßnahmen

1. **Eigene Datenbank pro Nutzer (Multi-DB-Ansatz)**
   - Jeder Nutzer schreibt nur in „seine“ Datenbank.
   - Zugriffskontrolle über OrbitDB AccessController + PubKey.
   - Replikation und Pinning auf anderen Peers möglich.

2. **Custom AccessController**
   - Nur zulässig, wenn `entry.owner === entry.writerPubKey`.

3. **Unverwechselbare IDs**
   - Z.B. IDs aus Public Keys ableiten statt gehashter Usernames.

4. **Verzicht auf zentrales IPNS**
   - Stattdessen: explizite Adressverteilung über PubSub, QR-Codes etc.

---

## 🧭 Fazit

> OrbitDB ist kein klassisches Multi-User-Datenbanksystem.  
> Es bietet robuste, verteilte Speicherung – aber **Zugriffs-, Authentifizierungs- und Datenlogik müssen explizit durch die Anwendung abgesichert werden**.

### Architekturentscheidung:
- Zentral zu Beginn der Systementwicklung zu klären.
- Fehlerhafte Modellierung der Zugriffskontrolle gefährdet die Integrität des Gesamtsystems.

---

## 📄 Mögliche Nächste Schritte 

- Entwicklung eines vollständigen Multi-DB-Konzepts mit Zugriffskontrolle und FIDO2-Integration 