// index.js
import express from 'express'
import { create } from 'ipfs-http-client'
import { createOrbitDB } from 'orbit-db'
import path from 'path'
import { fileURLToPath } from 'url'

// __dirname ersetzen (ESM-kompatibel)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ENV Variablen laden
const ORBITDB_ADDR = process.env.ORBITDB_ADDR
const IPFS_API_URL = process.env.IPFS_API_URL || 'http://localhost:5001'
const PORT = process.env.PORT || 3000

if (!ORBITDB_ADDR) {
    console.error('Fehlende Umgebungsvariable: ORBITDB_ADDR')
    process.exit(1)
}

console.log(`Starte OrbitDB-Backup für ${ORBITDB_ADDR}`)
console.log(`Verbinde zu IPFS unter ${IPFS_API_URL}`)

const ipfs = create({ url: IPFS_API_URL })
const orbitdb = await createOrbitDB({ ipfs })
const db = await orbitdb.open(ORBITDB_ADDR, { sync: true })

// PIN-Funktion: alle bekannten Einträge pinnen
async function pinAllEntries() {
    const entries = db.iterator({ limit: -1 }).collect()
    console.log(`Initial-Backup: ${entries.length} Einträge gefunden`)
    for (const entry of entries) {
        const cid = entry.cid || entry.hash
        try {
            console.log(`Pinne CID: ${cid}`)
            await ipfs.pin.add(cid)
        } catch (e) {
            console.warn(`Fehler beim Pinnen: ${cid} – ${e.message}`)
        }
    }
}

// Event Listener für neue Einträge (automatisches Pinning)
db.events.on('replicated', async () => {
    const latest = db.iterator({ limit: 1 }).collect()[0]
    if (latest) {
        const cid = latest.cid || latest.hash
        console.log(`Replizierter Eintrag erkannt: ${cid}`)
        try {
            await ipfs.pin.add(cid)
        } catch (e) {
            console.warn(`Fehler beim automatischen Pinnen: ${e.message}`)
        }
    }
})

// Webserver mit Button zum Initial-Backup
const app = express()
app.use(express.static(path.join(__dirname, 'web')))

app.post('/backup', async (req, res) => {
    console.log('Initial-Backup manuell über WebUI ausgelöst')
    await pinAllEntries()
    res.send('Initial-Backup abgeschlossen')
})

app.listen(PORT, () => {
    console.log(`WebUI verfügbar unter http://localhost:${PORT}`)
})
