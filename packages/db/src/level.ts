import { Level } from 'level';
import { AbstractSublevel, AbstractValueIteratorOptions } from 'abstract-level';
import { BaseDBAdapter, PostMeta, UserProfileData } from './base';
import {
  Any,
  AnyJSON,
  Connection,
  ConnectionSubtype,
  Message,
  MessageType,
  Moderation,
  ModerationSubtype,
  Post,
  PostSubtype,
  Profile,
  ProfileSubtype,
  Reference,
  Revert,
} from '@message';
import { Mutex } from 'async-mutex';
import { ConstructorOptions, EventEmitter2 } from 'eventemitter2';

const charwise = require('charwise');

export default class LevelDBAdapter
  extends EventEmitter2
  implements BaseDBAdapter
{
  #db: Level<string, AnyJSON>;
  #mutex: Mutex;

  #indices: {
    global: AbstractSublevel<any, any, string, string>;
    user: AbstractSublevel<any, any, string, string>;
    thread: AbstractSublevel<any, any, string, string>;
  };

  constructor(
    param: {
      path?: string;
      prefix?: string;
    } & ConstructorOptions = {},
  ) {
    super(param);
    const { path = process.cwd() + '/build', prefix = '' } = param;

    this.#db = new Level(`${path}/${prefix}/db`, {
      valueEncoding: 'json',
    });

    this.#indices = {
      global: this.#db.sublevel('global', {
        valueEncoding: 'json',
      }),
      user: this.#db.sublevel('user', {
        valueEncoding: 'json',
      }),
      thread: this.#db.sublevel('thread', {
        valueEncoding: 'json',
      }),
    };

    this.#mutex = new Mutex();
  }

  async start() {
    await this.#db.open();
  }

  async stop() {
    await this.#db.close();
  }

  async reindex() {
    console.log('clearing indices');
    await this.#indices.user.clear();
    await this.#indices.global.clear();
    await this.#indices.thread.clear();

    console.log('cleared indices');
    const values = await this.#db.values();
    let i = 1;
    for await (const value of values) {
      console.log(`inserting messages ${i++}`);
      const { createdAt, ...json } = value;

      const msg = Message.fromJSON({
        ...json,
        createdAt: new Date(createdAt),
      });

      await this.#db.del(msg!.hash);
      await this.insertMessage(msg!);
    }
  }

  async insertMessage(message: Any): Promise<Any | null> {
    const exist = await this.getMessage(message.hash);

    if (exist) {
      return null;
    }

    const time =
      charwise.encode(message.createdAt.getTime()) +
      '-' +
      message.creator +
      '-' +
      message.type +
      '-' +
      message.subtype;

    await this.#db.put(message.hash, message.json);

    await this.#indices.global
      .sublevel(MessageType[message.type], { valueEncoding: 'json' })
      .put(time, message.hash);

    await this.#indices.user
      .sublevel(message.creator, { valueEncoding: 'json' })
      .sublevel(MessageType[message.type], { valueEncoding: 'json' })
      .put(time, message.hash);

    await this.#indices.user
      .sublevel(message.creator, { valueEncoding: 'json' })
      .sublevel('all', { valueEncoding: 'json' })
      .put(time, message.hash);

    await this.#indices.user.sublevel('list').put(message.creator, '1');

    switch (message.type) {
      case MessageType.Post: {
        const msg = message as Post;

        if (msg.reference) {
          const hash = msg.reference.split('/')[1];

          if (hash) {
            await this.#indices.thread
              .sublevel(msg.reference.split('/')[1], { valueEncoding: 'json' })
              .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
              .put(time, message.hash);
          }
        }

        break;
      }

      case MessageType.Moderation: {
        const msg = message as Moderation;

        if (msg.reference) {
          await this.#indices.thread
            .sublevel(msg.reference.split('/')[1], { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .put(time, message.hash);
        }

        break;
      }

      case MessageType.Connection: {
        const msg = message as Connection;

        if (msg.value) {
          await this.#indices.user
            .sublevel(msg.value, { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .put(time, message.hash);
        }

        break;
      }

      case MessageType.Profile: {
        const msg = message as Profile;

        if (msg.value) {
          await this.#indices.user
            .sublevel(msg.creator, { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .put(time, message.hash);
        }

        break;
      }

      case MessageType.Revert: {
        const rvt = message as Revert;
        const msg = await this.getMessage(Reference.from(rvt.reference).hash);
        if (msg) {
          await this.revertMessage(msg);
        }
        break;
      }
    }

    return message;
  }

  async revertMessage(message: Any) {
    const exist = await this.getMessage(message.hash);

    if (!exist) {
      return null;
    }

    const time =
      charwise.encode(message.createdAt.getTime()) +
      '-' +
      message.creator +
      '-' +
      message.type +
      '-' +
      message.subtype;

    await this.#db.del(message.hash);

    await this.#indices.global
      .sublevel(MessageType[message.type], { valueEncoding: 'json' })
      .del(time);

    await this.#indices.user
      .sublevel(message.creator, { valueEncoding: 'json' })
      .sublevel(MessageType[message.type], { valueEncoding: 'json' })
      .del(time);

    await this.#indices.user
      .sublevel(message.creator, { valueEncoding: 'json' })
      .sublevel('all', { valueEncoding: 'json' })
      .del(time);

    await this.#indices.user.sublevel('list').del(message.creator);

    switch (message.type) {
      case MessageType.Post: {
        const msg = message as Post;

        if (msg.reference) {
          const hash = msg.reference.split('/')[1];

          if (hash) {
            await this.#indices.thread
              .sublevel(msg.reference.split('/')[1], { valueEncoding: 'json' })
              .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
              .del(time);
          }
        }

        break;
      }

      case MessageType.Moderation: {
        const msg = message as Moderation;

        if (msg.reference) {
          await this.#indices.thread
            .sublevel(msg.reference.split('/')[1], { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .del(time);
        }

        break;
      }

      case MessageType.Connection: {
        const msg = message as Connection;

        if (msg.value) {
          await this.#indices.user
            .sublevel(msg.value, { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .del(time);
        }

        break;
      }

      case MessageType.Profile: {
        const msg = message as Profile;

        if (msg.value) {
          await this.#indices.user
            .sublevel(msg.creator, { valueEncoding: 'json' })
            .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
            .del(time);
        }

        break;
      }
    }

    this.emit('db:message:revert', message.json);
  }

  async #query(
    db: AbstractSublevel<any, any, string, string>,
    predicate: (msg: Any) => boolean = () => true,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Any[]> {
    const { reverse = true, limit, offset } = options || {};

    const queryOptions: AbstractValueIteratorOptions<any, any> = {
      reverse,
      valueEncoding: 'json',
    };

    const data: Any[] = [];

    if (typeof offset === 'string') {
      const { createdAt } = await this.#db.get(offset);
      const time = charwise.encode(new Date(createdAt).getTime());

      if (reverse) {
        queryOptions.lt = time;
      } else {
        queryOptions.gt = time;
      }
    }

    for await (const hash of db.values(queryOptions)) {
      const { createdAt, ...json } = await this.#db.get(hash);
      const msg = Message.fromJSON({
        ...json,
        createdAt: new Date(createdAt),
      });

      if (msg && predicate(msg as Any)) {
        data.push(msg);
        if (typeof limit !== 'undefined' && data.length >= limit) {
          return data;
        }
      }
    }

    return data;
  }

  async getPosts(options?: {
    reverse?: boolean;
    limit?: number;
    offset?: string;
  }): Promise<Post[]> {
    const predicate = (msg: Any) => {
      switch (msg.subtype) {
        case PostSubtype.Default:
        case PostSubtype.Repost:
          return true;
        case PostSubtype.Comment:
          return false;
        case PostSubtype.Cross:
          return !msg.reference;
        default:
          return false;
      }
    };

    const db = this.#indices.global.sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options) as Promise<Post[]>;
  }

  async getPostsByUser(
    user: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Any[]> {
    const predicate = (msg: Any) => {
      switch (msg.subtype) {
        case PostSubtype.Default:
        case PostSubtype.Repost:
          return true;
        case PostSubtype.Comment:
          return false;
        case PostSubtype.Cross:
          return !msg.reference;
        default:
          return false;
      }
    };

    const db = this.#indices.user
      .sublevel(user)
      .sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options);
  }

  async getMessagesByUser(
    user: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Any[]> {
    const predicate = () => {
      return true;
    };

    const db = this.#indices.user.sublevel(user).sublevel('all');

    return this.#query(db, predicate, options);
  }

  getReplies = async (
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Post[]> => {
    if (!reference) return [];

    const predicate = (msg: Any) => {
      switch (msg.subtype) {
        case PostSubtype.Default:
        case PostSubtype.Repost:
          return false;
        case PostSubtype.Comment:
          return true;
        case PostSubtype.Cross:
          return !!msg.reference;
        default:
          return false;
      }
    };

    const hash = reference.split('/')[1] || reference;

    if (!hash) return [];

    const db = this.#indices.thread
      .sublevel(hash)
      .sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options) as Promise<Post[]>;
  };

  getReposts = async (
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Post[]> => {
    if (!reference) return [];

    const predicate = (msg: Any) => {
      switch (msg.subtype) {
        case PostSubtype.Repost:
          return true;
        default:
          return false;
      }
    };

    const hash = reference.split('/')[1] || reference;

    if (!hash) return [];

    const db = this.#indices.thread
      .sublevel(hash)
      .sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options) as Promise<Post[]>;
  };

  async getModerations(
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
      subtype?: ModerationSubtype;
    },
  ): Promise<Any[]> {
    const predicate = (msg: Any) => {
      return (
        typeof options?.subtype === 'undefined' ||
        msg.subtype === options?.subtype
      );
    };

    const hash = reference.split('/')[1] || reference;

    if (!hash) return [];

    const db = this.#indices.thread
      .sublevel(hash)
      .sublevel(MessageType[MessageType.Moderation]);

    return this.#query(db, predicate, options);
  }

  async getThreads(
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
      subtype?: ModerationSubtype;
    },
  ): Promise<Any[]> {
    const predicate = (msg: Any) => {
      return (
        typeof options?.subtype === 'undefined' ||
        msg.subtype === options?.subtype
      );
    };

    const hash = reference.split('/')[1] || reference;

    if (!hash) return [];

    const db = this.#indices.thread
      .sublevel(hash)
      .sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options);
  }

  async getConnections(
    user: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
      subtype?: ConnectionSubtype;
    },
  ): Promise<Any[]> {
    const predicate = (msg: Any) => {
      return (
        typeof options?.subtype === 'undefined' ||
        msg.subtype === options?.subtype
      );
    };

    const db = this.#indices.user
      .sublevel(user)
      .sublevel(MessageType[MessageType.Connection]);

    return this.#query(db, predicate, options);
  }

  async getProfile(user: string): Promise<UserProfileData> {
    const db = this.#indices.user
      .sublevel(user)
      .sublevel(MessageType[MessageType.Profile]);

    const profiles = await this.#query(db);

    const lastUpdated: {
      name: number;
      bio: number;
      profileImageUrl: number;
      coverImageUrl: number;
      meta: { [k: string]: number };
    } = {
      name: 0,
      bio: 0,
      profileImageUrl: 0,
      coverImageUrl: 0,
      meta: {},
    };

    const profile: UserProfileData = {
      name: '',
      bio: '',
      profileImageUrl: '',
      coverImageUrl: '',
      meta: {},
    };

    for (const m of profiles) {
      switch (m.subtype) {
        case ProfileSubtype.Name:
          if (lastUpdated.name < m.createdAt.getTime()) {
            profile.name = m.value;
            lastUpdated.name = m.createdAt.getTime();
          }
          break;
        case ProfileSubtype.Bio:
          if (lastUpdated.bio < m.createdAt.getTime()) {
            profile.bio = m.value;
            lastUpdated.bio = m.createdAt.getTime();
          }
          break;
        case ProfileSubtype.CoverImageUrl:
          if (lastUpdated.coverImageUrl < m.createdAt.getTime()) {
            profile.coverImageUrl = m.value;
            lastUpdated.coverImageUrl = m.createdAt.getTime();
          }
          break;
        case ProfileSubtype.ProfileImageUrl:
          if (lastUpdated.profileImageUrl < m.createdAt.getTime()) {
            profile.profileImageUrl = m.value;
            lastUpdated.profileImageUrl = m.createdAt.getTime();
          }
          break;
        case ProfileSubtype.Custom:
          if (m.key && (lastUpdated.meta[m.key] || 0) < m.createdAt.getTime()) {
            profile.meta[m.key] = m.value;
            lastUpdated.meta[m.key] = m.createdAt.getTime();
          }
          break;
        default:
          break;
      }
    }

    return profile;
  }

  async getPostMeta(reference: string, own?: string | null): Promise<PostMeta> {
    const mods = await this.getModerations(reference);
    const threads = await this.getThreads(reference);

    return {
      moderations: flattenByCreatorSubtype(mods),
      threads: flattenByCreatorSubtype(threads),
      moderated: reduceByCreatorSubtype(mods, own),
      threaded: reduceByCreatorSubtype(threads, own),
    };
  }

  async getUserMeta(user: string): Promise<{
    outgoingConnections: { [subtype: string]: number };
    incomingConnections: { [subtype: string]: number };
    posts: number;
  }> {
    const conns = await this.getConnections(user);
    const feed = await this.getPostsByUser(user);
    const owns = conns.filter(({ creator }) => creator === user);
    const others = conns.filter(({ creator }) => creator !== user);

    return {
      outgoingConnections: flattenByCreatorSubtype(owns),
      incomingConnections: flattenByCreatorSubtype(others),
      posts: feed.length,
    };
  }

  async getAllUsernames(): Promise<string[]> {
    const keys = await this.#indices.user.sublevel('list').keys();
    const names = [];
    for await (const key of keys) {
      names.push(key);
    }
    return names;
  }

  async getMessage<MessageType = Any>(
    hash: string,
  ): Promise<MessageType | null> {
    try {
      const message = await this.#db.get(hash);

      if (!message) return null;

      const { createdAt, ...json } = message;

      const msg = Message.fromJSON({
        ...json,
        createdAt: new Date(createdAt),
      }) as MessageType;

      return msg;
    } catch (e) {
      return null;
    }
  }
}

function flattenByCreatorSubtype(items: Any[]): { [subtype: string]: number } {
  const exists: { [k: string]: boolean } = {};

  return items.reduce((sum: { [k: string]: number }, item) => {
    sum[item.subtype] = sum[item.subtype] || 0;

    if (
      item.subtype === PostSubtype.Comment ||
      !exists[item.creator + '/' + item.subtype]
    ) {
      sum[item.subtype]++;
      exists[item.creator + '/' + item.subtype] = true;
    }

    return sum;
  }, {});
}

function reduceByCreatorSubtype(
  msgs: Any[],
  own?: string | null,
): { [subtype: string]: string } {
  const obj: {
    [key: string]: string;
  } = {};

  if (own) {
    for (const msg of msgs) {
      if (msg.creator === own) {
        obj[msg.subtype] = msg.messageId;
      }
    }
  }

  return obj;
}
