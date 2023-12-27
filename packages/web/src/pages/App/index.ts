import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import $node from '../../state/node.ts';
import '../../components/Post';
import '../../components/LeftSidebar';

import css from './index.scss';

@connect($node.$globalPosts)
export default class App extends CustomElement {
  css = css.toString();

  render() {
    return h(
      'div.app',
      h('left-sidebar'),
      h(
        'div.posts',
        this.$.$?.map((hash: string) => {
          return h(`post-card`, { hash });
        }),
      ),
      h('div.sidebar'),
    );
  }
}

register('app-container', App);
