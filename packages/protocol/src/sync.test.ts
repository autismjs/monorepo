import { ECDSA } from '@autismjs/crypto';
import { Autism } from './index';
import tape from 'tape';
import fs from 'fs';
import { randomPost, wait, loop } from './utils/test';

fs.rmSync('./build/test2', { recursive: true, force: true });

tape('Sync', async (t) => {
  let port = 9080;
  let syncs = 0;
  let syncEnded = false;
  let sync2Ended = false;
  const aKey = new ECDSA();
  const bKey = new ECDSA();
  const cKey = new ECDSA();

  const alice = new Autism({ name: 'test2/alice', port: port++, sync: 10000 });
  await alice.start();

  const bootstrappers = alice.p2p
    .node!.getMultiaddrs()
    .map((d) => d.toString());

  const bob = new Autism({
    name: 'test2/bob',
    bootstrap: bootstrappers,
    port: port++,
    sync: 10000,
  });

  await bob.start();

  const APOSTS = 23;
  const BPOSTS = 19;
  const CPOSTS = 7;

  await loop(APOSTS, async () => {
    const { post } = randomPost(null, { creator: aKey });
    await alice.publish(post);
  });

  await loop(BPOSTS, async () => {
    const { post } = randomPost(null, { creator: bKey });
    await alice.publish(post);
  });

  await wait(5000);

  const carol = new Autism({
    name: 'test2/carol',
    bootstrap: bootstrappers,
    port: port++,
    sync: 10000,
  });

  carol.on('sync:new_message', async () => {
    syncs++;
    console.log(`syncs: ${syncs} out of ${APOSTS + BPOSTS}`);
  });

  await carol.start();

  while (!syncEnded) {
    if (APOSTS + BPOSTS === syncs) {
      syncEnded = true;
    } else {
      console.log(`checking syncing...`);
    }
    await wait(1000);
  }

  t.equal(
    (await carol.db.db.getPostsByUser(aKey.publicKey!)).length,
    APOSTS,
    `a should have ${APOSTS} posts`,
  );

  t.equal(
    (await carol.db.db.getPostsByUser(bKey.publicKey!)).length,
    BPOSTS,
    `a should have ${BPOSTS} posts`,
  );

  t.equal(
    (await carol.db.db.getPostsByUser(cKey.publicKey!)).length,
    0,
    `c should have ${0} posts`,
  );

  loop(CPOSTS, async () => {
    const { post } = randomPost(null, { creator: cKey });
    await bob.db.insertMessage(post);
  });

  await wait(1000);

  while (!sync2Ended) {
    if (APOSTS + BPOSTS + CPOSTS === syncs) {
      sync2Ended = true;
    } else {
      console.log(`checking syncing...`);
    }
    await wait(1000);
  }

  t.equal(
    (await carol.db.db.getPostsByUser(cKey.publicKey!)).length,
    CPOSTS,
    `c should have ${CPOSTS} posts`,
  );

  t.equal(
    (await alice.db.db.getPostsByUser(cKey.publicKey!)).length,
    CPOSTS,
    `c should have ${CPOSTS} posts`,
  );

  t.equal(
    (await bob.db.db.getPostsByUser(cKey.publicKey!)).length,
    CPOSTS,
    `c should have ${CPOSTS} posts`,
  );

  await wait(5000);
  await carol.stop().catch(() => null);
  console.log('stopped carol');

  await wait(5000);
  await bob.stop().catch(() => null);
  console.log('stopped bob');

  await wait(5000);
  await alice.stop().catch(() => null);
  console.log('stopped alice');

  await wait(5000);
  fs.rmSync('./build/test2', { recursive: true, force: true });
  t.end();
});
