// @ts-ignore
import tape from 'tape';
import {
  Post,
  Moderation,
  Connection,
  Profile,
  Message,
  Chat,
  Group,
  Revert,
  MessageType,
  PostSubtype,
  ModerationSubtype,
  ConnectionSubtype,
  ProfileSubtype,
  ChatSubtype,
  GroupSubtype,
  RevertSubtype,
} from '.';
import { ProofType } from './models/base';

tape('Message Format', (t) => {
  tape('Post', (test) => {
    const postA = new Post({
      type: MessageType.Post,
      subtype: PostSubtype.Default,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      content:
        'In order to sterilize a container, the container is placed in a sterilization device. The sterilization device typically includes a chamber, a heater, and a fan. The chamber is sufficiently large to contain the container. The heater heats the container to a predetermined',
      topic: 'hello topic',
      title: 'Description of the Prior Art',
      reference:
        '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
      attachment: [
        '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
        'https://docs.auti.sm',
      ],
    });

    const postB = Message.fromHex(postA.hex) as Post;

    postA.commit({
      type: ProofType.ECDSA,
      value: '0x1234567890abcdef',
    });

    postB.commit({
      type: ProofType.ECDSA,
      value: '0x1234567890abcdef',
    });

    test.equal(
      Message.fromHex(postB.hex)?.hex,
      postB.hex,
      'after commit, should serialize and deserialize with hex',
    );

    test.equal(
      postA.hex,
      postB.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(postA.json, new Post(postA.json).json, 'should export json');
    test.deepEqual(
      postA.json,
      {
        proof: { type: 0, value: '0x1234567890abcdef' },
        hash: '618fb973a7afd24093e7718dba49e57e37e33f3b93ffa30da93efc1d2c42fd2d',
        type: MessageType.Post,
        subtype: PostSubtype.Default,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        content:
          'In order to sterilize a container, the container is placed in a sterilization device. The sterilization device typically includes a chamber, a heater, and a fan. The chamber is sufficiently large to contain the container. The heater heats the container to a predetermined',
        topic: 'hello topic',
        title: 'Description of the Prior Art',
        reference:
          '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
        attachment: [
          '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
          'https://docs.auti.sm',
        ],
      },
      'should match values',
    );

    test.end();
  });

  tape('Moderation', (test) => {
    const modA = new Moderation({
      type: MessageType.Moderation,
      subtype: ModerationSubtype.Emoji,
      createdAt: new Date(0x018a01173656),
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      reference: 'thread-id',
      value: 'u-10000',
    });

    const modB = Message.fromHex(modA.hex) as Moderation;

    test.equal(
      modA.hex,
      modB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(
      modA.json,
      new Moderation(modB.json).json,
      'should export json',
    );

    test.deepEqual(
      modA.json,
      {
        hash: 'a82a1832b7965bb9e972a2cc8caa7b4cbedfaff296408fd3dc6f7d0ce2abca4a',
        type: MessageType.Moderation,
        subtype: ModerationSubtype.Emoji,
        createdAt: modA.createdAt,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        reference: 'thread-id',
        value: 'u-10000',
        proof: undefined,
      },
      'should match values',
    );

    test.end();
  });

  tape('Connection', (test) => {
    const connA = new Connection({
      type: MessageType.Connection,
      subtype: ConnectionSubtype.Block,
      createdAt: new Date(0x018a01173656),
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      value: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
    });

    const connB = Message.fromHex(connA.hex) as Connection;
    test.equal(
      connA.hex,
      connB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(
      connA.json,
      new Connection(connB.json).json,
      'should export json',
    );

    test.deepEqual(
      connA.json,
      {
        hash: 'bf5c16cd36d7397ae7376a0113d3f84af6884bb9c95f4dc7710bb8b2caa38e6f',
        type: MessageType.Connection,
        subtype: ConnectionSubtype.Block,
        createdAt: connA.createdAt,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        value: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        proof: undefined,
      },
      'should match values',
    );

    test.end();
  });

  tape('Profile', (test) => {
    const msgA = new Profile({
      type: MessageType.Profile,
      subtype: ProfileSubtype.Custom,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      key: 'cover',
      value: 'image.url',
    });

    const msgB = Message.fromHex(msgA.hex) as Profile;

    test.equal(
      msgA.hex,
      msgB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(
      msgA.json,
      new Profile(msgB.json).json,
      'should export json',
    );

    test.deepEqual(
      msgA.json,
      {
        hash: '1af0c2fa1a3e383ddd2c1d0eebc663f69ea42fdc3d150e29fba408b246dd4db3',
        type: MessageType.Profile,
        subtype: ProfileSubtype.Custom,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        key: 'cover',
        value: 'image.url',
        proof: undefined,
      },
      'should match values',
    );

    test.end();
  });

  tape('Chat', (test) => {
    const msgA = new Chat({
      type: MessageType.Chat,
      subtype: ChatSubtype.DirectMessage,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      to: {
        key: 'to-key-1',
        seed: '',
      },
      from: {
        key: 'from-key-1',
        seed: '0x12334',
      },
      destination: '0x1234567890abcdef',
      content: 'hello!"',
      reference: 'referrence',
      attachment: ['a', 'ab', 'abcdefg'],
    });

    const msgB = Message.fromHex(msgA.hex) as Chat;

    test.equal(
      msgA.hex,
      msgB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(msgA.json, new Chat(msgB.json).json, 'should export json');

    test.deepEqual(
      msgA.json,
      {
        hash: 'c9be4eb938f9b23820ba0d1ce5451687523d6b5e0d401a6f77431642f0799d2a',
        type: MessageType.Chat,
        subtype: ChatSubtype.DirectMessage,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        to: {
          key: 'to-key-1',
          seed: '',
        },
        from: {
          key: 'from-key-1',
          seed: '0x12334',
        },
        destination: '0x1234567890abcdef',
        content: 'hello!"',
        reference: 'referrence',
        attachment: ['a', 'ab', 'abcdefg'],
        proof: undefined,
      },
      'should match values',
    );

    test.end();
  });

  tape('Group', (test) => {
    const msgA = new Group({
      type: MessageType.Group,
      subtype: GroupSubtype.MemberRequest,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      groupId: 'db-id',
      data: ['a', 'ab', 'abcdefg'],
    });

    const msgB = Message.fromHex(msgA.hex) as Group;

    const msgC = new Group({
      type: MessageType.Group,
      subtype: GroupSubtype.Broadcast,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      groupId: 'db-id',
      data: msgA.hex,
    });

    const msgD = Message.fromHex(msgC.hex) as Group;

    test.equal(
      msgA.hex,
      msgB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(msgA.json, new Group(msgB.json).json, 'should export json');

    test.equal(
      msgC.hex,
      msgD!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(msgC.json, new Group(msgD.json).json, 'should export json');

    test.deepEqual(
      msgA.json,
      {
        hash: 'f48e5808044c6b07e4a6c94aa12d44b60c55b9e5bc44c953840179454f61f58f',
        type: MessageType.Group,
        subtype: GroupSubtype.MemberRequest,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        groupId: 'db-id',
        data: ['a', 'ab', 'abcdefg'],
        proof: undefined,
      },
      'should match values',
    );

    test.deepEqual(
      msgC.json,
      {
        hash: '9061fc18475bf39243af2eed49e8e8183cdbf79eaafdcccb4f8bf4157178731b',
        type: MessageType.Group,
        subtype: GroupSubtype.Broadcast,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        groupId: 'db-id',
        data: msgA.hex,
        proof: undefined,
      },
      'should match values',
    );

    test.deepEqual(
      msgA.json,
      Message.fromHex(msgC.data as string)!.json,
      'should match values',
    );

    test.end();
  });

  tape('Revert', (test) => {
    const msgA = new Revert({
      type: MessageType.Revert,
      subtype: RevertSubtype.Default,
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      createdAt: new Date(0x018a01173656),
      reference:
        '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2/4a9e2acdd98c42a873ff064d62a660696560d968e4af9a61b74b2b02da83a35c',
    });

    const msgB = Message.fromHex(msgA.hex) as Revert;

    test.equal(
      msgA.hex,
      msgB!.hex,
      'should serialize and deserialize with hex',
    );

    test.deepEqual(msgA.json, new Revert(msgB.json).json, 'should export json');

    test.deepEqual(
      msgA.json,
      {
        hash: '1ab0e9642e1ac857132112cc4bed955e8c10c20d1656d16ba5b3bed11a6ba2e0',
        type: MessageType.Revert,
        subtype: RevertSubtype.Default,
        creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
        createdAt: new Date(0x018a01173656),
        proof: undefined,
        reference:
          '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2/4a9e2acdd98c42a873ff064d62a660696560d968e4af9a61b74b2b02da83a35c',
      },
      'should match values',
    );

    test.end();
  });

  t.end();
});
