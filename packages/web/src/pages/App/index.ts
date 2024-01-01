import { CustomElement, h, register, VNode } from '../../../lib/ui.ts';
import $node from '../../state/node.ts';
import css from './index.scss';
import { Router } from '../../../lib/ui.ts';
import $editor from '../../state/editor.ts';

import '../../components/Post';
import '../../components/LeftSidebar';

export default class App extends CustomElement {
  css = css.toString();

  update = async () => {
    const oldPosts = Array.from(this.query('.posts')!.children).slice();
    const newPosts = this.renderPosts().map((node) => node.createElement());

    const maxlen = Math.max(oldPosts.length, newPosts.length);

    for (let i = 0; i < maxlen; i++) {
      const oldEl = oldPosts[i];
      const newEl = newPosts[i]?.children[0];

      if (!oldEl && newEl) {
        this.query('.posts')!.append(newPosts[i]);
      } else if (oldEl && newEl) {
        if (oldEl.getAttribute('hash') !== newEl.getAttribute('hash')) {
          oldEl.setAttribute('hash', newEl.getAttribute('hash') || '');
        }
      } else if (oldEl && !newEl) {
        this.query('.posts')!.removeChild(oldEl);
      }
    }
  };

  async subscribe() {
    this.listen($node.$globalPosts);
  }

  renderPosts(): VNode[] {
    return $node.$globalPosts.$?.map((hash: string) => {
      // @ts-ignore
      return h(`post-card`, {
        hash,
        onclick: () => {
          const repost = $node.getRepostRef(hash);
          const newHash = repost?.$?.hash || hash;
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
    });
  }

  render() {
    return h(
      'div.app',
      h('left-sidebar'),
      h('div.posts', this.renderPosts()),
      h('div.sidebar'),
    );
  }
}

register('app-container', App);
