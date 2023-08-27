// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { Libp2p, Libp2pInit } from 'libp2p';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { PubSub } from '@libp2p/interface';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub';
import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
import logger from '../../utils/logger';
import { PubsubTopics } from '../../utils/types';

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
    this.port = options.port || 8080;

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

    const { name = 'node', bootstrap, port = 8000 } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const { createLibp2p } = await import('libp2p');
    const { circuitRelayTransport, circuitRelayServer } = await import(
      'libp2p/circuit-relay'
    );
    const { identifyService } = await import('libp2p/identify');
    const { webSockets } = await import('@libp2p/websockets');
    const { tcp } = await import('@libp2p/tcp');
    const { noise } = await import('@chainsafe/libp2p-noise');
    const { kadDHT } = await import('@libp2p/kad-dht');
    const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
    const { yamux } = await import('@chainsafe/libp2p-yamux');
    const { mplex } = await import('@libp2p/mplex');
    const { mdns } = await import('@libp2p/mdns');
    const { bootstrap: _bootstrap } = await import('@libp2p/bootstrap');
    const { pipe } = await import('it-pipe');
    const { fromString } = await import('uint8arrays/from-string');
    const { pubsubPeerDiscovery } = await import(
      '@libp2p/pubsub-peer-discovery'
    );
    const { webRTC } = await import('@libp2p/webrtc');

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
        listen: [
          `/ip4/0.0.0.0/tcp/${port}`,
          `/ip4/0.0.0.0/tcp/${port}/ws`,
          `/ip4/0.0.0.0/tcp/${port}/webrtc`,
        ],
      },
      transports: [
        tcp(),
        webRTC(),
        webSockets(),
        circuitRelayTransport({
          // allows the current node to make and accept relayed connections
          discoverRelays: 0, // how many network relays to find
          reservationConcurrency: 1, // how many relays to attempt to reserve slots on at once
        }),
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
          // emitSelf: true,
          canRelayMessage: true,
        }),
        identify: identifyService(),
        relay: circuitRelayServer({
          // makes the node function as a relay server
          hopTimeout: 30 * 1000, // incoming relay requests must be resolved within this time limit
          advertise: true,
          reservations: {
            maxReservations: 15, // how many peers are allowed to reserve relay slots on this server
            reservationClearInterval: 300 * 1000, // how often to reclaim stale reservations
            applyDefaultLimit: true, // whether to apply default data/duration limits to each relayed connection
            defaultDurationLimit: 2 * 60 * 1000, // the default maximum amount of time a relayed connection can be open for
            defaultDataLimit: BigInt(2 << 7), // the default maximum number of bytes that can be transferred over a relayed connection
            // maxInboundHopStreams: 32, // how many inbound HOP streams are allow simultaneously
            // maxOutboundHopStreams: 64, // how many outbound HOP streams are allow simultaneously
          },
        }),
      },
    });

    node.handle('/ping', async (req) => {
      await pipe(
        ['Pong'].map((str) => fromString(str)),
        req.stream,
      );
    });

    node.addEventListener('peer:connect', (evt) => {
      logger.info(`[${name}] Connection established to:`, evt.detail);
      this.emit('peer:connect', evt.detail);
    });

    node.addEventListener('peer:discovery', (evt) => {
      logger.info(`[${name}] Discovered:`, evt.detail);
      this.emit('peer:discovery', evt.detail);
    });

    node.services.pubsub.addEventListener('message', (evt) => {
      logger.info(`[${name}] pubsub message received:`, evt.detail);
      this.emit(`pubsub:${evt.detail.topic}`, evt.detail);
    });

    node.services.pubsub.subscribe(PubsubTopics.Global);

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
