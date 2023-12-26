import { CustomElement, h, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeState } from '../../state/node.ts';
import '../../components/Post';
import css from './index.scss';

export default class App extends CustomElement {
  css = css.toString();

  render() {
    const state = getStore();
    const node = state.get<NodeState>('node');

    return h(
      'div.app',
      h('div.posts', () => {
        return node.$globalPosts.state.map((hash) => {
          return h(`post-card#${hash}`);
        });
      }),
      h('div.sidebar'),
    );
  }

  async onmount() {
    const state = getStore();
    const node = state.get<NodeState>('node');
    node.$globalPosts.subscribe(this.update);
  }
}

register('app-container', App);
