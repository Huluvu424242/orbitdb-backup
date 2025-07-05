// src/index.js
import { createLibp2p } from 'libp2p'
import { createOrbitDB, OrbitDBAccessController } from '@orbitdb/core'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { createHelia } from 'helia'
import { MemoryDatastore } from 'datastore-core/memory'
import { MemoryBlockstore } from 'blockstore-core/memory'

async function createWorkingLocalIpfs() {
    const libp2p = await createLibp2p({
        transports: [tcp(), webSockets()],
        connectionEncryption: [noise()],
        streamMuxers: [mplex()],
        addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0']
        }
    })

    const helia = await createHelia({
        datastore: new MemoryDatastore(),
        blockstore: new MemoryBlockstore(),
        libp2p
    })

    return helia.ipfs
}

async function createIpfsInstance() {
    const remoteUrlArg = process.argv.find(arg => arg.startsWith('--remote-ipfs='))

    if (remoteUrlArg) {
        const url = remoteUrlArg.split('=')[1]
        console.log(`✨ Remote IPFS-Modus: ${url}`)
        try {
            const ipfs = createHttpClient({ url })
            await ipfs.id()
            return ipfs
        } catch (err) {
            console.error('❌ Verbindung zu Remote-IPFS fehlgeschlagen:', err.message)
        }
    }

    console.log('✨ Lokaler IPFS-Modus')
    return await createWorkingLocalIpfs()
}

const ipfs = await createIpfsInstance()
const orbitdb = await createOrbitDB({ ipfs })

const isRemote = process.argv.some(arg => arg.startsWith('--remote-ipfs='))
const db = await orbitdb.open(
    isRemote
        ? '/orbitdb/zdpuB24jCbRT7fPJSkZ1crpWL9Bz78s1TPdPSZNazWd8e7wqg'
        : 'lokale-backup-db',
    {
        type: 'log',
        create: !isRemote,
        sync: true
    }
)

console.log('Warte auf neue Einträge...')

db.events.on('replicated', async () => {
    console.log('Neue Einträge erkannt')
    for await (const entry of db.iterator({ limit: -1 })) {
        const cid = entry.cid.toString()
        console.log(`✔️ CID: ${cid}`)

        try {
            await ipfs.pin.add(entry.cid)
            console.log(`📌 Gepinnt: ${cid}`)
        } catch (err) {
            console.error(`❌ Fehler beim Pinnen: ${cid}`, err.message)
        }
    }
})