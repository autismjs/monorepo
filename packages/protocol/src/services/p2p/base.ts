//@ts-ignore
import type { Libp2p } from 'libp2p';
//@ts-ignore
import type { PubSub, Connection } from '@libp2p/interface';
//@ts-ignore
import type { GossipsubEvents } from '@chainsafe/libp2p-gossipsub';
import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
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

export class BaseP2P extends EventEmitter2 {
  startResolve?: () => void;
  startReject?: (value: unknown) => void;
  startPromise?: Promise<void>;
  name: string;
  bootstrap: string[];
  port: number;
  node?: Libp2p<{
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

  async subscribe(topic: string) {
    return this.node!.services.pubsub.subscribe(topic);
  }

  async publish(topic: string, data: Buffer) {
    return this.node!.services.pubsub.publish(topic, data);
  }

  async dialProtocol(
    peerId: PeerId,
    procotols: ProtocolType[],
    value: Buffer = Buffer.from('12334', 'hex'),
  ): Promise<ProtocolResponse> {
    const { pipe } = await import('it-pipe');

    const stream = await this.node!.dialProtocol(peerId, procotols);

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

    this.node!.handle(protocol, ({ stream, connection }) => {
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
    if (!this.startPromise) {
      return this.start();
    }

    return this.startPromise;
  }

  async start() {
    this.startPromise = new Promise((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;
    });

    Promise.resolve().then(this.startResolve).catch(this.startReject);

    return this.startPromise;
  }

  async stop() {
    await this.node!.stop();
    this.node = undefined;
  }
}
