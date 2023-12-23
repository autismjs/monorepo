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
    this.subscribeToPosts();
  }

  subscribeToPosts() {
    const state = getStore();
    const node = state.get<NodeState>('node');
    node.$globalPosts.subscribe<string[]>((hashes) => {
      const app = this.shadowRoot!.querySelector('div.app')!;
      const q = Q(app);
      const old = q.findAll('post-card');

      old.patch(
        hashes,
        (hash: string) => hash,
        (hash: string) =>
          html(`
            <post-card
              key="${hash}"
              data-hash="${hash}"
            />
          `),
      );
    });
  }
}

register('app-container', App);
