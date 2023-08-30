import { ECDSA } from '@autismjs/crypto';
import { Autism } from './index';
import tape from 'tape';
import fs from 'fs';
import { randomPost, wait, loop } from './utils/test';
import { ProofType } from '@autismjs/message';
import { PubsubTopics } from './utils/types';

fs.rmSync('./build/test', { recursive: true, force: true });

tape('protocol', async (t) => {
  let port = 8080;
  const connections: {
    [k: string]: boolean;
  } = {};
  const discoveries: {
    [k: string]: boolean;
  } = {};
  let pubsubs = 0;
  let syncs = 0;
  let pubsubErrors = 0;
  let connectionTestsEnded = false;
  let pubsubTestsEnded = false;
  const timeout = 30000;

  t.comment('Setting up a 6 nodes network');

  const node0 = new Autism({ name: 'test/bootstrap', port: port++ });

  await node0.start();

  const bootstrappers = node0.p2p
    .node!.getMultiaddrs()
    .map((d) => d.toString());

  console.log(node0.p2p.name + ' is listening from ' + bootstrappers);

  const alice = new Autism({
    name: 'test/alice',
    bootstrap: bootstrappers,
    port: port++,
  });

  await alice.start();

  const bob = new Autism({
    name: 'test/bob',
    bootstrap: alice.p2p.node!.getMultiaddrs().map((d) => d.toString()),
    port: port++,
  });

  await bob.start();

  t.equal(node0.p2p.name, 'test/bootstrap', 'node should match name');

  const others: Autism[] = [];

  await loop(3, async (i) => {
    const node = new Autism({
      name: `test/other-${i}`,
      bootstrap: bootstrappers,
      port: port++,
    });
    others.push(node);
    await node.start();
  });

  const nodes = [alice, bob].concat(others);

  const now = Date.now();

  [node0, ...nodes].forEach((node) => {
    node.on('p2p:peer:connect', testConnections);
    node.on('p2p:peer:discovery', testDiscoveries);
  });

  while (!connectionTestsEnded) {
    await checkingConnections();
    await wait(1000);
  }

  t.comment('Pubsub');

  [node0, ...nodes].forEach((node) => {
    node.on('pubsub:message:success', logPubsubSuccess);
    node.on('pubsub:error', () => {
      pubsubErrors++;
    });
  });

  await wait(5000);

  const bootstrapKey = new ECDSA();
  const aliceKey = new ECDSA();
  const bobKey = new ECDSA();

  Promise.all([
    loop(78, async () => {
      const { post } = randomPost(null, { creator: bootstrapKey });
      node0.publish(post);
    }),
    loop(56, async () => {
      const { post } = randomPost(null, { creator: aliceKey });
      alice.publish(post);
    }),
    loop(23, async () => {
      const { post } = randomPost(null, { creator: bobKey });
      bob.publish(post);
    }),
    loop(10, async () => {
      const { post } = randomPost();
      post.commit({
        type: ProofType.ECDSA,
        value: 'badkey',
      });
      bob.p2p.node!.services.pubsub.publish(PubsubTopics.Global, post.buffer);
    }),
  ]);

  const now2 = Date.now();

  while (!pubsubTestsEnded) {
    if (Date.now() - now2 > 60000) {
      t.error(new Error('test timeout after 30 seconds'));
      pubsubTestsEnded = true;
      await endTest();
    } else if (pubsubs >= (78 + 56 + 23) * (1 + nodes.length)) {
      pubsubTestsEnded = true;
      await wait(1000);
    } else {
      console.log(`found ${pubsubs} messages. awaiting for more messages...`);
      await wait(1000);
    }
  }

  t.equal(
    pubsubErrors,
    10 * (1 + nodes.length),
    `${10 * (1 + nodes.length)} bad messages were detected`,
  );

  t.equal(
    pubsubs,
    (78 + 56 + 23) * (1 + nodes.length),
    `a total of ${(78 + 56 + 23) * (1 + nodes.length)} message was logged`,
  );

  const { db } = node0.db;

  t.equal(
    (await db.getPosts()).length,
    78 + 56 + 23,
    `there should be ${78 + 56 + 23} top level posts`,
  );

  t.equal(
    (await db.getPostsByUser(bootstrapKey.publicKey!)).length,
    78,
    'there should be 78 top level posts by boostrap',
  );

  t.comment('Sync');

  const carol = new Autism({
    name: 'test/carol',
    bootstrap: bootstrappers,
    port: port++,
  });

  carol.on('sync:new_message', (msg) => {
    syncs++;
    console.log(`syncs: ${syncs}`, msg.messageId);
  });

  await carol.start();

  await wait(2000);

  // const res = await carol.p2p.dialProtocol(node0.p2p.node!.peerId, [
  //   ProtocolType.V1Info,
  // ]);

  // console.log(await res.json());
  console.log(await carol.db.db.getPosts());

  // await endTest();

  async function testConnections(event: any) {
    const found = [node0, ...nodes].find(
      (node) => node.p2p.node!.peerId.toString() === event.toString(),
    );

    const name = found?.p2p.name;

    if (name && !connections[name as string]) {
      t.assert(found, `connected to ${name}`);
      connections[name] = true;
    }
  }

  async function testDiscoveries(event: any) {
    const found = [node0, ...nodes].find(
      (node) => node.p2p.node!.peerId.toString() === event.id.toString(),
    );

    const name = found?.p2p.name;

    if (name && !discoveries[name]) {
      t.assert(found, `discovered ${name}`);
      discoveries[name] = true;
    }
  }

  async function logPubsubSuccess() {
    pubsubs++;
  }

  async function checkingConnections() {
    if (connectionTestsEnded) return;

    const connLen = Object.keys(connections).length;
    const discLen = Object.keys(discoveries).length;

    if (Date.now() - now > timeout) {
      t.error(
        new Error(`test timeout after ${Math.floor(timeout / 1000)} seconds`),
      );
      connectionTestsEnded = true;
      await endTest();
    } else if (connLen === nodes.length + 1 && discLen === nodes.length + 1) {
      connectionTestsEnded = true;
    } else {
      console.log(
        `found c:${connLen} d:${discLen}. awaiting for connections...`,
      );
    }
  }

  async function endTest() {
    await Promise.all([
      node0.stop(),
      carol.stop(),
      ...nodes.map((node) => node.stop()),
    ]);
    fs.rmSync('./build/test', { recursive: true, force: true });
    t.end();
  }
});
