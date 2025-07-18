import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { createLibp2p } from 'libp2p'
import { noise } from '@libp2p/noise'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify } from '@libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'
import { tcp } from '@libp2p/tcp'
import {bootstrap} from "@libp2p/bootstrap";

const ORBITDB_ADDRESS = '/orbitdb/zdpuAprpEXsiJVqHaKLxEV8mq5iAEHVFcE2R8peSRzBzHqYth/appstorage';

const createNode = async () => {

    const libp2p = await createLibp2p({
        transports: [webSockets(), tcp()], // TCP erlaubt in Node.js
        streamMuxers: [yamux(), mplex()],
        connectionEncryption: [noise()],
        pubsub: gossipsub(),
        dht: kadDHT(),
        peerDiscovery: [
            bootstrap({
                list: [
                    '/ip4/219.89.34.152/tcp/63116/p2p/12D3KooWDZ5ouwFjYwC4F6bQQx8J4JFGHa6mrRGNybVUWxhmiDed'
                ]
            })
        ],
        identify: identify()
    })


    return await createHelia({ libp2p })
}

const main = async () => {
    const helia = await createNode()
    const orbitdb = await createOrbitDB({ ipfs: helia })

    // Neue DB erzeugen oder öffnen
    const db = await orbitdb.open(ORBITDB_ADDRESS);


    // // Write-Ereignisse anhören
    // db.events.on('write', (address, entry, heads) => {
    //     console.log(`✏️ Neue Eintragung: ${entry.payload.value}`)
    // })

    await db.load()

    // Wert schreiben
    await db.add({ ts: Date.now(), value: 'Hallo OrbitDB mit Helia!' })

    // Alle Werte lesen
    const all = db.iterator({ limit: -1 }).collect()
    console.log('\n📚 Inhalt der Datenbank:')
    all.forEach(e => console.log('•', e.payload.value))

    // Optional: Helia sauber beenden
    // await helia.stop()
}

main().catch(console.error)
