import { MessageType, Post, PostSubtype, ProofType } from '@autismjs/message';
import { ECDSA } from '../../crypto/src';
import { Autism } from '../../protocol/src/browser.ts';

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

const node = new Autism({
  bootstrap: [
    '/ip4/127.0.0.1/tcp/51049/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx',
    '/ip4/192.168.86.30/tcp/51049/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx',
    '/ip4/192.168.86.24/tcp/51049/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx',
    '/ip4/127.0.0.1/tcp/51050/ws/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx',
    '/ip4/192.168.86.30/tcp/51050/ws/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx',
    '/ip4/192.168.86.24/tcp/51050/ws/p2p/12D3KooWHk5oAYprr4o8jNzk8bBMzWpo4yszrFwYGmHRWDVagANx'
  ],
});

(async () => {
  await node.start();

  node.on('p2p:peer:discovery', (peer) => {
    console.log('peer discovered', peer);
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

  p.commit({
    type: ProofType.ECDSA,
    value: ecdsa.sign(p.hash),
  });

  await node.publish(p);
  console.log(await node.db.db.getPosts());
  console.log(node.p2p.node!.getMultiaddrs().map((d) => d.toString()));
})();
