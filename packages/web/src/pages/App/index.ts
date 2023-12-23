import { CustomElement, html, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';
import css from './index.scss';

export default class App extends CustomElement {
  css = css.toString();

  html = `
    <div class="app">
      <div class="posts"></div>
      <div class="sidebar">
        hi
      </div>
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
