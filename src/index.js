/**
 * A simple nodejs script which launches an orbitdb instance and creates a db
 * with a single record.
 *
 * To run from the terminal:
 *
 * ```bash
 * node index.js
 * ```
 * or
 * ```bash
 * node index.js /orbitdb/<hash>
 * ```
 */
import { createHelia } from 'helia'
import { createOrbitDB, OrbitDBAccessController } from '@orbitdb/core'
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelBlockstore } from 'blockstore-level'

const libp2pOptions = {
    peerDiscovery: [
        mdns()
    ],
    addresses: {
        listen: [
            '/ip4/0.0.0.0/tcp/0'
        ]
    },
    transports: [
        tcp()
    ],
    connectionEncryption: [
        noise()
    ],
    streamMuxers: [
        yamux()
    ],
    services: {
        identify: identify(),
        pubsub: gossipsub({ emitSelf: true })
    }
}

const id = process.argv.length > 2 ? 2 : 1

const blockstore = new LevelBlockstore(`./ipfs/${id}`)

const libp2p = await createLibp2p(libp2pOptions)

const ipfs = await createHelia({ libp2p, blockstore })

const orbitdb = await createOrbitDB({ ipfs, id: `nodejs-${id}`, directory: `./orbitdb/${id}` })

let db

if (process.argv.length > 2) {
    const remoteDBAddress = process.argv.pop()

    db = await orbitdb.open(remoteDBAddress)

    await db.add(`hello world from peer ${id}`)

    for await (const res of db.iterator()) {
        console.log(res)
    }
} else {
    db = await orbitdb.open('nodejs', { AccessController: OrbitDBAccessController({ write: ['*'] }) })

    console.log(db.address)

    const pinEntry = async cid => {
        try {
            await ipfs.pin.add(cid)
            console.log('📌 Gepinnt:', cid)
        } catch (err) {
            console.warn('⚠️ Pin fehlgeschlagen:', err.message)
        }
    }

    // Jeden neu replizierten Eintrag sofort pinnen
    db.events.on('replicate.progress', async (_address, hash, entry) => {
        const cid = entry?.cid || entry?.hash || hash
        console.log('🔄 Neuer Eintrag:', cid)
        await pinEntry(cid)
    })
}

process.on('SIGINT', async () => {
    console.log("exiting...")

    await db.close()
    await orbitdb.stop()
    await ipfs.stop()
    process.exit(0)
})