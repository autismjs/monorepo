import { CustomElement, hx, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';
import css from './index.scss';
import * as console from 'console';

export default class App extends CustomElement {
  css = css.toString();

  async onupdate(): Promise<void> {
    await super.onupdate();
    console.time('app-container');
  }

  async onupdated(): Promise<void> {
    await super.onupdated();
    console.timeEnd('app-container');
  }

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
