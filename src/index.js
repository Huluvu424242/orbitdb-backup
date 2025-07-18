// src/index.js
import {createOrbitDB, OrbitDBAccessController} from '@orbitdb/core'
import process from 'node:process'
import {createHelia} from "helia";
import {createLibp2p} from "libp2p";
import {LevelBlockstore} from "blockstore-level";

import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import * as fs from "node:fs";
import {mdns} from "@libp2p/mdns";
import {bitswap} from "@helia/block-brokers";


const jetzt = new Date();
console.log('Serverstart: %s', jetzt.toLocaleString('de-DE'));

console.log("ARGS: %s",process.argv);

// ENV Variablen laden
const DEBUG = !!process.env.DEBUG || process.argv.includes('--debug');
const isDebugActive = DEBUG;
console.log(`--debug: ${isDebugActive}`);
const IPFS_API_URL = process.env.IPFS_API_URL || process.argv.find(arg => arg.startsWith('http')) || 'http://localhost:5001'
const ipfsApiUrl = IPFS_API_URL;
console.log(`IPFS_API_URL: ${ipfsApiUrl}`);
// const LIBP2P_PORT = 1620

const dbArg = process.argv.find(arg => arg.includes('/orbitdb/'));
const orbitdbPath = dbArg? dbArg.substring(dbArg.indexOf('/orbitdb/')): null;
const ORBITDB_ADDR = process.env.ORBITDB_ADDR || process.argv.find(arg => arg.startsWith('/orbitdb/')) || orbitdbPath || "appstore-db";
const orbitDBAddress = ORBITDB_ADDR;
console.log(`ORBITDB_ADDR: ${orbitDBAddress}`);

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

// create a random directory to avoid OrbitDB conflicts.
const dataDir = (fs.existsSync('/data') && fs.lstatSync('/data').isDirectory()) ? '/data' :'./data';
console.log('Verzeichnis DATA %s', dataDir);
const randDir = (Math.random() + 1).toString(36).substring(2)
console.log('Verzeichnis Session: %s', randDir);

const blockstore = new LevelBlockstore(`${dataDir}/ipfs/${randDir}/blocks`)
const libp2p = await createLibp2p(Libp2pOptions);

// libp2p.addEventListener('peer:discovery', (event) => {
//     console.log('Discovered new peer:', event.detail.id.toString())
//     libp2p.dial(event.detail.multiaddrs)
// })

// libp2p.addEventListener('peer:discovery', async (event) => {
//     const peerId = event.detail.id.toString();
//     const addresses = event.detail.multiaddrs;
//
//     console.log('Discovered new peer:', peerId);
//     console.log('Multiaddrs:', addresses.map(a => a.toString()));
//
//     // Alle potenziell dialbaren Adressen filtern
//     const dialables = addresses.filter(addr =>
//         addr.toString().includes('/tcp') || addr.toString().includes('/ws')
//     );
//
//     if (dialables.length === 0) {
//         console.warn('Keine gültige dialbare Adresse gefunden für', peerId);
//         return;
//     }
//
//     for (const addr of dialables) {
//         try {
//             console.log('Versuche Dial zu', addr.toString());
//             await libp2p.dial(addr);
//             console.log('✅ Erfolgreich verbunden mit', addr.toString());
//             return; // bei Erfolg: abbrechen
//         } catch (err) {
//             console.warn('❌ Dial fehlgeschlagen für', addr.toString(), '\nGrund:', err.message);
//         }
//     }
//
//     console.error('❌ Konnte keinen der dialbaren Multiaddrs erreichen für', peerId);
// });



const helia = await createHelia({libp2p,blockstore, blockBrokers: [bitswap()] });
const orbitdb = await createOrbitDB({ipfs: helia, id: 'replicator0', directory: `${dataDir}/orbitdb/${randDir}`});

console.log("ORBIT DB %s", JSON.stringify(orbitdb.identity));



async function createOrOpenDB() {
    try {
        const database = await orbitdb.open(orbitDBAddress)
        await database.load() // lädt Einträge, wirft Fehler wenn DB nicht existiert
        console.log("Datenbank existiert bereits, wurde geöffnet.")
        return database;
    } catch (err) {
        console.log("Datenbank existiert nicht, wird neu angelegt.")
        const database = await  orbitdb.open("appdatastore-db", {
            type: 'events',
            create: true,
            accessController: OrbitDBAccessController({write: ['*']}),
            AccessController: OrbitDBAccessController({write: ['*']})
        });
        console.log('Typ von database:', typeof database);
        // console.log('Keys:', Object.keys(database));console.log('Typ von database:', typeof database);
        // console.log('Keys:', Object.keys(database));
        return database;
    }
}

const db = await createOrOpenDB();


console.log('libp2p address', '(copy one of these addresses then dial into this node from the second node)', orbitdb.ipfs.libp2p.getMultiaddrs())
console.log('DB-Adresse:', db.address.toString());
// setInterval(async () => {
//     console.log("Replicator Schreibversuch");
//     await db.add(`Hello from Replicator at ${new Date().toISOString()}`);
// },50000);

// for await (const res of db.iterator()) {
//     console.log(res);
// }

// const ipfs = createIpfsHttpClient({url: ipfsApiUrl});
// try {
//     // einfacher Ping über HTTP-API
//     const version = await ipfs.version();
//     console.log("Verbunden mit IPFS:", version.version);
// } catch (err) {
//     console.error("⚠️ IPFS-Verbindung fehlgeschlagen:", err.message);
// }
const pinEntry = async cid => {
    try {
        await helia.pins.add(cid);
        console.log('📌 Gepinnt:', cid);
    } catch (err) {
        console.warn('⚠️ Pin fehlgeschlagen:', err.message);
    }
}



db.events.on('replicated', async () => {
    console.log('♻️ Replikation erkannt')
    for await (const item of db.iterator({limit: -1})) {
        const cid = item?.cid?.toString() || item?.hash;
        if (!cid) continue;
        console.log('📥 Neuer replizierter Eintrag:', cid);
        await pinEntry(cid);
    }
});

db.events.on('update', async entry => {
    const cid = entry?.cid || entry?.hash;
    if (!cid) return;
    console.log('📝 Lokaler Update-Eintrag:', cid);
    await pinEntry(cid);
});

await db.add("Hallo");
console.log("DB ALL: %s", JSON.stringify(await db.all()) );
console.log("DB Root: %s", JSON.stringify(db.address.root) );


const manifestCid = db.address.root
console.log("Manifest CID:", manifestCid)
await helia.pins.add(manifestCid)
console.log('Manifest wurde gepinnt:', manifestCid)

// Beenden unter Windows
process.on('SIGINT', async () => {
    console.log("SIGINT empfangen");
    shutdown();
})

// Beenden unter unraid
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