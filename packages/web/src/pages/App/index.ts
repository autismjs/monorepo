import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import $node from '../../state/node.ts';
import '../../components/Post';
import '../../components/LeftSidebar';

import css from './index.scss';
import { Router } from '../../../lib/ui.ts';
import $editor from '../../state/editor.ts';

@connect($node.$globalPosts)
export default class App extends CustomElement {
  css = css.toString();

  render() {
    return h(
      'div.app',
      h('left-sidebar'),
      h(
        'div.posts',
        $node.$globalPosts.$?.map((hash: string) => {
          // @ts-ignore
          return h(`post-card`, {
            hash,
            onclick: () => {
              const { creator, messageId } = $node.$posts.get(hash).$ || {};
              const url = creator ? `/${creator}/status/${hash}` : `/${hash}`;
              $editor.reference.$ = messageId || '';
              $node.getReplies(messageId || '');
              Router.go(url);
            },
          });
        }),
      ),
      h('div.sidebar'),
    );
  }
}

register('app-container', App);
