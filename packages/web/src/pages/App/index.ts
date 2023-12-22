import { CustomElement, html, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import { Post as PostType } from '@autismjs/message';
import '../../components/Post';

export default class App extends CustomElement {
  css = `
    .app {
      width: 100vw;
      height: 100vh;
    }
  `;

  html = `
    <div class="app">
      <slot></slot>
    </div>
  `;

  async connectedCallback() {
    super.connectedCallback();
    const state = getStore();
    const node = state.get<NodeState>('node');
    const app = this.shadowRoot!.querySelector('div.app')!;
    const q = Q(app);

    node.posts.subscribe<PostType[]>((posts) => {
      const old = q.findAll('post-card');
      old.patch(
        posts,
        (post: PostType) => post.messageId,
        (post: PostType) =>
          html(`
            <post-card
              key="${post.messageId}"
              data-hash="${post.hash}"
            />
          `),
      );
    });
  }
}

register('app-container', App);
