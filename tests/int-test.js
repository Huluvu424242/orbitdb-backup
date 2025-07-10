// tests/int-test.js
import {createOrbitDB} from '@orbitdb/core'
import process from 'node:process'
import {createLocalIpfs} from "../src/local.js";

const debug = process.argv.includes('--debug');
const orbitDBAddress = '/orbitdb/zdpuAuNZTDiZHy2xpFGeVV5r5GELDxAkAdATeT5bATuGKSsER';

if (!orbitDBAddress) {
    console.error('❌ Bitte gültige OrbitDB-Adresse angeben, z.B. /orbitdb/zdpuXYZ...');
    process.exit(1);
}



const ipfs = await createLocalIpfs(true);
const orbitdb = await createOrbitDB({ipfs, id: 'replicator1', directory: `./orbitdb/replicator1`});
console.log("ORBIT DB %s", orbitdb);


console.log('RemoteAdresse: %s ', orbitDBAddress);

const db = await orbitdb.open(orbitDBAddress);
// const db = await orbitdb.open(remoteDBAddress,{
// type: 'log',
// create: false,
// ...( !remote && { AccessController: OrbitDBAccessController({ write: ['*'] }) } )
// });
console.log("ORBIT DB Adresse: %s", db.address.toString());

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
