import { CustomElement, html, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';
import './index.scss';

export default class App extends CustomElement {
  css = `
    .app {
      display: flex;
      flex-flow: column nowrap;
      background: var(--slate-50);
      width: calc(100% - 2rem);
      height: calc(100% - 2rem);
      overflow: hidden;
      padding: 1rem;
    }
    
    .posts {
      display: flex;
      flex-flow: column nowrap;
      gap: 0.25rem;
      overflow-y: auto;
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    
    /* Hide scrollbar for Chrome, Safari and Opera */
    .posts::-webkit-scrollbar {
      display: none;
    }
    
    .posts post-card {
      flex: 0 0 auto;
      border: 1px solid var(--slate-100);
    }
  `;

  html = `
    <div class="app">
      <div class="posts"></div>
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
