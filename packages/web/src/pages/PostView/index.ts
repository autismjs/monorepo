import {
  boolAttr,
  CustomElement,
  h,
  register,
  Router,
  VNode,
} from '../../../lib/ui.ts';
import css from './index.scss';
import $node from '../../state/node.ts';
import $editor from '../../state/editor.ts';
import { Observable } from '../../../lib/state.ts';

import '../../components/Post';
import '../../components/LeftSidebar';

export default class PostView extends CustomElement {
  css = css.toString();

  parents = new Observable<string[]>([]);

  async onmount() {
    const [, , , h] = Router.pathname.split('/');
    const repost = $node.getRepostRef(h);
    const hash = repost?.$?.hash || h;
    this.parents.$ = await $node.getParents(hash);
  }

  async subscribe(): Promise<void> {
    const [, creator, , h] = Router.pathname.split('/');
    const repost = $node.getRepostRef(h);
    const messageId = !repost ? creator + '/' + h : repost?.$?.messageId;
    const hash = repost?.$?.hash || h;
    this.listen(this.parents);
    this.listen(Router.$pathname);
    this.listen($node.$posts.get(hash));

    if (repost?.$) {
      this.listen($node.$posts.get(repost.$.hash));
    }
    if (messageId) {
      this.listen($node.$replies.get(messageId));
    }
  }

  renderParents(): VNode[] {
    return this.parents.$.map((parent: string) => {
      const [creator, hash] = parent.split('/');
      const parentHash = hash || creator;
      // @ts-ignore
      return h('post-card.parent', {
        ...boolAttr('parent', true),
        hash: parentHash,
        onclick: () => {
          const url = `/${creator}/status/${hash}`;
          $editor.reference.$ = parent;
          Router.go(url);
        },
      });
    });
  }

  async update(): Promise<void> {
    const [, , , hash] = Router.pathname.split('/');
    const [, , , h] = Router.pathname.split('/');
    const repost = $node.getRepostRef(h);
    this.parents.$ = await $node.getParents(repost?.$?.hash || h);
    this.query('div.posts > post-card')!.setAttribute('hash', hash);
    this.updateParents();
    this.updateReplies();
  }

  updateReplies() {
    const oldReplies = Array.from(this.query('div.replies')!.children).slice();
    const newReplies = this.renderReplies().map((node) => node.createElement());

    const maxlen = Math.max(oldReplies.length, newReplies.length);

    for (let i = 0; i < maxlen; i++) {
      const oldEl = oldReplies[i];
      const newEl = newReplies[i]?.children[0];

      if (!oldEl && newEl) {
        this.query('div.replies')!.append(newReplies[i]);
      } else if (oldEl && newEl) {
        if (oldEl.getAttribute('hash') !== newEl.getAttribute('hash')) {
          // oldEl.setAttribute('hash', newEl.getAttribute('hash') || '');
          oldEl.replaceWith(newReplies[i]);
        }
      } else if (oldEl && !newEl) {
        this.query('div.replies')!.removeChild(oldEl);
      }
    }
  }

  updateParents() {
    const oldParents = Array.from(this.query('div.parents')!.children).slice();
    const newParents = this.renderParents().map((node) => node.createElement());

    const maxlen = Math.max(oldParents.length, newParents.length);

    for (let i = 0; i < maxlen; i++) {
      const oldEl = oldParents[i];
      const newEl = newParents[i]?.children[0];

      if (!oldEl && newEl) {
        this.query('div.parents')!.append(newParents[i]);
      } else if (oldEl && newEl) {
        if (oldEl.getAttribute('hash') !== newEl.getAttribute('hash')) {
          oldEl.setAttribute('hash', newEl.getAttribute('hash') || '');
        }
      } else if (oldEl && !newEl) {
        this.query('div.parents')!.removeChild(oldEl);
      }
    }
  }

  render() {
    const [, , , hash] = Router.pathname.split('/');

    return h(
      'div.app',
      h('left-sidebar'),
      h(
        'div.posts',
        h('div.parents', this.renderParents()),
        h(`post-card`, {
          ...boolAttr('comfortable', true),
          ...boolAttr('displayparent', true),
          hash,
        }),
        h('div.replies', this.renderReplies()),
        h('div.posts__bottom'),
      ),
      h('div.sidebar'),
    );
  }

  renderReplies = (): VNode[] => {
    const [, creator, , hash] = Router.pathname.split('/');
    const repost = $node.getRepostRef(hash);
    const messageId = repost ? repost.$?.messageId : creator + '/' + hash;
    const replies = $node.$replies.get(messageId!).$ || [];

    return replies.map((mid) => {
      const [c, _h] = mid.split('/');
      // @ts-ignore
      return h('post-card.reply', {
        hash: _h || c,
        onclick: () => {
          const url = c ? `/${c}/status/${_h}` : `/${_h}`;
          $editor.reference.$ = mid;
          $node.getReplies(mid);
          Router.go(url);
        },
      });
    });
  };
}

register('post-view', PostView);
