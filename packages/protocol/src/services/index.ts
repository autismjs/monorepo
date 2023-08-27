import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
import { P2P } from './p2p';
import { PubsubTopics } from '../utils/types';

export class Autism extends EventEmitter2 {
  p2p: P2P;

  constructor(
    options?: ConstructorOptions & {
      name?: string;
      bootstrap?: string[];
      port?: number;
      start?: boolean;
      relay?: boolean;
    },
  ) {
    super(options);

    this.p2p = new P2P(options);
  }

  #onGlobalPubSub = async (value: any) => {
    console.log(value);
    // deserialize message
    // validate signature
    // validate message scheme
    // insert to db
  };

  async publish(data: Buffer) {
    this.p2p.publish(PubsubTopics.Global, data);
  }

  async start() {
    this.p2p.on(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    await this.p2p.start();
  }

  async stop() {
    this.p2p.off(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    await this.p2p.stop();
  }
}
