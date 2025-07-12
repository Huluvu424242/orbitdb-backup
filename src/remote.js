import process from "node:process";
import {create} from "ipfs-http-client"
import {mdns} from "@libp2p/mdns";
import {tcp} from "@libp2p/tcp";
import {noise} from "@chainsafe/libp2p-noise";
import {yamux} from "@chainsafe/libp2p-yamux";
import {identify} from "@libp2p/identify";
import {gossipsub} from "@chainsafe/libp2p-gossipsub";

// addresses: {
//     listen: ['/ip4/0.0.0.0/tcp/0']
// },
export const libp2pOptionsRemote = {
    peerDiscovery: [mdns()],
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
        identify: identify(),
        pubsub: gossipsub({emitSelf: true})
    }
}



export async function createRemoteIpfs(isdebugActive, ipfsApiUrl) {
    console.log(`✨ Remote IPFS-Modus: ${ipfsApiUrl}`);
    try {
        const ipfs = create({url: ipfsApiUrl})
        await ipfs.id()
        console.log("✅ Verbindung zu IPFS erfolgreich:", id.id);
        return {ipfs,  remote: true}
    } catch (err) {
        console.error('❌ Verbindung zu Remote-IPFS fehlgeschlagen:', err.message)
        process.exit(1)
    }
}