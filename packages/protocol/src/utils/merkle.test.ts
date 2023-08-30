import tape from 'tape';
import { Merkle } from './merkle';
import { perf } from './test';

tape('Merkle', async (t) => {
  const end = perf();
  const tree = new Merkle({
    depth: 18,
    leaves: [0x1, 0x2, 0x3, 0x4, 0x5].map((num) => BigInt(num)),
  });

  console.log(`merkle tree depth of 18 construction: ${end(2)} ms`);

  t.equal(
    tree.root.toString(),
    '58295260226228938201205556315828558447606311022107673010356643431978082614907',
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
    tree.getChildren(
      BigInt(
        '91507985932942093822676098431567788576851404412690688138886001347141720691792',
      ),
    ),
    [
      BigInt(
        '45297671129126603335790265785468239164292101730273863726235475996557817286079',
      ),
      BigInt(
        '34859503667801835931830979568937103329837498473189022525606717518418471688065',
      ),
    ],
    'it should return the right children',
  );

  t.deepEqual(
    tree.getChildren(
      BigInt(
        '17747908749829535010742244029493603802924904336395705904631007502873869373812',
      ),
    ),
    [
      BigInt(
        '14283652997279521723690638763073989255770107588563183619778399073858414291339',
      ),
      BigInt(
        '91507985932942093822676098431567788576851404412690688138886001347141720691792',
      ),
    ],
    'it should return the default first children',
  );

  t.equal(
    tree.getChildren(BigInt(0x4)),
    null,
    'it should return null when it matches a leaf',
  );

  t.end();
});
