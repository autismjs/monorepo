//@ts-ignore
import type { Libp2pInit } from 'libp2p';
//@ts-ignore
import type { Connection } from '@libp2p/interface';
import logger from '../../../../utilities/src/logger.ts';
import { PubsubTopics } from '../../utils/types';
import { BaseP2P } from '@protocol/services/p2p/base.ts';

export enum ProtocolType {
  V1Info = 'v1/info',
  V1Sync = 'v1/sync',
}

export type ProtocolRequestParam = {
  body: any;
  connection: Connection;
};

export type ProtocolResponseParam = {
  send: (value: Buffer) => Promise<void>;
};

export type ProtocolResponse = {
  buffer: () => Promise<Buffer>;
  json: () => Promise<any>;
};

export class P2P extends BaseP2P {
  async start() {
    this.startPromise = new Promise((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;
    });

    const { name = 'node', bootstrap } = this;
    const { createLibp2p } = await import('libp2p');
    const { circuitRelayServer } = await import('libp2p/circuit-relay');
    const { identifyService } = await import('libp2p/identify');
    const { webSockets } = await import('@libp2p/websockets');
    const { all } = await import('@libp2p/websockets/filters');
    const { noise } = await import('@chainsafe/libp2p-noise');
    const { kadDHT } = await import('@libp2p/kad-dht');
    const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
    const { yamux } = await import('@chainsafe/libp2p-yamux');
    const { mplex } = await import('@libp2p/mplex');

    const { tcp } = await import('@libp2p/tcp');
    const { mdns } = await import('@libp2p/mdns');
    const { webTransport } = await import('@libp2p/webTransport');

    const { bootstrap: _bootstrap } = await import('@libp2p/bootstrap');
    const { pubsubPeerDiscovery } = await import(
      '@libp2p/pubsub-peer-discovery'
    );
    const { webRTC, webRTCDirect } = await import('@libp2p/webrtc');

    const peerDiscovery: Libp2pInit['peerDiscovery'] = [
      mdns({ interval: 1000 }),
      pubsubPeerDiscovery({
        interval: 1000,
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
        listen: [`/ip4/0.0.0.0/tcp/0/ws`, `/ip4/0.0.0.0/tcp/0`],
      },
      transports: [
        tcp(),
        webTransport(),
        webSockets({
          filter: all,
        }),
        webRTC(),
        webRTCDirect(),
      ],
      streamMuxers: [yamux(), mplex()],
      connectionEncryption: [noise()],
      connectionManager: {
        maxConnections: Infinity,
        minConnections: 1,
      },
      peerDiscovery,
      services: {
        dht: kadDHT(),
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          emitSelf: true,
          canRelayMessage: true,
        }),
        identify: identifyService(),
        relay: circuitRelayServer({
          // makes the node function as a relay server
          // hopTimeout: 30 * 1000, // incoming relay requests must be resolved within this time limit
          // advertise: true,
          reservations: {
            maxReservations: Infinity, // how many peers are allowed to reserve relay slots on this server
            // reservationClearInterval: 300 * 1000, // how often to reclaim stale reservations
            // applyDefaultLimit: true, // whether to apply default data/duration limits to each relayed connection
            // defaultDurationLimit: 2 * 60 * 1000, // the default maximum amount of time a relayed connection can be open for
            // defaultDataLimit: BigInt(2 << 7), // the default maximum number of bytes that can be transferred over a relayed connection
            // maxInboundHopStreams: 32, // how many inbound HOP streams are allow simultaneously
            // maxOutboundHopStreams: 64, // how many outbound HOP streams are allow simultaneously
          },
        }),
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
