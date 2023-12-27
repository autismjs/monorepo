import { Autism } from '../src';
// @ts-ignore
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv)).argv;

(async () => {
  const { name = 'local', bootstrap = [], port = 6075 } = argv;
  const node = new Autism({
    name,
    relay: true,
    bootstrap: typeof bootstrap === 'string' ? [bootstrap] : bootstrap,
    port,
  });

  // node.on('p2p:peer:discovery', (peer) => {
  //   console.log('peer discovered', peer);
  // });

  node.on('p2p:peer:connect', (peer) => {
    console.log('peer connected', peer);
  });

  node.on('pubsub:message:success', (peer) => {
    console.log('pubsub:message:success', peer);
  });

  await node.start();
  console.log(node.p2p.node!.getMultiaddrs().map((d) => d.toString()));
  console.log('there are ' + (await node.db.db.getPosts()).length + ' post(s)');
})();
