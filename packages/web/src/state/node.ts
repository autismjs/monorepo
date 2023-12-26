import Store, {
  ObservableMap,
  Observable,
  type StateOptions,
} from '../../lib/state.ts';
import { Autism } from '@autismjs/protocol/src/services/browser.ts';
import { Post } from '@autismjs/message';

export default class Node extends Store {
  node: Autism;
  #wait: Promise<void>;

  $globalPosts = new Observable<string[]>([]);
  $posts = new ObservableMap<string, Post>();
  $users = new ObservableMap<string, any>();

  constructor(options?: StateOptions) {
    super(options);

    const node = new Autism({
      bootstrap: [
        '/ip4/127.0.0.1/tcp/64029/ws/p2p/12D3KooWG1yjigfXNQtfkLC8TbzoSreeDx8User1Q5wo49MUK1NB',
        '/ip4/192.168.86.30/tcp/64029/ws/p2p/12D3KooWG1yjigfXNQtfkLC8TbzoSreeDx8User1Q5wo49MUK1NB',
        '/ip4/192.168.86.24/tcp/64029/ws/p2p/12D3KooWG1yjigfXNQtfkLC8TbzoSreeDx8User1Q5wo49MUK1NB',
      ],
    });
    this.node = node;

    node.on('p2p:peer:connect', (peer) => {
      console.log('peer connected', peer);
    });

    node.on('pubsub:message:success', (peer) => {
      console.log('pubsub:message:success', peer);
      this.updatePosts();
    });

    node.on('sync:new_message', (peer) => {
      console.log('sync:new_message', peer);
      this.updatePosts();
    });

    this.updatePosts();

    this.#wait = new Promise(async (r) => {
      await this.node.start();
      this.updatePosts();
      r();
    });
  }

  async waitForStart() {
    return this.#wait;
  }

  updatePosts = async () => {
    const posts = await this.node.db.db.getPosts();
    this.$globalPosts.state = posts.map((p) => {
      this.$posts.set(p.hash, p);
      return p.hash;
    });
  };

  getPost = async (hash: string): Promise<Post | null> => {
    return this.node.db.db.getMessage(hash) as Promise<Post | null>;
  };

  getUser = async (creator = '') => {
    const profile = await this.node.db.db.getProfile(creator);
    this.$users.set(creator, profile);
    return this.$users.get(creator);
  };
}
