import { CustomElement, hx, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';
import css from './index.scss';

export default class App extends CustomElement {
  css = css.toString();

  render() {
    const state = getStore();
    const node = state.get<NodeState>('node');
    const posts = node.$globalPosts.state;

    return hx`
      <div class="app">
        <div class="posts">
          ${posts.map((hash) => {
            return hx`
              <post-card id="${hash}" />
            `;
          })}
        </div>
        <div class="sidebar">
        </div>
      </div>
    `;
  }

  async onmount() {
    const state = getStore();
    const node = state.get<NodeState>('node');
    node.$globalPosts.subscribe(this.patch);
  }
}

register('app-container', App);
