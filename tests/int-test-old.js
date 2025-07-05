import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelBlockstore } from 'blockstore-level'

/**
 * Beispiel-Aufruf:
 * node put-entry.js /orbitdb/zdpuB24jCbRT7fPJSkZ1crpWL9Bz78s1TPdPSZNazWd8e7wqg
 */

const libp2pOptions = {
    peerDiscovery: [mdns()],
    addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
        identify: identify(),
        pubsub: gossipsub({ emitSelf: true })
    }
}

const id = 'client' // oder dynamisch erzeugen
const blockstore = new LevelBlockstore(`./ipfs/${id}`)
const libp2p = await createLibp2p(libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })
const orbitdb = await createOrbitDB({ ipfs, id: `client`, directory: `./orbitdb/${id}` })

// const remoteDBAddress = process.argv[2]
const remoteDBAddress = '/orbitdb/zdpuAuNZTDiZHy2xpFGeVV5r5GELDxAkAdATeT5bATuGKSsER'

if (!remoteDBAddress || !remoteDBAddress.startsWith('/orbitdb/')) {
    console.error('❌ Bitte eine gültige OrbitDB-Adresse angeben (z. B. /orbitdb/zdpuXYZ...)')
    process.exit(1)
}

const db = await orbitdb.open(remoteDBAddress)

const now = new Date().toISOString()

console.log(`📤 Sende Testeintrag an DB ${db.address.toString()}...`)
await db.add({ id: 'replicator-test', time: now, message: '🛰️ Eintrag vom externen Test-Client' })

console.log('✅ Testeintrag gespeichert')

console.log('📋 Aktuelle Inhalte:')
for await (const item of db.iterator()) {
    console.log('•', item)
}

// Beende sauber bei STRG+C
process.on('SIGINT', async () => {
    console.log("⏹️ Schließe…")
    await db.close()
    await orbitdb.stop()
    await ipfs.stop()
    process.exit(0)
})
