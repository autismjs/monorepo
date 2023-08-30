import { EventEmitter2, ConstructorOptions } from 'eventemitter2';
import { Any, Message, ProofType } from '@autismjs/message';
import {
  P2P,
  ProtocolType,
  ProtocolResponseParam,
  ProtocolRequestParam,
} from './p2p';
import { DB } from './db';
import { PubsubTopics } from '../utils/types';
import { wait } from '../utils/test';
import { ECDSA, hexify } from '@autismjs/crypto';
import { version } from '../../package.json';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { PeerId } from '@libp2p/interface/peer-id';
import { Mutex } from 'async-mutex';

export class Autism extends EventEmitter2 {
  p2p: P2P;
  db: DB;
  #name: string;
  #mutex: Mutex;

  constructor(
    options?: ConstructorOptions & {
      name?: string;
      bootstrap?: string[];
      port?: number;
      start?: boolean;
      relay?: boolean;
    },
  ) {
    super(options);
    this.#name = options?.name || 'node';
    this.#mutex = new Mutex();
    this.p2p = new P2P({
      ...options,
      name: this.#name,
    });
    this.db = new DB({
      ...options,
      name: this.#name,
    });
  }

  get name() {
    return this.#name;
  }

  #onAny = async (event: string | string[], value: any) => {
    this.emit('p2p:' + event, value);
  };

  #onGlobalPubSub = async (value: any) => {
    try {
      const message = Message.fromHex(Buffer.from(value.data).toString('hex'));

      if (!message) return;
      if (!message.proof) return;

      if (message.proof.type === ProofType.ECDSA) {
        const creatoryKey = new ECDSA({
          publicKey: message?.creator,
        });

        const verified = creatoryKey.verify(message.hash, message.proof.value);

        if (!verified) return;

        await this.db.insertMessage(message);
        this.emit('pubsub:message:success', message.json);
        return;
      }
    } catch (e) {
      this.emit(`pubsub:error`, e);
    }
  };

  #handleGetInfo = async (_req: any, res: ProtocolResponseParam) => {
    const names = await this.db.db.getAllUsernames();
    res.send(
      Buffer.from(
        JSON.stringify({
          version: version,
          users: names,
        }),
        'utf-8',
      ),
    );
  };

  #handleSync = (req: ProtocolRequestParam, res: ProtocolResponseParam) => {
    return this.#mutex.runExclusive(async () => {
      const body = Buffer.from(req.body, 'hex').toString('utf-8');
      const { user, root } = JSON.parse(body);

      const merkle = await this.db.merklize(user);

      const children = merkle.getChildren(BigInt(root));

      // console.log(`[${this.name}] handleSync`, {
      //   user,
      //   root: BigInt(root).toString(),
      //   children,
      // });

      if (!children) {
        const message = await this.db.getMessage(hexify(root));
        if (message) {
          res.send(
            Buffer.from(
              JSON.stringify({
                messages: [message.hex],
              }),
              'utf-8',
            ),
          );
        } else {
          res.send(Buffer.from(JSON.stringify({}), 'utf-8'));
        }
        return;
      }

      if (children) {
        res.send(
          Buffer.from(
            JSON.stringify({
              children: children
                .filter((d) => d !== BigInt(0x0))
                .map((n) => '0x' + n.toString(16)),
            }),
            'utf-8',
          ),
        );
      }
    });
  };

  #syncUserWithPeer = async (peerId: PeerId, user: string, root: string) => {
    // console.log(`[${this.name}] syncUserWithPeer`, {
    //   user,
    //   root,
    // });
    const res = await this.p2p.dialProtocol(
      peerId,
      [ProtocolType.V1Sync],
      Buffer.from(JSON.stringify({ user, root }), 'utf-8'),
    );
    const merkle = await this.db.merklize(user);

    const json = await res.json();

    if (!json.children && !json.messages) return;

    for (const node of json.children || []) {
      if (BigInt(node) === BigInt(0x0)) {
        console.log(`[${this.name}] blank, skip sync`);
        continue;
      }

      const found = merkle.getHash(node);

      if (found) {
        console.log(`[${this.name}] found, skip sync`);
        continue;
      }

      await wait(100);

      await this.#syncUserWithPeer(peerId, user, node);
    }

    if (json.messages) {
      for (const hex of json.messages) {
        const msg = Message.fromHex(hex);
        if (msg && !(await this.db.getMessage(msg.hash))) {
          const success = await this.db.insertMessage(msg);
          if (success) {
            this.emit('sync:new_message', msg.json);
          }
        }
      }
    }
  };

  #dialSync = async (peerId: PeerId) => {
    return this.#mutex.runExclusive(async () => {
      const info = await this.p2p.dialProtocol(peerId, [ProtocolType.V1Info]);
      const { users } = await info.json();

      for (const user of users) {
        const merkle = await this.db.merklize(user);
        const root = '0x' + merkle.root.toString(16);

        // console.log(`[${this.name}] dialSync`, {
        //   user,
        //   root: merkle.root,
        // });

        this.#syncUserWithPeer(peerId, user, root);
      }
    });
  };

  async publish(message: Any) {
    if (message.proof?.type === ProofType.ECDSA) {
      const creatoryKey = new ECDSA({
        publicKey: message?.creator,
      });
      const verified = creatoryKey.verify(message.hash, message.proof.value);

      if (!verified) return;

      return this.p2p.publish(PubsubTopics.Global, message.buffer);
    }
  }

  async start() {
    this.p2p.onAny(this.#onAny);
    this.p2p.on(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    this.p2p.on('peer:connect', this.#dialSync);

    await this.db.start();
    await this.p2p.start();

    this.p2p.handle(ProtocolType.V1Info, this.#handleGetInfo);
    this.p2p.handle(ProtocolType.V1Sync, this.#handleSync);
  }

  async stop() {
    this.p2p.offAny(this.#onAny);
    this.p2p.off(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    await this.db.stop();
    await this.p2p.stop();
  }
}
