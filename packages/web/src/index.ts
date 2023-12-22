import { MessageType, Post, PostSubtype, ProofType } from '@autismjs/message';
import { ECDSA } from '../../crypto/src';
import State from './state';

const ecdsa = new ECDSA();
console.log('ecdsa', ecdsa);

const p = new Post({
  type: MessageType.Post,
  subtype: PostSubtype.Default,
  content: 'hi',
  creator: ecdsa.publicKey!,
  createdAt: new Date(),
});
console.log('post', p.json);

(async () => {
  const state = new State();
  console.log('state', state);

  state.subscribe((prev, next) => {
    console.log(prev, next);
  });

  state.dispatch({
    method: 'node/check',
    params: {
      hi: 1,
    },
  });

  p.commit({
    type: ProofType.ECDSA,
    value: ecdsa.sign(p.hash),
  });

  // await node.publish(p);
})();
