import { ConstructorOptions } from 'eventemitter2';
import { P2P } from './p2p';
import { DB } from './db';
import { BaseNode } from '@protocol/services/base.ts';

export class Autism extends BaseNode {
  p2p: P2P;
  db: DB;

  constructor(
    options?: ConstructorOptions & {
      name?: string;
      bootstrap?: string[];
      port?: number;
      start?: boolean;
      relay?: boolean;
      sync?: number;
    },
  ) {
    super(options);
    this.name = options?.name || 'node';
    this.nameMutex = {};

    this.p2p = new P2P({
      ...options,
      name: this.name,
    });

    this.db = new DB({
      ...options,
      name: this.name,
    });

    this.db.db.on('db:message:revert', (json) => {
      this.emit('pubsub:message:revert', json);
    });

    this.sync = options?.sync || 5 * 60 * 1000; // default: 5m;
    this.syncTimeout = null;
  }
}
