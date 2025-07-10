
# IPFS-Kubo Node - Ports, Funktionen & Verwendung

Der IPFS Kubo Node Container realisiert einen IPFS Node welcher mit dem IPFS verbunden ist und lokal Daten auf einem unraid share speichern kann. 
Nachfoldend werden dokumentiert die Ports, die von einem IPFS-Kubo-Node bereitgestellt werden, inklusive ihrer Funktionen und typischen Anwendungsfälle.

---

## 🔌 Übersicht

| Port | Protokoll | Zweck | Wer nutzt das? | Zugriffstyp |
|------|-----------|-------|----------------|-------------|
| **5001** | HTTP (API) | **Kubo HTTP API** | Apps, Skripte, WebUIs | 📥 Lesen + 📤 Schreiben |
| **8080** | HTTP (Gateway) | **Public Read-Only Gateway** | Browser, andere IPFS-Knoten | 📥 Nur Lesen |
| **4001** | libp2p (Swarm) | **Peer-to-Peer Netzwerkkommunikation (Swarm)** | Andere IPFS-Knoten | 📡 bidirektional (Transport) |

---

## 🟦 Port 5001 – API (HTTP-RPC)

- **Funktion:** Hauptschnittstelle für programmatischen Zugriff (Dateien hinzufügen, lesen, pinnen etc.)
- **Protokoll:** HTTP POST-basierte Schnittstelle (`/api/v0/...`)
- **Beispiele:**
  - `POST /api/v0/add`
  - `POST /api/v0/cat?arg=<CID>`
  - `POST /api/v0/pin/add?arg=<CID>`
- **Typische Nutzung:** `ipfs-http-client`, eigene WebApps, OrbitDB, WebUI
- **Zugriff:** Nur lokal freigeben oder gesichert per Reverse Proxy

---

## 🟨 Port 8080 – Gateway (HTTP)

- **Funktion:** Lesezugriff auf IPFS-Inhalte per HTTP
- **Beispiele:**
  - `GET /ipfs/Qm...` → Dateiinhalt
  - `GET /ipns/<PeerID>` → IPNS-gebundene Ressourcen
- **Typische Nutzung:** Browser, `curl`, Webseiten
- **Zugriff:** Kann öffentlich sein, da nur Lesezugriff

---

## 🟩 Port 4001 – Swarm (libp2p)

- **Funktion:** Netzwerkport für P2P-Kommunikation zwischen IPFS-Knoten
- **Protokolle:** libp2p, QUIC, TCP, WebRTC
- **Nutzung:** Austausch von Blöcken, DHT-Verbindungen
- **Zugriff:** Peer-to-Peer, erfordert evtl. NAT-Traversal

---

## 🔐 Sicherheitsempfehlung

| Port | Risiko bei öffentlicher Freigabe | Empfehlung |
|------|----------------------------------|------------|
| 5001 | Hoch (API mit Schreibzugriff)   | Nur lokal oder mit Authentifizierung |
| 8080 | Niedrig (nur lesend)            | Unkritisch bei statischen Inhalten   |
| 4001 | Mittel (Teil des P2P-Netzes)     | Nur falls gewünscht aktiv belassen   |

---

## 🧩 Zusammenfassung

- 🛠️ **5001 = Fernbedienung (volle Kontrolle über Node)**
- 🌍 **8080 = Schaufenster (Browser-Zugriff auf Inhalte)**
- 📡 **4001 = Netzwerkstecker (Kommunikation im IPFS-Netzwerk)**

# IPFS-Kubo auf Homeserver – Zugriff und Sicherheitskonzept

## Ausgangssituation

- IPFS-Kubo läuft als Docker-Container unter Unraid.
- Standardports:
    - API: `5001`
    - Gateway: `8080`
    - Swarm: `4001`
- API lauscht korrekt auf `0.0.0.0`,  die WebUI Anwendung allerdings enthält
explizite Backend Zugriffe über localhost, wodurch ein Browser Remote Zugriff unmöglich wird über diese Anwendung (`Could not connect to the Kubo RPC`), da localhost stets der Hostname des laufenden Browsers ist.
- Zusätzlich werden http Backend Zugriffe verwendet was bei einer über https aufgerufenen Webseite zu  Mixed-Content-Problemen führt.

## Realisierung Remotezugriff

### 🧪 Problemidentifikation
- API reagiert nur auf `POST`, nicht auf `GET` → `curl`-Tests zeigen dies korrekt.
- Mixed-Content wird von modernen Browsern blockiert, wenn `https://webui.ipfs.io` auf `http://...:5001` zugreift.
- API-Verbindung klappt technisch, aber WebUI scheitert am CORS-/Security-Modell.

### ✅ Verwendeter Workaround
- Zusätzlich zur `ipfs-kubo` App wurde `jlesage/firefox` Container-App installiert.
    - Remote steuerbarer Firefox-Browser ohne ein Erfordernis von VNC.
    - Zugriff über Webinterface.
- Da Firefox im selben Unraid-System läuft, kann er `localhost:5001/webui` erfolgreich öffnen.
    - Kein Browser im unsicheren Modus nötig.
    - Kein Offenlegen von API für externe Geräte.
- IPFS-GUI, API und Gateway sind so lokal benutzbar, sicher und isoliert.
- Der IPFS-Replikator kann ebenfalls als Container auf dem selben System laufen und lokal auf API zugreifen.
- Alle Container im **Bridge Mode** betrieben → zusätzliche Sicherheit durch Netzwerkisolation.

## Netzwerkübersicht

| Komponente       | Port     | Zugriff         | Bemerkung                        |
|------------------|----------|------------------|----------------------------------|
| IPFS API         | `5001`   | nur lokal (localhost) | Schreib- und Lesezugriff |
| IPFS Gateway     | `8080`   | LAN             | Nur Lesezugriff (HTTP)          |
| IPFS Swarm       | `4001`   | LAN / IPFS-Netz | Peer-to-Peer Verbindung         |
| Firefox (GUI)    | z. B. `5800` | Webbrowser → Container | Zugriff auf lokale WebUI möglich |

## Vorteile dieser Architektur

- ✅ Keine Mixed-Content-Probleme mehr
- ✅ Kein `--disable-web-security` nötig
- ✅ API bleibt sicher hinter `localhost` abgeschirmt
- ✅ Keine Ports müssen extern geöffnet werden
- ✅ WebUI und alle Funktionen über Homeserver vollständig nutzbar

---

