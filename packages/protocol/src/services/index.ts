import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
import { P2P } from './p2p';

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

    this.p2p.onAny((event, value) => {
      this.emit('p2p:' + event, value);
    });
  }
}
