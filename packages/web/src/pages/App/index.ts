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
              const repost = $node.getRepostRef(hash);
              const newHash = repost?.hash || hash;
              const post = $node.getPost(newHash);
              const [creator, postHash] =
                $node.getPost(hash)!.messageId.split('/') || [];
              const url = creator
                ? `/${creator}/status/${postHash}`
                : `/${postHash}`;

              $editor.reference.$ = post!.messageId || '';
              $node.getReplies(post!.messageId || '');
              $node.getParents(newHash);
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
