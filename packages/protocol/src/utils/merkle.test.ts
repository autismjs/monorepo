import tape from 'tape';
import { Merkle } from './merkle';
import { perf } from './test';

tape('Merkle', async (t) => {
  const end = perf();
  const tree = new Merkle({
    depth: 4,
    leaves: [0x1, 0x2, 0x3, 0x4, 0x5].map((num) => BigInt(num)),
  });

  console.log(`merkle tree depth of ${tree.depth} construction: ${end(2)} ms`);

  // console.log(tree.hashes);
  t.equal(
    tree.root.toString(),
    '17747908749829535010742244029493603802924904336395705904631007502873869373811',
    'merkle root should be valid',
  );
  const end2 = perf();
  const proof = tree.getProof(BigInt(0x2));
  console.log(`get proof perf: ${end2(2)} ms`);

  const end3 = perf();
  t.assert(tree.verify(proof!), 'it should verify valid proof');
  console.log(`verify proof perf: ${end3()} ms`);

  t.assert(
    !tree.verify([BigInt(0x1), BigInt(0x2)]),
    'it should not verify invalid proof',
  );

  t.deepEqual(
    tree.checkHash(0, 0, BigInt(0x0)),
    {
      depth: 1,
      indices: [0, 1],
      hashes: [
        '87673094123527892849124099141735388053390146014574933123831848994748847266573',
        '5',
      ],
    },
    'it should return the right children from root',
  );

  t.deepEqual(
    tree.checkHash(
      1,
      0,
      BigInt(
        '87673094123527892849124099141735388053390146014574933123831848994748847266573',
      ),
    ),
    true,
    'it should return true',
  );

  t.deepEqual(
    tree.checkHash(1, 0, BigInt(0x0)),
    {
      depth: 2,
      indices: [0, 1],
      hashes: [
        '48542053925442562206970678378617219313498267117402160926478466274825158240536',
        '61014538568506221588868294043973711669514098560329658103961376235728675065327',
      ],
    },
    'it should return the right children from level 1',
  );

  t.deepEqual(
    tree.checkHash(3, 0, BigInt(0x1)),
    null,
    'it should return the right children',
  );

  t.end();
});
