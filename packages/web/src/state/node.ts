import { Observable, ObservableMap } from '../../lib/state.ts';
import { Autism } from '@protocol/browser';
import { Post } from '@message';
import { PostMeta, UserProfileData } from '@autismjs/db/src/base.ts';
import { equal } from '../utils/misc.ts';

export class NodeStore {
  node: Autism;
  #wait: Promise<void>;

  $globalPosts = new Observable<string[]>([]);
  $posts = new ObservableMap<string, Post>();
  $users = new ObservableMap<string, UserProfileData>();
  $postmetas = new ObservableMap<string, PostMeta>();

  constructor() {
    const node = new Autism({
      bootstrap: [
        '/ip4/192.168.86.24/tcp/51279/ws/p2p/12D3KooWL9Um7kUczwNgJ8WBNapYkJdggNVLpBMuSWTx7166oBfd',
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
