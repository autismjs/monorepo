import { Autism } from './index';
import tape from 'tape';

tape('protocol', async (t) => {
  const { toString } = await import('uint8arrays/to-string');

  let port = 8080;
  let connections = 0;
  let discoveries = 0;
  let connectionTestsEnded = false;
  const now = Date.now();
  const timeout = 15000;

  const node0 = new Autism({ name: 'bootstrap', port: port++ });

  await node0.p2p.waitForStart();

  node0.on('p2p:peer:connect', testConnections);

  node0.on('p2p:peer:discovery', testDiscoveries);

  const bootstrappers = node0.p2p
    .node!.getMultiaddrs()
    .map((d) => d.toString());

  console.log(node0.p2p.name + ' is listening from ' + bootstrappers);

  const alice = new Autism({
    name: 'alice',
    bootstrap: bootstrappers,
    port: port++,
  });

  await alice.p2p.waitForStart();

  const bob = new Autism({
    name: 'bob',
    bootstrap: alice.p2p.node!.getMultiaddrs().map((d) => d.toString()),
    port: port++,
  });

  await bob.p2p.waitForStart();

  t.equal(node0.p2p.name, 'bootstrap', 'node should match name');

  const nodes = [alice, bob];

  while (!connectionTestsEnded) {
    await checkingConnections();
    await new Promise((r) => setTimeout(r, 1000));
  }

  nodes.concat(node0).forEach((node) => {
    node.on('p2p:message:heyooo', (evt: any) => {
      console.log(node.p2p.name, Buffer.from(evt.data).toString('utf-8'));
    });

    node.p2p.subscribe('heyooo');
  });

  await new Promise((r) => setTimeout(r, 2000));

  node0.p2p.publish('heyooo', Buffer.from('i am bootstrap', 'utf-8'));

  alice.p2p.publish('heyooo', Buffer.from('i am alice', 'utf-8'));

  bob.p2p.publish('heyooo', Buffer.from('i am bob', 'utf-8'));

  // await endTest();

  async function testConnections(event: any) {
    connections++;
    const found = nodes.find(
      (node) => node.p2p.node!.peerId.toString() === event.toString(),
    );
    t.assert(found, `connected to ${found?.p2p.name}`);
  }

  async function testDiscoveries(event: any) {
    discoveries++;
    const found = nodes.find(
      (node) => node.p2p.node!.peerId.toString() === event.id.toString(),
    );
    t.assert(found, `discovered ${found?.p2p.name}`);
  }

  async function checkingConnections() {
    if (connectionTestsEnded) return;

    if (Date.now() - now > timeout) {
      t.error(new Error('test timeout after 15 seconds'));
      connectionTestsEnded = true;
    } else if (connections === 2 && discoveries == 2) {
      console.log('success! ending test...');
      connectionTestsEnded = true;
    } else {
      console.log('awaiting for connections...');
    }
  }

  async function endTest() {
    await node0.p2p.stop();
    await alice.p2p.stop();
    await bob.p2p.stop();

    t.end();
  }
});
