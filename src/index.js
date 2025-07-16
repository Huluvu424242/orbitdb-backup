// src/index.js
import {createOrbitDB, OrbitDBAccessController} from '@orbitdb/core'
import process from 'node:process'
import {libp2pOptionsRemote} from "./remote.js";
import {libp2pOptionsLocal} from "./local.js";
import {create as createIpfsHttpClient} from 'ipfs-http-client';
import {createHelia} from "helia";
import {createLibp2p} from "libp2p";
import {gossipsub} from "@chainsafe/libp2p-gossipsub";
import {identify} from "@libp2p/identify";
import {yamux} from "@chainsafe/libp2p-yamux";
import {noise} from "@libp2p/noise";
import {tcp} from "@libp2p/tcp";
import {mdns} from "@libp2p/mdns";
import {LevelBlockstore} from "blockstore-level";


const initMode = true;

const jetzt = new Date();
console.log('Serverstart: %s', jetzt.toLocaleString('de-DE'));


// ENV Variablen laden
const DEBUG = !!process.env.DEBUG || process.argv.includes('--debug');
const isDebugActive = DEBUG;
console.log(`--debug: ${isDebugActive}`);
const IPFS_API_URL = process.env.IPFS_API_URL || process.argv.find(arg => arg.startsWith('http')) || 'http://localhost:5001'
const ipfsApiUrl = IPFS_API_URL;
console.log(`IPFS_API_URL: ${ipfsApiUrl}`);
// const PORT = process.env.PORT || 3000

const ORBITDB_ADDR = process.env.ORBITDB_ADDR || process.argv.find(arg => arg.startsWith('/orbitdb/')) || "appstore-db";
const orbitDBAddress = ORBITDB_ADDR;
console.log(`ORBITDB_ADDR: ${orbitDBAddress}`);
console.log('RemoteAdresse: %s', orbitDBAddress);


// async function createIpfsInstance(ipfsApiUrl) {
//     const ipfs = ipfsApiUrl ? await createRemoteIpfs(isDebugActive,ipfsApiUrl) : await createLocalIpfs(isDebugActive);
//     return {ipfs,};
// }
//
// const {ipfs, remote} = await createIpfsInstance(ipfsApiUrl);

const remote = !!ipfsApiUrl;
console.log('remote: %s', remote);

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

// create a random directory to avoid OrbitDB conflicts.
let randDir = (Math.random() + 1).toString(36).substring(2)

const blockstore = new LevelBlockstore(`/data/ipfs/${randDir}/blocks`)
const libp2p = await createLibp2p(Libp2pOptions);
const helia = await createHelia({libp2p,blockstore});
const orbitdb = await createOrbitDB({ipfs: helia, id: 'replicator0', directory: `/data/orbitdb/${randDir}`});

console.log("ORBIT DB %s", orbitdb);


const db = await orbitdb.open(orbitDBAddress, {
    type: 'events',
    ...(initMode & {create: true, AccessController: OrbitDBAccessController({write: ['*']})})
});


console.log('libp2p address', '(copy one of these addresses then dial into this node from the second node)', orbitdb.ipfs.libp2p.getMultiaddrs())
console.log('DB-Adresse:', db.address.toString());

for await (const res of db.iterator()) {
    console.log(res);
}

const ipfs = createIpfsHttpClient({url: ipfsApiUrl});
try {
    // einfacher Ping über HTTP-API
    const version = await ipfs.version();
    console.log("Verbunden mit IPFS:", version.version);
} catch (err) {
    console.error("⚠️ IPFS-Verbindung fehlgeschlagen:", err.message);
}
const pinEntry = async cid => {
    try {
        await ipfs.pins.add(cid);
        console.log('📌 Gepinnt:', cid);
    } catch (err) {
        console.warn('⚠️ Pin fehlgeschlagen:', err.message);
    }
}


//
// db.events.on('replicated', async () => {
//     console.log('♻️ Replikation erkannt')
//     for await (const item of db.iterator({limit: -1})) {
//         const cid = item?.cid?.toString() || item?.hash;
//         if (!cid) continue;
//         console.log('📥 Neuer replizierter Eintrag:', cid);
//         await pinEntry(cid);
//     }
// });

db.events.on('update', async entry => {
    const cid = entry?.cid || entry?.hash;
    if (!cid) return;
    console.log('📝 Lokaler Update-Eintrag:', cid);
    await pinEntry(cid);
});


process.on('SIGINT', async () => {
    console.log("SIGINT empfangen");
    shutdown();
})


process.on('SIGTERM', async () => {
    console.log("SIGTERM empfangen");
    shutdown();
})

async function shutdown() {
    console.log("Exiting...");
    await db.close();
    // OrbitDB schließen, ggf. IPFS-Knoten herunterfahren
    // Beispiel:
    if (orbitdb) {
        orbitdb.stop().then(() => {
            console.log('OrbitDB gestoppt.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
}