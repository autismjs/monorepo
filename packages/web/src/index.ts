import { MessageType, Post, PostSubtype, ProofType } from '@autismjs/message';
import { ECDSA } from '../../crypto/src';
import { getStore } from './state';
import App from './pages/App';
import { h } from '../lib/ui.ts';

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
  const state = getStore();

  const tree = h(
    'button#submit-btn[type=text].button.button-primary',
    {
      className: 'test1 test2',
      id: 'testing',
      customattr: 'custom',
    },
    h('div.hi', 'hello'),
    h('div.hi2', 'hello2'),
  );

  console.log(tree);
  console.log('state', state);

  document.body.append(new App());

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
