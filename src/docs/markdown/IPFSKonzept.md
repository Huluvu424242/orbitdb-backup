# 🌐 IPFS – Grundlagen und Verhalten im Detail

## 🔍 Was ist IPFS?

IPFS (InterPlanetary File System) ist ein verteiltes, peer-to-peer-Dateisystem, das Inhalte **nicht nach Ort**, sondern nach **Inhalt** adressiert. Es ist vergleichbar mit Git oder BitTorrent – jeder Inhalt bekommt eine **eindeutige Hash-Adresse (CID)**.

## 📌 Grundprinzipien

| Konzept              | Beschreibung |
|----------------------|--------------|
| 📦 **Content Addressing** | Jede Datei bekommt eine eindeutige Adresse basierend auf ihrem Inhalt (CID). |
| 🔁 **Verteilte Speicherung** | Knoten speichern Inhalte lokal. Inhalte werden über das P2P-Netzwerk verteilt, aber nicht automatisch synchronisiert. |
| 📂 **Merkle-DAG Struktur** | Dateien werden als DAG von Blöcken gespeichert. |
| 📌 **Pinning** | Gespeicherte Inhalte können "gepinnt" werden, um vor automatischer Löschung (Garbage Collection) geschützt zu sein. |
| 🧭 **IPNS** | Ermöglicht eine veränderbare Referenz auf eine Datei oder ein Verzeichnis (z. B. für Versionierung). |

## 🧩 Verhalten beim Hinzufügen von Dateien

- Wenn zwei Nutzer **dieselbe Datei** hochladen:
  - Sie erhalten denselben **CID** (weil der Inhalt gleich ist).
  - Jeder Node speichert die Datei **lokal vollständig**, ohne zu wissen, dass andere sie ebenfalls gespeichert haben.

- Es findet **keine zentrale Koordination** oder deduplizierte Speicherung auf Netzwerkebene statt.

## 📡 Dateiabruf & Blockverteilung

- Beim Abrufen einer Datei (`ipfs get <CID>`) können einzelne Blöcke von **verschiedenen Peers** geladen werden.
- Die Blöcke werden nach dem Abruf **lokal vollständig** gespeichert.
- Eine Datei liegt **immer vollständig auf einem Node**, wenn sie einmal geladen wurde.

## 🔐 Verhalten bei Blockverlust

- Wenn ein Block **lokal gelöscht** wird:
  - Die Datei ist nicht direkt „kaputt“.
  - Beim nächsten Zugriff versucht IPFS, den fehlenden Block **automatisch aus dem Netzwerk zu holen** (Bitswap).
  - Ist der Block **nirgendwo verfügbar**, gilt die Datei als **verloren**.

## 🧠 Was ist ein DAG?

Ein **DAG (Directed Acyclic Graph)** ist:

- Ein Graph mit gerichteten Kanten (von Eltern zu Kindern).
- Ohne Zyklen – ein Knoten kann nicht auf sich selbst zurückverweisen.
- In IPFS: Eine Datei ist ein DAG, bei dem die Blätter Datenblöcke und die Knoten Verweise (Hashes) sind.

```
           [Root Node]
              |
        -----------------
       |        |        |
   [Block A] [Block B] [Block C]
```

- Jeder CID ist ein Hash über die DAG-Struktur und damit eindeutig.

## ✍️ Verhalten bei Dateiänderung

- Dateien sind **unveränderlich**. Jede Änderung → **neuer CID**
- **Nur geänderte Blöcke** werden neu gespeichert.
- Gemeinsame Blöcke (unchanged) werden **wiederverwendet** → speichereffizient.

## 🔁 Beispielverlauf

```bash
# Originaldatei
echo "Hallo IPFS!" > hallo.txt
ipfs add hallo.txt
# → QmABC...

# Änderung
echo "Hallo liebe Welt!" > hallo.txt
ipfs add hallo.txt
# → QmXYZ...

# Beide Dateien existieren parallel, teilen sich evtl. Blöcke
```

## ✅ Fazit

| Eigenschaft                 | Verhalten in IPFS |
|----------------------------|-------------------|
| Dateien sind unveränderlich | ✅ Ja |
| Gleicher Inhalt = gleicher CID | ✅ Ja |
| Deduplication auf Blockebene | ✅ Ja |
| Blöcke werden beim Abruf zusammengesucht | ✅ Ja, von verschiedenen Peers möglich |
| Lokale Reparatur bei Blockverlust | ✅ Ja, wenn Netz sie liefern kann |
| Teilweise verteilte Speicherung einer Datei | ❌ Nein – Datei liegt lokal immer vollständig |
