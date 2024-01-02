import { EventEmitter2 } from 'eventemitter2';
import { Any, Message, ProofType } from '@message';
import {
  BaseP2P,
  ProtocolRequestParam,
  ProtocolResponseParam,
  ProtocolType,
} from './p2p/base.ts';
import { DB } from './db';
import { PubsubTopics } from '../utils/types';
import { ECDSA, hexify } from '@crypto';
import { version } from '../../package.json';
// @ts-ignore
import type { PeerId } from '@libp2p/interface/peer-id';
import { Mutex } from 'async-mutex';

export class BaseNode extends EventEmitter2 {
  p2p: BaseP2P;
  db: DB;
  syncTimeout: any | null;
  sync: number;
  name: string;
  nameMutex: {
    [name: string]: Mutex;
  };

  #getMutex = (name: string): Mutex => {
    this.nameMutex[name] = this.nameMutex[name] || new Mutex();
    return this.nameMutex[name];
  };

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

        if (await this.db.insertMessage(message)) {
          this.emit('pubsub:message:success', message.json);
        }
        return;
      } else if (message.proof.type === ProofType.Semaphore) {
        console.log('wow');
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

  #handleSync = async (
    req: ProtocolRequestParam,
    res: ProtocolResponseParam,
  ) => {
    const body = Buffer.from(req.body, 'hex').toString('utf-8');
    const { user, root, depth, index } = JSON.parse(body);

    const merkle = await this.db.merklize(user);

    const children = merkle.checkHash(depth, index, BigInt(root));

    if (!children) {
      const message = await this.db.getMessage(
        hexify(merkle.leaves[index]).padStart(64, '0'),
      );

      if (message) {
        console.log(`sending 1 message`);
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
    } else if (children && typeof children === 'object') {
      res.send(
        Buffer.from(
          JSON.stringify({
            children: children,
          }),
          'utf-8',
        ),
      );
    } else {
      res.send(Buffer.from(JSON.stringify({}), 'utf-8'));
    }
  };

  #syncUserWithPeer = async (
    peerId: PeerId,
    user: string,
    root: string,
    depth = 0,
    index = 0,
  ) => {
    const res = await this.p2p.dialProtocol(
      peerId,
      [ProtocolType.V1Sync],
      Buffer.from(
        JSON.stringify({
          user,
          root,
          depth,
          index,
        }),
        'utf-8',
      ),
    );

    const merkle = await this.db.merklize(user);

    const json = await res.json();

    if (!json.children && !json.messages) {
      return;
    }

    if (json.children) {
      const { depth: _depth, indices, hashes } = json.children;

      let i = 0;

      for (const node of hashes) {
        if (BigInt(node) === BigInt(0x0)) {
          i++;
          continue;
        }

        const found = merkle.getHash(node);

        if (found) {
          i++;
          continue;
        }

        await this.#syncUserWithPeer(
          peerId,
          user,
          '0x1a2b3cc',
          _depth,
          indices[i],
        );
        i++;
      }
    }

    if (json.messages) {
      console.log(`received ${json.messages.length} new messages`);
      for (const hex of json.messages) {
        const msg = Message.fromHex(hex);
        if (msg) {
          if (await this.db.insertMessage(msg)) {
            this.emit('sync:new_message', msg);
          }
        }
      }
    }
  };

  #dialSync = async (peerId: PeerId) => {
    const info = await this.p2p.dialProtocol(peerId, [ProtocolType.V1Info]);
    const { users = [] } = (await info.json()) || {};

    for (const user of users) {
      const merkle = await this.db.merklize(user);
      const root = '0x' + merkle.root.toString(16);
      await this.#syncUserWithPeer(peerId, user, root);
    }
  };

  #startSync = async () => {
    if (this.syncTimeout) return;

    const peers = this.p2p.node?.getPeers() || [];
    for (const peerId of peers) {
      await this.#dialSync(peerId);
    }

    this.syncTimeout = setTimeout(() => {
      this.syncTimeout = null;
      this.#startSync();
    }, this.sync);
  };

  async publish(message: Any) {
    if (message.proof?.type === ProofType.ECDSA) {
      const creatoryKey = new ECDSA({
        publicKey: message?.creator,
      });
      const verified = creatoryKey.verify(message.hash, message.proof.value);

      if (!verified) return;

      this.p2p.publish(PubsubTopics.Global, message.buffer);
    }
  }

  async start() {
    this.p2p.onAny(this.#onAny);
    this.p2p.on(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    this.p2p.once('peer:connect', this.#startSync);
    this.p2p.on('peer:connect', this.#dialSync);

    await this.db.start();
    await this.p2p.start();

    this.p2p.handle(ProtocolType.V1Info, this.#handleGetInfo);
    this.p2p.handle(ProtocolType.V1Sync, this.#handleSync);
  }

  async stop() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    await this.p2p.offAny(this.#onAny);
    await this.p2p.off(`pubsub:${PubsubTopics.Global}`, this.#onGlobalPubSub);
    await this.db.stop();
    await this.p2p.stop();
  }
}
