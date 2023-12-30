import { Observable, ObservableMap } from '../../lib/state.ts';
import { Autism } from '@protocol/browser';
import { Post } from '@message';
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

  constructor() {
    const node = new Autism({
      bootstrap: [
        '/ip4/192.168.86.24/tcp/57377/ws/p2p/12D3KooWHrwzv7ehbPR4gcQCgq5DHHmpzBCebhtpsB7KLMU5kBaC',
      ],
    });

    this.node = node;
    this.#updatePosts();

    node.on('p2p:peer:connect', (peer) => {
      console.log('peer connected', peer);
    });

    node.on('pubsub:message:success', (peer) => {
      console.log('pubsub:message:success', peer);
      this.#updatePosts();
    });

    node.on('sync:new_message', (post) => {
      console.log('sync:new_message', post);
      this.#updatePosts();
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
    console.log(`updating ${posts.length} posts...`);
    this.$globalPosts.$ = posts.map((p) => {
      if (this.$posts.get(p.hash).$?.hex !== p.hex) {
        this.$posts.set(p.hash, p);
      }
      return p.hash;
    });
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
    const post = await this.node.db.db.getMessage(hash);
    const reference = (post as Post)?.reference || '';
    const [creator, refhash] = reference.split('/');
    const parentHash = refhash || creator;

    if (post && parentHash) {
      const parent = await this.node.db.db.getMessage(parentHash);
      if (parent) {
        return this.getParents(parent.hash, [
          (parent as Post).messageId,
          ...list,
        ]);
      }
    }

    return list;
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
