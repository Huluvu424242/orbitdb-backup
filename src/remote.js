import process from "node:process";

export async function createRemoteIpfs(isdebugActive,url) {
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