import {createLibp2p} from 'libp2p'
import {noise} from '@libp2p/noise'
import {mplex} from '@libp2p/mplex'
import {yamux} from '@chainsafe/libp2p-yamux'
import {tcp} from '@libp2p/tcp'
import {multiaddr} from '@multiformats/multiaddr'
import {ping} from '@libp2p/ping'
import {identify} from '@libp2p/identify'

const PEER_MULTIADDR = '/ip4/219.89.34.152/tcp/63116/p2p/12D3KooWDZ5ouwFjYwC4F6bQQx8J4JFGHa6mrRGNybVUWxhmiDed'

const main = async () => {
    const node = await createLibp2p({
        addresses: {listen: []},
        transports: [tcp()],
        connectionEncryption: [noise()],
        streamMuxers: [yamux(), mplex()],
        services: {
            ping: ping(),      // 👈 Ping aktivieren
            identify: identify()
        }
    })

    console.log('🔍 Versuche Verbindung zu Bootstrap-Peer:')
    console.log('→', PEER_MULTIADDR)

    try {
        const ma = multiaddr(PEER_MULTIADDR)
        console.log("multiadressen sind da");
        const connection = await node.dialProtocol(ma,'/ipfs/ping/1.0.0')
        console.log("connection erzeugt");
        const protocols = await node.peerStore.protoBook.get(connection.remotePeer)
        console.log('📦 Unterstützte Protokolle des Ziel-Peers:', protocols)
        console.log('✅ Verbindung aufgebaut. Starte Ping...')

        const latency = await node.services.ping.ping(connection.remotePeer)

        console.log(`🏓 Ping erfolgreich! Latenz: ${latency}ms`)

        console.log('✅ Verbindung erfolgreich!')
        console.log('Remote Peer:', connection.remotePeer.toString())
    } catch (err) {
        console.error('❌ Verbindung fehlgeschlagen:')
        console.error(err.message)
    } finally {
        await node.stop()
    }
}

main()
