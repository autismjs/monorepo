import Node from './node.ts';
import Store from '../../lib/state.ts';

const store = new Store({
  node: new Node(),
});

export const getStore = () => {
  return store;
};
