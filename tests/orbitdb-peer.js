import {createLibp2p} from 'libp2p'
import {createHelia} from 'helia'
import {createOrbitDB} from '@orbitdb/core'
import {LevelBlockstore} from 'blockstore-level'
import {multiaddr} from '@multiformats/multiaddr'
import {mdns} from "@libp2p/mdns";
import {tcp} from "@libp2p/tcp";
import {noise} from "@libp2p/noise";
import {yamux} from "@chainsafe/libp2p-yamux";
import {identify} from "@libp2p/identify";
import {gossipsub} from "@chainsafe/libp2p-gossipsub";


const MULICAST_ADDR = '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ';
const ORBITDB_ADDR = '/orbitdb/zdpuAmCwQUhQ3Eu3swTQ9EbdEsqF5cu1ZCuR3XvoFA7B2sVtP';


export const Libp2pOptions = {
    peerDiscovery: [
        mdns()
    ],
    addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
        tcp()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
        identify: identify(),
        pubsub: gossipsub({allowPublishToZeroTopicPeers: true})
    }
}


const main = async () => {
    // create a random directory to avoid OrbitDB conflicts.
    let randDir = (Math.random() + 1).toString(36).substring(2)

    const blockstore = new LevelBlockstore(`./${randDir}/ipfs/blocks`)
    const libp2p = await createLibp2p(Libp2pOptions)
    const ipfs = await createHelia({libp2p, blockstore})

    const orbitdb = await createOrbitDB({ipfs, directory: `./${randDir}/orbitdb`})

    await orbitdb.ipfs.libp2p.dial(multiaddr(MULICAST_ADDR));
    console.log('opening db', ORBITDB_ADDR);
    const db = await orbitdb.open(ORBITDB_ADDR);

    db.events.on('update', async (entry) => {
        // what has been updated.
        console.log('update', entry.payload.value)
    })

    if (ORBITDB_ADDR) {
        await db.add('hello from second peer')
        await db.add('hello again from second peer')
    } else {
        // write some records
        await db.add('hello from first peer')
        await db.add('hello again from first peer')
    }
    // Clean up when stopping this app using ctrl+c
    process.on('SIGINT', async () => {
        // print the final state of the db.
        console.log((await db.all()).map(e => e.value))
        // Close your db and stop OrbitDB and IPFS.
        await db.close()
        await orbitdb.stop()
        await ipfs.stop()

        process.exit()
    })
}

main()