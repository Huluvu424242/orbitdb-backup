import { createHelia } from 'helia'
import {createOrbitDB} from '@orbitdb/core'
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'
import { mdns } from '@libp2p/mdns'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelBlockstore } from 'blockstore-level'
import process from 'node:process'

const debug = process.argv.includes('--debug');
// const remoteDBAddress = '/orbitdb/zdpuB24jCbRT7fPJSkZ1crpWL9Bz78s1TPdPSZNazWd8e7wqg';
const remoteDBAddress = '/orbitdb/zdpuAuNZTDiZHy2xpFGeVV5r5GELDxAkAdATeT5bATuGKSsER';

if (!remoteDBAddress) {
    console.error('❌ Bitte gültige OrbitDB-Adresse angeben, z.B. /orbitdb/zdpuXYZ...');
    process.exit(1);
}

const libp2pOptions = {
    peerDiscovery: [mdns()],
    addresses: { listen: ['/ip4/0.0.0.0/tcp/0'] },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
        identify: identify(),
        pubsub: gossipsub({ emitSelf: true })
    }
}

const blockstore = new LevelBlockstore(`./ipfs/replicator1`)
const libp2p = await createLibp2p(libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })


const orbitdb = await createOrbitDB({ ipfs, id: 'replicator1', directory: `./orbitdb/replicator1`
    // , databases: [
    //     log(),
    //    //docstore()
    // ]
});
 console.log("ORBIT DB %s",orbitdb);

if (debug) {
    setInterval(() => {
        console.log('🌐 Client Multiaddrs:');
        libp2p.getMultiaddrs().forEach(addr => console.log('   ', addr.toString()));
    }, 7000);
    setInterval(() => {
        const peers = libp2p.getPeers();
        console.log('🤝 Aktive Peers:', peers.length);
        for (const peer of peers) {
            console.log(' -', peer.id.toString());
        }
    }, 5000);
}

console.log('RemoteAdresse: %s ', remoteDBAddress );

const db = await orbitdb.open(remoteDBAddress);
// const db = await orbitdb.open(remoteDBAddress,{
    // type: 'log',
    // create: false,
// ...( !remote && { AccessController: OrbitDBAccessController({ write: ['*'] }) } )
// });
console.log("ORBIT DB Adresse: %s",db.address.toString());

const now = new Date().toISOString();
const entry = {
    id: 'replicator-test',
    time: now,
    message: '🛰️ Eintrag vom externen Test-Client'
};

console.log(`📤 Schreibe Testeintrag in ${db.address.toString()}...`);
await db.add(entry);
console.log('✅ Eintrag gespeichert.');

console.log('📋 Aktuelle Inhalte:');
for await (const item of db.iterator()) {
    console.log('•', item);
}

// Clean shutdown
process.on('SIGINT', async () => {
    console.log("⏹️ Schließe…")
    await db.close()
    await orbitdb.stop()
    await ipfs.stop()
    process.exit(0)
});
