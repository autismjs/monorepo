import { Post, PostSubtype, MessageType } from '@autismjs/message';
import { ECDSA } from '@autismjs/crypto';
import { Autism } from '../../protocol/src';
//
const p = new Post({
  type: MessageType.Post,
  subtype: PostSubtype.Default,
  content: 'hi',
  creator: '0x1',
  createdAt: new Date(),
});

console.log('post', p.json);

const ecdsa = new ECDSA();

console.log('ecdsa', ecdsa);

const node = new Autism();

(async () => {
  await node.start();
  console.log(node);
  // @ts-ignore
  window.node = node;
})();
