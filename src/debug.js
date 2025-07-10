
export function activateDebugLogging(isDebugActive, libp2p) {
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
