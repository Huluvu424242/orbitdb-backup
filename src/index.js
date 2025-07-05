// src/index.js
import {createOrbitDB, OrbitDBAccessController} from '@orbitdb/core'
import {createHelia} from 'helia'
import {createLibp2p} from 'libp2p'
import {identify} from '@libp2p/identify'
import {mdns} from '@libp2p/mdns'
import {yamux} from '@chainsafe/libp2p-yamux'
import {tcp} from '@libp2p/tcp'
import {gossipsub} from '@chainsafe/libp2p-gossipsub'
import {noise} from '@chainsafe/libp2p-noise'
import {LevelBlockstore} from 'blockstore-level'
import {create as createHttpClient} from 'ipfs-http-client'
import process from 'node:process'
// import { log } from '@orbitdb/database-log'
// import { docstore } from '@orbitdb/database-docstore'

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
        pubsub: gossipsub({emitSelf: true})
    }
}

function activateDebugLogging(isDebugActive, libp2p) {
    if (isDebugActive) {
        setInterval(() => {
            console.log('🌐 Replicator Multiaddrs:')
            libp2p.getMultiaddrs().forEach(addr => console.log('   ', addr.toString()))
        }, 7000)

        setInterval(() => {
            const peers = libp2p.getPeers()
            console.log('🤝 Aktive Peers:', peers.length)
            for (const peer of peers) {
                console.log(' -', peer.id.toString())
            }
        }, 5000)
    }
}

async function createLocalIpfs() {
    console.log('✨ Lokaler IPFS-Modus');
    const blockstore = new LevelBlockstore(`./ipfs/replicator1`);
    const libp2p = await createLibp2p(libp2pOptions);
    activateDebugLogging(isDebugActive, libp2p);
    return await createHelia({libp2p, blockstore})
}

async function createRemoteIpfs(url) {
    console.log(`✨ Remote IPFS-Modus: ${url}`);
    try {
        const ipfs = createHttpClient({url})
        await ipfs.id()
        return {ipfs,  remote: true}
    } catch (err) {
        console.error('❌ Verbindung zu Remote-IPFS fehlgeschlagen:', err.message)
        process.exit(1)
    }
}

async function createIpfsInstance(remoteUrlArg) {
    const url = remoteUrlArg ? remoteUrlArg.split('=')[1] : null;
    const ipfs = remoteUrlArg ? await createRemoteIpfs(url) : await createLocalIpfs()
    return {ipfs, remote: false}
}


const isDebugActive = process.argv.includes('--debug');
const remoteUrlArg = process.argv.find(arg => arg.startsWith('--remote-ipfs='));


const {ipfs, remote} = await createIpfsInstance(remoteUrlArg);
console.log('remote: %s',remote );
const orbitdb = await createOrbitDB({ipfs, id: 'replicator1', directory: `./orbitdb/replicator1`
    // , databases: [
    //     log(),
    //    //docstore()
    // ]
});

console.log("ORBIT DB %s",orbitdb);


const remoteDBAddress = process.argv.find(arg => arg.startsWith('/orbitdb/'))
    || 'appstorage';
    // || '/orbitdb/zdpuB24jCbRT7fPJSkZ1crpWL9Bz78s1TPdPSZNazWd8e7wqg';
console.log('RemoteAdresse: %s',remoteDBAddress);
const db = await orbitdb.open(remoteDBAddress,{
    // type: 'log',
    // create: !remote,
    ...( !remote && { AccessController: OrbitDBAccessController({ write: ['*'] }) } )
});

console.log('DB-Adresse:', db.address.toString());

for await (const res of db.iterator()) {
    console.log(res);
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
    console.log("Exiting...");
    await db.close();
    await orbitdb.stop();
    await ipfs.stop();
    process.exit(0);
})
