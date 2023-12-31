import { Observable, ObservableMap } from '../../lib/state.ts';
import { Autism } from '@protocol/browser';
import {
  Any,
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

  $globalPosts = new Observable<string[]>([]);
  $replies = new ObservableMap<string, string[]>();
  $posts = new ObservableMap<string, Post>();
  $users = new ObservableMap<string, UserProfileData>();
  $postmetas = new ObservableMap<string, PostMeta>();

  onPubsub = (msg: Any) => {
    switch (msg.type) {
      case MessageType.Post: {
        const post = msg as Post;
        if (post.subtype === PostSubtype.Default) {
          this.#updatePosts(msg);
          this.getPost(post.hash!);
          this.getReplies(post.messageId);
          this.getPostMeta(post.messageId);
        }
        if ([PostSubtype.Repost].includes(post.subtype)) {
          this.#updatePosts(msg);
          this.getPost(Reference.from(post.reference!).hash);
          this.getReplies(post.reference!);
          this.getPostMeta(post.reference);
        }
        if ([PostSubtype.Comment].includes(post.subtype)) {
          this.getReplies(post.messageId);
          this.getPost(Reference.from(post.reference!).hash);
          this.getPostMeta(post.reference);
        }
        return;
      }
      case MessageType.Moderation: {
        const mod = msg as Moderation;
        this.getPostMeta(mod.reference);
      }
    }
  };

  constructor() {
    const node = new Autism({
      bootstrap: [
        '/ip4/192.168.86.24/tcp/58937/ws/p2p/12D3KooWCU7HfBs3Md9e7DyNqnCubWH5w7dZLLdQSwjHaQXDSiGD',
      ],
    });

    this.node = node;
    this.#updatePosts();

    node.on('p2p:peer:connect', (peer) => {
      console.log('peer connected', peer);
    });

    node.on('pubsub:message:success', this.onPubsub);

    node.on('sync:new_message', this.onPubsub);

    this.#wait = new Promise(async (r) => {
      await this.node.start();
      await this.#updatePosts();
      r();
    });
  }

  async waitForStart() {
    return this.#wait;
  }

  #updatePosts = async (msg?: Post) => {
    const posts = await this.node.db.db.getPosts();
    console.log(`updating ${posts.length} posts...`, msg);

    if (msg) {
      this.$globalPosts.$ = [msg.hash].concat(this.$globalPosts.$);
    } else {
      this.$globalPosts.$ = posts.map((p) => {
        if (this.$posts.get(p.hash).$?.hex !== p.hex) {
          this.$posts.set(p.hash, p);
        }
        return p.hash;
      });
    }
  };

  getPostMeta(messageId?: string, own?: string | null) {
    if (!messageId) return null;

    const store = this.$postmetas.get(messageId);

    this.node.db.db.getPostMeta(messageId, own).then((meta) => {
      if (!equal(store.$, meta)) {
        store.$ = meta;
      }
    });
    return store.$;
  }

  async #updateReplies(messageId: string) {
    const replies = await this.node.db.db.getReplies(messageId);
    const $replies = this.$replies.get(messageId);
    $replies.$ = replies.map((p) => {
      if (this.$posts.get(p.hash).$?.hex !== p.hex) {
        this.$posts.set(p.hash, p);
      }
      return p.messageId;
    });
  }

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
    const post = $node.getPost(hash);
    const repostRef =
      post?.subtype === PostSubtype.Repost ? post.reference : '';
    const [rpCreator, rpHash] = repostRef?.split('/') || [];
    const repostHash = rpHash || rpCreator;

    if (repostHash) {
      return $node.getPost(repostHash);
    }

    return null;
  }

  getReplies(messageId: string) {
    this.#updateReplies(messageId);
    const $replies = this.$replies.get(messageId);
    return $replies.$;
  }

  getPost(hash: string) {
    const store = this.$posts.get(hash);

    this.node.db.db.getMessage(hash).then((message) => {
      if (store.$?.hex !== message?.hex) {
        store.$ = message as Post;
      }
    });

    return store.$;
  }

  getUser(creator = '') {
    const store = this.$users.get(creator);
    this.node.db.db.getProfile(creator).then((profile) => {
      store.$ = profile;
    });
    return store.$;
  }
}

const $node = new NodeStore();
export default $node;
