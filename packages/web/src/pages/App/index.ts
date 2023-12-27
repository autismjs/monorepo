import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import $node from '../../state/node.ts';
import '../../components/Post';
import css from './index.scss';

@connect($node.$globalPosts)
export default class App extends CustomElement {
  css = css.toString();

  render() {
    return h(
      'div.app',
      h(
        'div.posts',
        $node.$globalPosts.$.map((hash) => {
          return h(`post-card`, { hash });
        }),
      ),
      h('div.sidebar'),
    );
  }
}

register('app-container', App);
