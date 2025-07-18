import {createLibp2p} from 'libp2p'
import {createHelia} from 'helia'
import {createOrbitDB} from '@orbitdb/core'
import {LevelBlockstore} from 'blockstore-level'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import {mdns} from "@libp2p/mdns";
import * as fs from "node:fs";
import process from "node:process";
import {bitswap} from "@helia/block-brokers";

console.log("ARGS: %s",process.argv);

const dbArg = process.argv.find(arg => arg.includes('/orbitdb/'));
const orbitdbPath = dbArg? dbArg.substring(dbArg.indexOf('/orbitdb/')): null;
const ORBITDB_ADDR = process.env.ORBITDB_ADDR || process.argv.find(arg => arg.startsWith('/orbitdb/')) || orbitdbPath || "appstore-db";

export const Libp2pOptions = {
    peerDiscovery: [
        mdns()
    ],
    addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0/ws']
    },
    transports: [
        webSockets({
            filter: all
        })
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
        denyDialMultiaddr: () => false
    },
    services: {
        identify: identify(),
        pubsub: gossipsub({allowPublishToZeroTopicPeers: true})
    }
}


const main = async () => {
    // create a random directory to avoid OrbitDB conflicts.
    const dataDir = (fs.existsSync('/data') && fs.lstatSync('/data').isDirectory()) ? '/data' :'./data';
    console.log('Verzeichnis DATA %s', dataDir);
    const randDir = (Math.random() + 1).toString(36).substring(2)
    console.log('Verzeichnis Session: %s', randDir);


    const blockstore = new LevelBlockstore(`${dataDir}/ipfs/${randDir}/blocks`)
    const libp2p = await createLibp2p(Libp2pOptions)
    const ipfs = await createHelia({libp2p, blockstore, blockBrokers: [bitswap()]})

    const orbitdb = await createOrbitDB({ipfs, directory: `${dataDir}/orbitdb/${randDir}`})

    console.log('opening db', ORBITDB_ADDR);
    const db = await orbitdb.open(ORBITDB_ADDR);

    db.events.on('update', async (entry) => {
        // what has been updated.
        console.log('update', entry.payload.value)
    })

    const manifestCid = db.address.root
    console.log("Manifest CID:", manifestCid)


    setInterval(async () => {
        console.log("Peer Schreibversuch");
        await db.add(`Hello from Peer1 at ${new Date().toISOString()}`);
    },5000);

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