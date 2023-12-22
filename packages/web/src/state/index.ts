import Node from './node.ts';
import BaseState from '../../lib/state.ts';

class State extends BaseState {
  constructor() {
    super({
      node: new Node(),
    });

    this.rpc('state/check', (rpc) => {
      console.log(rpc);
    });
  }
}

export default State;
