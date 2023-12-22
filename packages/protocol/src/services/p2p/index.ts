//@ts-ignore
import type { Libp2p, Libp2pInit } from 'libp2p';
//@ts-ignore
import type { PubSub, Connection } from '@libp2p/interface';
//@ts-ignore
import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub';
import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
import logger from '../../utils/logger';
import { PubsubTopics } from '../../utils/types';
//@ts-ignore
import { PeerId } from '@libp2p/interface/peer-id';

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

export class P2P extends EventEmitter2 {
  #startResolve?: () => void;
  #startReject?: (value: unknown) => void;
  #startPromise?: Promise<void>;
  name: string;
  bootstrap: string[];
  port: number;
  #node?: Libp2p<{
    pubsub: PubSub<GossipsubEvents>;
  }>;

  constructor(
    options: ConstructorOptions & {
      name?: string;
      bootstrap?: string[];
      port?: number;
      start?: boolean;
    } = {},
  ) {
    super(options);
    this.name = options.name || 'node';
    this.bootstrap = options.bootstrap || [];
    this.port = options.port || 6075;

    if (options.start) this.start();
  }

  get node() {
    return this.#node;
  }

  async subscribe(topic: string) {
    return this.#node!.services.pubsub.subscribe(topic);
  }

  async publish(topic: string, data: Buffer) {
    return this.#node!.services.pubsub.publish(topic, data);
  }

  async dialProtocol(
    peerId: PeerId,
    procotols: ProtocolType[],
    value: Buffer = Buffer.from('12334', 'hex'),
  ): Promise<ProtocolResponse> {
    const { pipe } = await import('it-pipe');

    const stream = await this.#node!.dialProtocol(peerId, procotols);

    const bufferPromise = new Promise<Buffer>(async (resolve) => {
      pipe([value], stream!, async (source) => {
        for await (const msg of source) {
          resolve(Buffer.from(msg.subarray()));
        }
      });
    });

    return {
      buffer: () => bufferPromise,
      json: () =>
        bufferPromise.then((buf) => JSON.parse(buf.toString('utf-8'))),
    };
  }

  async handle(
    protocol: ProtocolType,
    handler: (req: ProtocolRequestParam, res: ProtocolResponseParam) => void,
  ) {
    const { pipe } = await import('it-pipe');

    this.#node!.handle(protocol, ({ stream, connection }) => {
      pipe(stream, async (source) => {
        for await (const msg of source) {
          const body = msg.subarray();
          handler(
            { body, connection },
            {
              send: async (value: Buffer) => {
                return pipe([value], stream);
              },
            },
          );
        }
      });
    });
  }

  async waitForStart() {
    if (!this.#startPromise) {
      return this.start();
    }

    return this.#startPromise;
  }

  async start() {
    this.#startPromise = new Promise((resolve, reject) => {
      this.#startResolve = resolve;
      this.#startReject = reject;
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

    this.#node = node;

    Promise.resolve(node.start())
      .then(this.#startResolve)
      .catch(this.#startReject);

    return this.#startPromise;
  }

  async stop() {
    await this.#node!.stop();
    this.#node = undefined;
  }
}
