//@ts-ignore
import type { Libp2pInit } from 'libp2p';
import logger from '../../../../utilities/src/logger.ts';
import { PubsubTopics } from '../../utils/types';
import { BaseP2P } from '@protocol/services/p2p/base.ts';

export class P2P extends BaseP2P {
  async start() {
    this.startPromise = new Promise((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;
    });

    const { name = 'node', bootstrap } = this;
    // @ts-ignore
    const { createLibp2p } = await import('libp2p');
    const { circuitRelayTransport } = await import('libp2p/circuit-relay');
    const { identifyService } = await import('libp2p/identify');
    const { webSockets } = await import('@libp2p/websockets');
    const { all } = await import('@libp2p/websockets/filters');
    const { noise } = await import('@chainsafe/libp2p-noise');
    const { kadDHT } = await import('@libp2p/kad-dht');
    // @ts-ignore
    const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
    const { yamux } = await import('@chainsafe/libp2p-yamux');
    const { mplex } = await import('@libp2p/mplex');
    const { webTransport } = await import('@libp2p/webTransport');

    const { bootstrap: _bootstrap } = await import('@libp2p/bootstrap');
    const { pubsubPeerDiscovery } = await import(
      '@libp2p/pubsub-peer-discovery'
    );
    const { webRTC, webRTCDirect } = await import('@libp2p/webrtc');

    const peerDiscovery: Libp2pInit['peerDiscovery'] = [
      pubsubPeerDiscovery({
        interval: 30000,
      }) as any,
    ];

    if (bootstrap.length) {
      peerDiscovery.push(
        _bootstrap({
          list: bootstrap,
        }),
      );
    }

    const node = await createLibp2p({
      addresses: {
        listen: [
          // create listeners for incoming WebRTC connection attempts on on all
          // available Circuit Relay connections
          '/webrtc',
        ],
      },
      transports: [
        webTransport(),
        webSockets({
          // this allows non-secure WebSocket connections for purposes of the demo
          filter: all,
        }),
        webRTC(),
        webRTCDirect(),
        circuitRelayTransport({
          // allows the current node to make and accept relayed connections
          discoverRelays: 1, // how many network relays to find
          reservationConcurrency: 2, // how many relays to attempt to reserve slots on at once
        }),
      ],
      streamMuxers: [yamux(), mplex()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false,
      },
      connectionManager: {
        maxConnections: 4,
        minConnections: 1,
      },
      peerDiscovery,
      services: {
        dht: kadDHT(),
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          emitSelf: true,
          canRelayMessage: false,
        }),
        identify: identifyService(),
      },
    });

    node.addEventListener('peer:connect', (evt) => {
      logger.verbose(`[${name}] Connection established to:`, evt.detail);
      this.emit('peer:connect', evt.detail);
    });

    node.addEventListener('peer:discovery', (evt) => {
      logger.verbose(`[${name}] Discovered:`, evt.detail);
      this.emit('peer:discovery', evt.detail);
    });

    const pubsub = node.services.pubsub;

    pubsub.addEventListener('message', (evt) => {
      logger.verbose(`[${name}] pubsub message received:`, evt.detail);
      this.emit(`pubsub:${evt.detail.topic}`, evt.detail);
    });

    pubsub.subscribe(PubsubTopics.Global);

    this.node = node;

    Promise.resolve(node.start())
      .then(this.startResolve)
      .catch(this.startReject);

    return this.startPromise;
  }
}
