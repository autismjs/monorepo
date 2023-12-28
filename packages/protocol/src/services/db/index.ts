import EventEmitter2, { ConstructorOptions } from 'eventemitter2';
import { LevelDBAdapter } from '@db';
import { Any } from '@message';
import NodeCache from 'node-cache';
import { Merkle } from '../../utils/merkle';
import * as process from 'process';

export class DB extends EventEmitter2 {
  #db: LevelDBAdapter;
  #cache: NodeCache;

  constructor(
    options?: ConstructorOptions & {
      name?: string;
    },
  ) {
    super(options);
    this.#db = new LevelDBAdapter({
      path: process.cwd() + '/.autism',
      prefix: options?.name,
    });
    this.#cache = new NodeCache({
      stdTTL: 60 * 10,
    });
  }

  get db() {
    return this.#db;
  }

  async getMessage(hash: string) {
    return this.#db.getMessage(hash);
  }

  async insertMessage(message: Any) {
    await this.#cache.del(message.creator);
    const res = await this.#db.insertMessage(message);
    return res;
  }

  async start() {
    return this.#db.start();
  }

  async stop() {
    return this.#db.stop();
  }

  async merklize(name: string): Promise<Merkle> {
    const cached = await this.#cache.get(name);

    if (cached) {
      return cached as Merkle;
    }

    const leaves = await this.#db.getMessagesByUser(name);

    const tree = new Merkle({
      depth: 15,
      leaves: leaves.map((leaf) => BigInt('0x' + leaf.hash)),
    });

    this.#cache.set(name, tree);

    return tree;
  }
}
