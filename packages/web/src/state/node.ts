import { Observable, ObservableMap } from '../../lib/state.ts';
import { Autism } from '@autismjs/protocol/src/services/browser.ts';
import { Post } from '@autismjs/message';
import { UserProfileData } from '@autismjs/db/src/base.ts';

export class NodeStore {
  node: Autism;
  #wait: Promise<void>;

  $globalPosts = new Observable<string[]>([]);
  $posts = new ObservableMap<string, Post>();
  $users = new ObservableMap<string, UserProfileData>();

  constructor() {
    const node = new Autism({
      bootstrap: [
        '/ip4/192.168.86.24/tcp/56218/ws/p2p/12D3KooWLHV2ti9mAZMG4kKm1uaahaNyf57MXnTDLLtpW8yjX9tb',
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
      // this.#updatePosts();
      // updateTimeout = setTimeout(() => {
      //   if (updateTimeout) clearTimeout(updateTimeout);
      //   updateTimeout = null;
      //   this.#updatePosts();
      // }, 1000);
      // this.$posts.set(post.hash, post);
      // this.$globalPosts.$ = this.$globalPosts.$.concat(post.hash);
    });

    this.#wait = new Promise(async (r) => {
      await this.node.start();
      this.#updatePosts();
      r();
    });
  }

  async waitForStart() {
    return this.#wait;
  }

  #updatePosts = () => {
    requestAnimationFrame(async () => {
      const posts = await this.node.db.db.getPosts();
      console.log('updating posts: ', posts);
      this.$globalPosts.$ = posts.map((p) => {
        this.$posts.set(p.hash, p);
        return p.hash;
      });
    });
  };

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
