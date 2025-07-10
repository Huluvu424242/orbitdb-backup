// src/local.js
import {createLibp2p} from 'libp2p'
import {LevelBlockstore} from 'blockstore-level'
import {activateDebugLogging} from "./debug.js";
import {createHelia} from "helia";
import {yamux} from "@chainsafe/libp2p-yamux";
import {tcp} from "@libp2p/tcp";
import {mdns} from "@libp2p/mdns";
import {noise} from "@chainsafe/libp2p-noise";
import {identify} from "@libp2p/identify";
import {gossipsub} from "@chainsafe/libp2p-gossipsub";

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

export async function createLocalIpfs(isDebugActive) {
    console.log('✨ Lokaler IPFS-Modus');
    const blockstore = new LevelBlockstore(`./ipfs/replicator1`);
    const libp2p = await createLibp2p(libp2pOptions);
    activateDebugLogging(isDebugActive, libp2p);
    return await createHelia({libp2p, blockstore})
}