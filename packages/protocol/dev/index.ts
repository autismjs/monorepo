import { Autism } from '../src';

(async () => {
  const node = new Autism({
    bootstrap: [
      '/ip4/127.0.0.1/tcp/6075/ws/p2p/12D3KooWGRQwh5eWUPXCQBYDhe6oHqZFeZUTBi6xG6pmTU1q8FmV',
    ],
  });

  await node.start();
  console.log(node.p2p.node!.getMultiaddrs().map((d) => d.toString()));
})();
