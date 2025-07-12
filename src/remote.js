import process from "node:process";
import {create} from "ipfs-http-client"

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