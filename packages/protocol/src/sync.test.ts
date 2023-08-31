import { ECDSA } from '@autismjs/crypto';
import { Autism } from './index';
import tape from 'tape';
import fs from 'fs';
import { randomPost, wait, loop } from './utils/test';

fs.rmSync('./build/test2', { recursive: true, force: true });

tape('Sync', async (t) => {
  let port = 8080;
  let syncs = 0;
  let syncEnded = false;
  const aKey = new ECDSA();
  const bKey = new ECDSA();

  const alice = new Autism({ name: 'test2/alice', port: port++ });
  await alice.start();

  const bootstrappers = alice.p2p
    .node!.getMultiaddrs()
    .map((d) => d.toString());

  const bob = new Autism({
    name: 'test2/bob',
    bootstrap: bootstrappers,
    port: port++,
  });

  await bob.start();

  await loop(78, async () => {
    const { post } = randomPost(null, { creator: aKey });
    await alice.publish(post);
  });

  await loop(56, async () => {
    const { post } = randomPost(null, { creator: bKey });
    await alice.publish(post);
  });

  await wait(5000);

  const carol = new Autism({
    name: 'test2/carol',
    bootstrap: bootstrappers,
    port: port++,
  });

  carol.on('sync:new_message', async () => {
    syncs++;
    console.log(`syncs: ${syncs} out of ${78 + 56}`);
  });

  await carol.start();

  while (!syncEnded) {
    if (78 + 56 === syncs) {
      syncEnded = true;
    } else {
      console.log(`checking syncing...`);
    }
    await wait(1000);
  }

  await wait(5000);
  await alice.stop();
  await bob.stop();
  await carol.stop();
  await wait(5000);
  fs.rmSync('./build/test2', { recursive: true, force: true });
  t.end();
});
