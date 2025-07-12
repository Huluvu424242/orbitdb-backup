// src/index.js
import {createOrbitDB, OrbitDBAccessController} from '@orbitdb/core'
import process from 'node:process'
import {createRemoteIpfs} from "./remote.js";
import {createLocalIpfs} from "./local.js";

// ENV Variablen laden
const DEBUG = !!process.env.DEBUG || process.argv.includes('--debug');
const isDebugActive = DEBUG;
console.log(`--debug: ${isDebugActive}`);
// const ORBITDB_ADDR = process.env.ORBITDB_ADDR || process.argv.find(arg => arg.startsWith('/orbitdb/'));
// const orbitDBAddress = ORBITDB_ADDR;
// console.log(`ORBITDB_ADDR: ${orbitDBAddress}`);
const IPFS_API_URL = process.env.IPFS_API_URL || process.argv.find(arg => arg.startsWith('http')) || 'http://localhost:5001'
const ipfsApiUrl = IPFS_API_URL ;
console.log(`IPFS_API_URL: ${ipfsApiUrl}`);
// const PORT = process.env.PORT || 3000

const jetzt = new Date();
console.log('Serverstart: %s',jetzt.toLocaleString('de-DE'));

async function createIpfsInstance(ipfsApiUrl) {
    const ipfs = ipfsApiUrl ? await createRemoteIpfs(isDebugActive,ipfsApiUrl) : await createLocalIpfs(isDebugActive);
    return {ipfs, remote: !!ipfsApiUrl};
}

const {ipfs, remote} = await createIpfsInstance(ipfsApiUrl);
console.log('remote: %s',remote );
const orbitdb = await createOrbitDB({ipfs, id: 'replicator1', directory: `./orbitdb/replicator1`
    // , databases: [
    //     log(),
    //    //docstore()
    // ]
});

console.log("ORBIT DB %s",orbitdb);


const orbitDBAdress = process.argv.find(arg => arg.startsWith('/orbitdb/'))
    || 'appstorage';
    // || '/orbitdb/zdpuB24jCbRT7fPJSkZ1crpWL9Bz78s1TPdPSZNazWd8e7wqg';
console.log('RemoteAdresse: %s',orbitDBAdress);
const db = await orbitdb.open(orbitDBAdress,{
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
