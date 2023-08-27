import tape from 'tape';

import { ECDSA, ECDH, AES, ZK } from '.';

// import fs from 'fs';
import { generateMerkleTree, RLN, Semaphore } from '@zk-kit/protocols';
// const circuitBuf = fs.readFileSync('./static/semaphore/semaphore.wasm');
// const zkeyBuf = fs.readFileSync('./static/semaphore/semaphore_final.zkey');
// fs.writeFileSync('./static/semaphore/circuit.json', JSON.stringify(circuitBuf.toJSON()));
// fs.writeFileSync('./static/semaphore/zkey.json', JSON.stringify(zkeyBuf.toJSON()));

tape('crypto', async (t) => {
  t.comment('ECDSA');

  const ecdsa1 = new ECDSA({
    privateKey:
      '0x952a843fd78aed42836bce77bc6a5ac812ef77cabd05307c8d6d2c9244d413e6',
  });

  const ecdsa2 = new ECDSA({
    publicKey:
      '0x02d5cf390353fca5271501cae81502e558404101a0b2a21d5d23a05ca5c1ad4d3f',
  });

  t.equal(ecdsa2.privateKey, null, 'private key should be null');
  t.equal(ecdsa1.publicKey, ecdsa2.publicKey, 'public key should match');

  t.assert(
    ecdsa2.verify('hello crypto', ecdsa1.sign('hello crypto')),
    'it should verify signature',
  );

  t.comment('ECDH');

  const ecdh1 = new ECDH({
    privateKey:
      '0x4f640c396376fccbf98df038418b4fd25efcc4f4a94004544e01eb10857ebe0',
  });

  const ecdh2 = new ECDH({
    privateKey:
      '0x452fe11b24f7326678169d7099c36dd356c15e678321be2fedf910aac0384c2',
  });

  const ecdh3 = new ECDH({
    publicKey:
      '0x40bf422fa141fe30626dd4ff2f54b6173dc6231c615b7919546d87bb5956ba44',
  });

  t.equal(
    ecdh1.derive(ecdh2),
    ecdh2.derive(ecdh1),
    'shared secret should match',
  );

  t.equal(
    ecdh1.derive(ecdh3),
    ecdh2.derive(ecdh1),
    'shared secret should match',
  );

  t.throws(
    () => ecdh3.derive(ecdh1),
    `should throw error when deriving with public key`,
  );

  t.comment('AES');

  const aes1 = new AES(ecdh2.derive(ecdh1));
  const aes2 = new AES(ecdh1.derive(ecdh3));

  t.equal(
    aes2.decrypt(aes1.encrypt('hello aes')),
    'hello aes',
    'it should be able to encrypt and decrypt plaintext',
  );

  t.equal(
    aes2.decrypt(aes1.encrypt('0x4f640c396376fccbf98df0384')),
    '0x4f640c396376fccbf98df0384',
    'it should be able to encrypt and decrypt hex',
  );

  t.comment('ZK');

  const zk1 = new ZK(
    '0x993b8794d942ab449daa193bc6a0b7235c1083acbcaa421a897df891cac31500004aff47b63d223901ce0f83e387f5bca50a71d2ab51acb97a555f7bc48a937d',
  );
  const zk2 = new ZK(
    '0x006b8315da14c3430076f16c1e31f1740b41467f273c8d2e0e3452ef7868017400d6b96d764285bfdcc32d2b7b6d471274bf7c8130b3fef3e2b5105f4943f599',
  );
  const zk3 = new ZK();

  t.equal(
    zk1.secret,
    '0x993b8794d942ab449daa193bc6a0b7235c1083acbcaa421a897df891cac31500004aff47b63d223901ce0f83e387f5bca50a71d2ab51acb97a555f7bc48a937d',
    'it should match secret',
  );
  t.equal(
    zk1.commitment,
    '0x042f8e7cb5553c4d84035418cf9333d36c412d1f0ead90ea0b5c9bcd66e7a9a1',
    'it should match commitment',
  );

  t.comment('RLN');
  const tree = generateMerkleTree(15, BigInt(0), [
    zk1.commitment,
    zk2.commitment,
  ]);

  const t0 = performance.now();
  const proof = await zk1.genRLNProof({
    epoch: 'testing',
    signal: 'hello',
    merkleProof: tree.createProof(0),
  });
  const t1 = performance.now();
  console.log(`Proof Generation Perf #1: ${t1 - t0} ms`);

  t.equal(
    proof.publicSignals.merkleRoot,
    tree.root.toString(),
    'proof should match valid root',
  );

  t.equal(
    proof.publicSignals.signalHash,
    RLN.genSignalHash('hello').toString(),
    'proof should match valid signal',
  );

  t.assert(ZK.verifyRLNProof('hello', proof), 'proof should be valid');

  const proof2 = await zk1.genRLNProof({
    epoch: 'testing',
    signal: 'hello 2',
    merkleProof: tree.createProof(0),
  });

  const t2 = performance.now();
  console.log(`Proof Generation Perf #2: ${t2 - t1} ms`);

  const commitment = await ZK.retrieveRLNCommitment(
    proof.publicSignals.signalHash,
    proof2.publicSignals.signalHash,
    proof.publicSignals.yShare,
    proof2.publicSignals.yShare,
  );

  const t3 = performance.now();
  console.log(`Retrieval Perf #1: ${t3 - t2} ms`);

  t.equal(commitment, zk1.commitment, 'it should retrieve spammer');

  const proof3 = await zk1.genRLNProof({
    epoch: 'testing 2',
    signal: 'hello 2',
    merkleProof: tree.createProof(0),
  });

  const t4 = performance.now();
  console.log(`Proof Generation Perf #3: ${t4 - t3} ms`);

  const commitment2 = await ZK.retrieveRLNCommitment(
    proof.publicSignals.signalHash,
    proof3.publicSignals.signalHash,
    proof.publicSignals.yShare,
    proof3.publicSignals.yShare,
  );

  t.notEqual(commitment2, zk1.commitment, 'it should not retrieve non-spammer');
  t.notEqual(commitment2, zk2.commitment, 'it should not retrieve non-spammer');

  t.comment('Semaphore');
  const tree2 = generateMerkleTree(20, BigInt(0), [
    zk1.commitment,
    zk2.commitment,
  ]);

  const sProof1 = await zk1.genSemaphoreProof({
    signal: 'hello semaphore',
    merkleProof: tree2.createProof(0),
  });

  const t5 = performance.now();
  console.log(`Proof Generation Perf #4: ${t5 - t4} ms`);

  t.equal(
    sProof1.publicSignals.merkleRoot,
    tree2.root.toString(),
    'it should have valid root',
  );
  t.equal(
    sProof1.publicSignals.signalHash,
    Semaphore.genSignalHash('hello semaphore').toString(),
    'it should have valid signal hash',
  );

  const sProof2 = await zk3.genSemaphoreProof({
    signal: 'hello semaphore!!',
    merkleProof: tree2.createProof(0),
  });

  const t6 = performance.now();
  console.log(`Proof Generation Perf #5: ${t6 - t5} ms`);

  t.notEqual(
    sProof2.publicSignals.merkleRoot,
    tree2.root.toString(),
    'it should not have valid root',
  );
  t.equal(
    sProof2.publicSignals.signalHash,
    Semaphore.genSignalHash('hello semaphore!!').toString(),
    'it should still have valid signal hash',
  );

  t.end();
  process.exit(0);
});
