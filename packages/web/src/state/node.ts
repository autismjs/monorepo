import BaseState, { type StateOptions } from '../../lib/state.ts';
import { Autism } from '@autismjs/protocol/src/services/browser.ts';

export default class Node extends BaseState {
  node: Autism;
  wait: Promise<void>;
  constructor(options?: StateOptions) {
    super(options);
    const node = new Autism({
      bootstrap: [
        '/ip4/127.0.0.1/tcp/57575/ws/p2p/12D3KooWSoKnYV5idyrrJt3T6WM4eB6wcu58zUuy5bj7cEZNLwdm',
      ],
    });

    node.on('p2p:peer:discovery', (peer) => {
      // console.log('peer discovered', peer);
    });

    node.on('p2p:peer:connect', (peer) => {
      console.log('peer connected', peer);
    });

    node.on('pubsub:message:success', (peer) => {
      console.log('pubsub:message:success', peer);
    });

    node.on('sync:new_message', (peer) => {
      console.log('sync:new_message', peer);
    });

    this.node = node;
    this.wait = new Promise(async (r) => {
      await this.node.start();
      r();
    });

    this.rpc('node/check', (rpc) => {
      console.log(rpc);
    });
  }
}
