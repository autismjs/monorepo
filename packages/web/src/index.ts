import { Post, PostSubtype, MessageType } from '@autismjs/message';
import { ECDSA } from '@autismjs/crypto';
//
const autism = new Post({
  type: MessageType.Post,
  subtype: PostSubtype.Default,
  content: 'hi',
  creator: '0x1',
  createdAt: new Date(),
});

console.log(autism.json);

const ecdsa = new ECDSA();

console.log(ecdsa);
