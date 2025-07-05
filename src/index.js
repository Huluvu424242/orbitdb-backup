import { createOrbitDB, OrbitDBAccessController } from '@orbitdb/core'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelBlockstore } from 'blockstore-level'
import { create as createHttpClient } from 'ipfs-http-client'
import process from 'node:process'

async function createLocalIpfs(id) {
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

    const blockstore = new LevelBlockstore(`./ipfs/${id}`)
    const libp2p = await createLibp2p(libp2pOptions)
    const ipfs = await createHelia({ libp2p, blockstore })
    return ipfs
}

async function createIpfsInstance() {
    const remoteUrlArg = process.argv.find(arg => arg.startsWith('--remote-ipfs='))
    const id = process.argv.length > 2 ? 2 : 1

    if (remoteUrlArg) {
        const url = remoteUrlArg.split('=')[1]
        console.log(`✨ Remote IPFS-Modus: ${url}`)
        try {
            const ipfs = createHttpClient({ url })
            await ipfs.id()
            return { ipfs, id, remote: true }
        } catch (err) {
            console.error('❌ Verbindung zu Remote-IPFS fehlgeschlagen:', err.message)
            process.exit(1)
        }
    }

    console.log('✨ Lokaler IPFS-Modus')
    const ipfs = await createLocalIpfs(id)
    return { ipfs, id, remote: false }
}

const { ipfs, id, remote } = await createIpfsInstance()
const orbitdb = await createOrbitDB({ ipfs, id: `nodejs-${id}`, directory: `./orbitdb/${id}` })

let db
if (remote) {
    const remoteDBAddress = process.argv.pop()
    db = await orbitdb.open(remoteDBAddress)
    await db.add(`hello world from peer ${id}`)

    for await (const res of db.iterator()) {
        console.log(res)
    }
} else {
    db = await orbitdb.open('nodejs', { AccessController: OrbitDBAccessController({ write: ['*'] }) })

    console.log('DB-Adresse:', db.address.toString())

    const pinEntry = async cid => {
        try {
            await ipfs.pins.add(cid)
            console.log('📌 Gepinnt:', cid)
        } catch (err) {
            console.warn('⚠️ Pin fehlgeschlagen:', err.message)
        }
    }

    db.events.on('update', async entry => {
        const cid = entry?.cid || entry?.hash
        if (!cid) return
        console.log('🔄 Neuer Eintrag:', cid)
        await pinEntry(cid)
    })
}

process.on('SIGINT', async () => {
    console.log("Exiting...")
    await db.close()
    await orbitdb.stop()
    await ipfs.stop()
    process.exit(0)
})
