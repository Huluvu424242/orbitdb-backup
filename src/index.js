// src/index.js
import {createOrbitDB, OrbitDBAccessController} from '@orbitdb/core'
import process from 'node:process'
import {createRemoteIpfs} from "./remote.js";
import {createLocalIpfs} from "./local.js";


const isDebugActive = process.argv.includes('--debug');
const remoteUrlArg = process.argv.find(arg => arg.startsWith('--remote-ipfs='));

const jetzt = new Date();
console.log('Serverstart: %s',jetzt.toLocaleString('de-DE'));

async function createIpfsInstance(remoteUrlArg) {
    const url = remoteUrlArg ? remoteUrlArg.split('=')[1] : null;
    const ipfs = remoteUrlArg ? await createRemoteIpfs(isDebugActive,url) : await createLocalIpfs(isDebugActive);
    return {ipfs, remote: !!remoteUrlArg};
}

const {ipfs, remote} = await createIpfsInstance(remoteUrlArg);
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
