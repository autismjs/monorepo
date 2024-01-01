import { Observable, ObservableMap } from '../../lib/state.ts';
import { Autism } from '@protocol/browser';
import {
  AnyJSON,
  Message,
  MessageType,
  Moderation,
  Post,
  PostSubtype,
  Reference,
} from '@message';
import { PostMeta, UserProfileData } from '@autismjs/db/src/base.ts';
import { equal } from '../utils/misc.ts';

export class NodeStore {
  node: Autism;
  #wait: Promise<void>;

  $globalPosts: Observable<string[]>;
  $replies: ObservableMap<string, string[]>;
  $posts: ObservableMap<string, Post>;
  $users: ObservableMap<string, UserProfileData>;
  $postmetas: ObservableMap<string, PostMeta>;

  onPubsub = async (m: AnyJSON) => {
    const msg = Message.fromJSON(m);
    switch (msg?.type) {
      case MessageType.Post: {
        const post = msg as Post;
        if (post.subtype === PostSubtype.Default) {
          this.#updatePosts();
          this.getPost(post.hash!);
          this.getReplies(post.messageId);
          this.getPostMeta(post.messageId);
        }
        if ([PostSubtype.Repost].includes(post.subtype)) {
          this.#updatePosts();
          this.getPost(Reference.from(post.reference!).hash);
          this.getReplies(post.reference!);
          this.getPostMeta(post.reference);
        }
        if ([PostSubtype.Comment].includes(post.subtype)) {
          this.getReplies(post.reference!);
          this.getPost(Reference.from(post.reference!).hash);
          this.getPostMeta(post.reference);
        }
        return;
      }
      case MessageType.Moderation: {
        const mod = msg as Moderation;
        this.getPostMeta(mod.reference);
        return;
      }
      default:
        console.log('unknown pubsub message', msg);
        return;
    }
  };

  constructor() {
    this.$replies = new ObservableMap<string, string[]>(this.getReplies);
    this.$posts = new ObservableMap<string, Post>(this.getPost);
    this.$users = new ObservableMap<string, UserProfileData>(this.getUser);
    this.$postmetas = new ObservableMap<string, PostMeta>(this.getPostMeta);
    this.$globalPosts = new Observable<string[]>([]);

    const node = new Autism({
      bootstrap: [
        '/ip4/192.168.86.24/tcp/64504/ws/p2p/12D3KooWJbNSyqzs73XUNz2WvHaYwizN5EZ7WJyvgmWMBhV8v4uY',
      ],
    });

    this.node = node;
    this.#updatePosts();

    node.on('p2p:peer:connect', (peer) => {
      console.log('peer connected', peer);
    });

    node.on('pubsub:message:success', (msg) => this.onPubsub(msg));
    node.on('pubsub:message:revert', (msg) => this.onPubsub(msg));

    node.on('sync:new_message', (msg) => {
      console.log('sync:new_message', msg);
      this.onPubsub(msg);
    });

    this.#wait = new Promise(async (r) => {
      await this.node.start();
      await this.#updatePosts();
      r();
    });
  }

  async waitForStart() {
    return this.#wait;
  }

  #updatePosts = async () => {
    const posts = await this.node.db.db.getPosts();

    this.$globalPosts.$ = posts.map((p) => {
      if (this.$posts.get(p.hash).$?.hex !== p.hex) {
        this.$posts.set(p.hash, p);
      }
      return p.hash;
    });

    console.log(`total ${this.$globalPosts.$.length} posts`);
  };

  getPostMeta = (messageId?: string, own?: string | null) => {
    if (!messageId) return null;

    const store = this.$postmetas.get(messageId);

    this.node.db.db.getPostMeta(messageId, own).then((meta) => {
      if (!equal(store.$, meta)) {
        store.$ = meta;
      }
    });
    return store.$;
  };

  async getParents(hash: string, list: string[] = []): Promise<string[]> {
    const p = this.getPost(hash);
    const post = p || (await this.node.db.db.getMessage<Post>(hash));

    const reference = post?.reference || '';
    const [creator, refhash] = reference.split('/');
    const parentHash = refhash || creator;

    if (post && parentHash) {
      const pr = this.getPost(parentHash);
      const parent = pr || (await this.node.db.db.getMessage<Post>(parentHash));

      if (parent && this.getPost(parentHash)?.hex !== parent?.hex) {
        this.$posts.get(parentHash).$ = parent;
      }

      if (parent) {
        return this.getParents(parent.hash, [
          (parent as Post).messageId,
          ...list,
        ]);
      }
    }

    return list;
  }

  getRepostRef(hash: string) {
    const post = $node.$posts.get(hash);
    const repostRef =
      post.$?.subtype === PostSubtype.Repost ? post.$.reference : '';
    const [rpCreator, rpHash] = repostRef?.split('/') || [];
    const repostHash = rpHash || rpCreator;

    if (repostHash) {
      return $node.$posts.get(repostHash);
    }

    return null;
  }

  getReplies = (messageId: string) => {
    const $replies = this.$replies.get(messageId);
    this.node.db.db.getReplies(messageId).then((replies) => {
      $replies.$ = replies.map((p) => {
        if (this.$posts.get(p.hash).$?.hex !== p.hex) {
          this.$posts.set(p.hash, p);
        }
        return p.messageId;
      });
    });
    return $replies.$;
  };

  getPost = (hash: string) => {
    const store = this.$posts.get(hash);

    this.node.db.db.getMessage(hash).then((message) => {
      if (store.$?.hex !== message?.hex) {
        store.$ = message as Post;
      }
    });

    return store.$;
  };

  getUser = (creator = '') => {
    const store = this.$users.get(creator);
    this.node.db.db.getProfile(creator).then((profile) => {
      store.$ = profile;
    });
    return store.$;
  };
}

const $node = new NodeStore();
export default $node;
