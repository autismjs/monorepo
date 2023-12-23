import { CustomElement, html, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';

export default class App extends CustomElement {
  css = `
    .app {
      width: 100vw;
      height: 100vh;
    }
    
    .posts {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-flow: column nowrap;
      gap: 0.25rem;
      padding: 0.25rem;
    }
  `;

  html = `
    <div class="app">
      <div class="posts" />
    </div>
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.subscribeToPosts();
  }

  subscribeToPosts() {
    const state = getStore();
    const node = state.get<NodeState>('node');
    node.$globalPosts.subscribe((hashes) => {
      const app = Q(this.shadowRoot!)!.find('div.posts')!;
      const old = Q(app.el)!.findAll('post-card');

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
