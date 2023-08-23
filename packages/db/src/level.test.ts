import tape from 'tape';
import fs from 'fs';
import { LevelDBAdapter } from '.';
import { Post, Moderation, Connection, Profile } from 'autism-message';

fs.rmSync('./build/db', { recursive: true, force: true });

tape('LevelDB', async (t) => {
  const ldb = new LevelDBAdapter();
  await ldb.start();
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x135',
      createdAt: new Date(12345),
      content: 'hello world 1',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x246',
      createdAt: new Date(12346),
      content: 'hello world 2',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x369',
      createdAt: new Date(12347),
      content: 'hello world 3',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x135',
      createdAt: new Date(12348),
      content: 'hello world 4',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x246',
      createdAt: new Date(12349),
      content: 'hello world 5',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 0,
      creator: '0x369',
      createdAt: new Date(12350),
      content: 'hello world 6',
    }),
  );
  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 1,
      creator: '0x369',
      createdAt: new Date(12351),
      content: 'reply world 1',
      reference:
        '0x135/3d3c510ad7e2dc888a0e36471e9245054c55d516e74cc2ad02b6304e2c98e6c7',
    }),
  );

  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 1,
      creator: '0x369',
      createdAt: new Date(12352),
      content: 'reply world 5',
      reference:
        '0x246/d05739c275c491cd2442dffa409f6500b6984c02575b1a7462bd5131b2af8ec6',
    }),
  );

  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 1,
      creator: '0x369',
      createdAt: new Date(12344),
      content: 'reply world 1',
      reference:
        '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    }),
  );

  await ldb.insertMessage(
    new Post({
      type: 1,
      subtype: 1,
      creator: '0x369',
      createdAt: new Date(12343),
      content: 'reply world 1',
      reference:
        '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    }),
  );

  await ldb.insertMessage(
    new Moderation({
      type: 2,
      subtype: 0,
      creator: '0x510',
      createdAt: new Date(12353),
      reference:
        '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    }),
  );

  await ldb.insertMessage(
    new Moderation({
      type: 2,
      subtype: 0,
      creator: '0x612',
      createdAt: new Date(12354),
      reference:
        '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    }),
  );

  await ldb.insertMessage(
    new Moderation({
      type: 2,
      subtype: 1,
      creator: '0x714',
      createdAt: new Date(12356),
      reference:
        '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    }),
  );

  await ldb.insertMessage(
    new Moderation({
      type: 2,
      subtype: 4,
      creator: '0x612',
      createdAt: new Date(12355),
      reference:
        '0x135/d2034eb9072b54c681ec832bad3faf0e1dbca78031f8bbf128b02febfde39402',
      value: 'custom value',
    }),
  );

  await ldb.insertMessage(
    new Connection({
      type: 3,
      subtype: 0,
      creator: '0x135',
      createdAt: new Date(12357),
      value: '0x246',
    }),
  );

  await ldb.insertMessage(
    new Connection({
      type: 3,
      subtype: 1,
      creator: '0x135',
      createdAt: new Date(12358),
      value: '0x369',
    }),
  );

  await ldb.insertMessage(
    new Connection({
      type: 3,
      subtype: 1,
      creator: '0x246',
      createdAt: new Date(12359),
      value: '0x135',
    }),
  );

  await ldb.insertMessage(
    new Connection({
      type: 3,
      subtype: 1,
      creator: '0x246',
      createdAt: new Date(12360),
      value: '0x369',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 0,
      creator: '0x2',
      createdAt: new Date(12361),
      value: 'zero axe 2',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 1,
      creator: '0x2',
      createdAt: new Date(12362),
      value: 'i am zero ax 2',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 2,
      creator: '0x2',
      createdAt: new Date(12363),
      value: 'pfp.png',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 2,
      creator: '0x2',
      createdAt: new Date(12364),
      value: 'pfp1.png',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 3,
      creator: '0x2',
      createdAt: new Date(12365),
      value: 'cover.png',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 4,
      creator: '0x2',
      createdAt: new Date(12366),
      value: 'cutom value',
      key: 'custom key',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 1,
      creator: '0x3',
      createdAt: new Date(12367),
      value: 'cutomvalue',
      key: 'custom key',
    }),
  );

  await ldb.insertMessage(
    new Profile({
      type: 4,
      subtype: 0,
      creator: '0x1',
      createdAt: new Date(12368),
      value: 'cutom-value',
      key: 'custom key',
    }),
  );

  const messages = (await ldb.getPosts()).map((d) => d.json);
  const userFeeds = (await ldb.getPostsByUser('0x135')).map((d) => d.json);

  const moderations = (
    await ldb.getModerations(
      '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    )
  ).map((d) => d.json);

  const likes = (
    await ldb.getModerations(
      '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
      { subtype: 0 },
    )
  ).map((d) => d.json);

  t.equal(messages.length, 6, 'Global feed should have 6 posts');

  t.equal(userFeeds.length, 2, 'User feed should have 2 posts');

  t.equal(
    messages[0].hash,
    '0c716265993c1079cd654ae933fdaec6676ac5e640a0552cc538b3d92236132f',
    'First post should be correct',
  );

  t.equal(moderations.length, 3, 'it should have 3 moderations');
  t.equal(likes.length, 2, 'it should have 2 likes');

  const conns = (await ldb.getConnections('0x135')).map((d) => d.json);
  const follows = (await ldb.getConnections('0x135', { subtype: 0 })).map(
    (d) => d.json,
  );

  t.equal(conns.length, 3, 'it should have 3 connections');
  t.equal(follows.length, 1, 'it should have 1 following');

  t.deepEqual(
    await ldb.getProfile('0x2'),
    {
      name: 'zero axe 2',
      bio: 'i am zero ax 2',
      profileImageUrl: 'pfp1.png',
      coverImageUrl: 'cover.png',
      meta: { 'custom key': 'cutom value' },
    },
    'it should return expected profile',
  );

  t.deepEqual(
    await ldb.getPostMeta(
      '0x246/fafab5bdc57d23cbabc2be0fee03fdb61782e44510b41fb47a0acc8627c22341',
    ),
    {
      moderations: { '0': 2, '1': 1 },
      replies: 2,
    },
    'it should return expected post metadata',
  );

  t.deepEqual(
    await ldb.getUserMeta('0x135'),
    {
      outgoingConnections: { 0: 1, 1: 1 },
      incomingConnections: { 1: 1 },
      posts: 2,
    },
    'it should return expected user metadata',
  );

  await ldb.stop();

  fs.rmSync('./build/db', { recursive: true, force: true });

  t.end();
});
