import { Level } from 'level';
import { AbstractSublevel, AbstractValueIteratorOptions } from 'abstract-level';
import { BaseDBAdapter, UserProfileData } from './base';
import {
  Any,
  AnyJSON,
  MessageType,
  PostSubtype,
  Post,
  Moderation,
  Connection,
  Profile,
  Message,
  ModerationSubtype,
  ConnectionSubtype,
  ProfileSubtype,
} from '@autismjs/message';
import { Mutex } from 'async-mutex';

const charwise = require('charwise');

export default class LevelDBAdapter implements BaseDBAdapter {
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
    } = {},
  ) {
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

  async insertMessage(message: Any): Promise<Any | null> {
    return this.#mutex.runExclusive(async () => {
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
            await this.#indices.thread
              .sublevel(msg.reference.split('/')[1], { valueEncoding: 'json' })
              .sublevel(MessageType[msg.type], { valueEncoding: 'json' })
              .put(time, message.hash);
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
      }

      return message;
    });
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

  async getReplies(
    reference: string,
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
          return false;
        case PostSubtype.Comment:
          return true;
        case PostSubtype.Cross:
          return !!msg.reference;
        default:
          return false;
      }
    };

    const db = this.#indices.thread
      .sublevel(reference.split('/')[1])
      .sublevel(MessageType[MessageType.Post]);

    return this.#query(db, predicate, options);
  }

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

    const db = this.#indices.thread
      .sublevel(reference.split('/')[1])
      .sublevel(MessageType[MessageType.Moderation]);

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

  async getPostMeta(reference: string): Promise<{
    moderations: { [subtype: string]: number };
    replies: number;
  }> {
    const replies = await this.getReplies(reference);
    const mods = await this.getModerations(reference);

    return {
      moderations: flattenByCreatorSubtype(mods),
      replies: replies.length,
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

  async getMessage(hash: string): Promise<Any | null> {
    try {
      const message = await this.#db.get(hash);

      if (!message) return null;

      const { createdAt, ...json } = message;

      const msg = Message.fromJSON({
        ...json,
        createdAt: new Date(createdAt),
      });

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

    if (!exists[item.creator + '/' + item.subtype]) {
      sum[item.subtype]++;
      exists[item.creator + '/' + item.subtype] = true;
    }

    return sum;
  }, {});
}
