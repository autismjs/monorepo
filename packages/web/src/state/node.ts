import Store, { Observables, type StateOptions } from '../../lib/state.ts';
import { Autism } from '@autismjs/protocol/src/services/browser.ts';
import { Post } from '@autismjs/message';

export default class Node extends Store {
  node: Autism;
  wait: Promise<void>;
  posts = new Observables<Post[]>([]);

  constructor(options?: StateOptions) {
    super(options);

    const node = new Autism({
      bootstrap: [
        '/ip4/127.0.0.1/tcp/57575/ws/p2p/12D3KooWSoKnYV5idyrrJt3T6WM4eB6wcu58zUuy5bj7cEZNLwdm',
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

    this.wait = new Promise(async (r) => {
      await this.node.start();
      this.updatePosts();
      r();
    });
  }

  updatePosts = async () => {
    this.posts.state = await this.node.db.db.getPosts();
  };

  getPost = async (hash: string): Promise<Post | null> => {
    return this.node.db.db.getMessage(hash) as Promise<Post | null>;
  };
}
