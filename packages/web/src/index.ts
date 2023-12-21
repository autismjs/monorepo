import { Post, PostSubtype, MessageType } from '@autismjs/message';
import { ECDSA } from '@autismjs/crypto';
import { Autism } from '@autismjs/protocol';
//
const p = new Post({
  type: MessageType.Post,
  subtype: PostSubtype.Default,
  content: 'hi',
  creator: '0x1',
  createdAt: new Date(),
});

console.log(p.json);

const ecdsa = new ECDSA();

console.log(ecdsa);

const node = new Autism();

(async () => {
  await node.start();
  console.log(node);
  // @ts-ignore
  window.node = node;
})();
