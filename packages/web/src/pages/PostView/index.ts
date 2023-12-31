import {
  boolAttr,
  connect,
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

// @connect(() => {
//   return {
//     pathname: Router.$pathname,
//     reference: $editor.reference,
//   };
// })
export default class PostView extends CustomElement {
  css = css.toString();

  parents = new Observable<string[]>([]);

  // async onupdated() {
  //   const [, creator, , h] = Router.pathname.split('/');
  //   const repost = $node.getRepostRef(h);
  //   const messageId = !repost ? creator + '/' + h : repost.messageId;
  //   const hash = repost?.hash || h;
  //
  //   useEffect(
  //     async () => {
  //       // $node.$replies.get(messageId).subscribe(this._update);
  //       // $node.$posts.get(hash).subscribe(this._update);
  //       const parents = await $node.getParents(hash);
  //       this.parents.$ = parents;
  //     },
  //     [hash, this.$.parents.$.join('+')],
  //     this,
  //   );
  // }

  renderParents(): VNode {
    return h(
      'div.parents',
      ...this.parents.$.map((parent: string) => {
        const [creator, hash] = parent.split('/');
        const parentHash = hash || creator;
        // @ts-ignore
        return h('post-card.parent', {
          ...boolAttr('parent', true),
          hash: parentHash,
          onclick: () => {
            const url = `/${creator}/status/${hash}`;
            $editor.reference.$ = parent;
            $node.getReplies(parent);
            Router.go(url);
          },
        });
      }),
    );
  }

  // async update(): Promise<void> {
  //   const [, , , hash] = Router.pathname.split('/');
  //   this.query('div.posts > post-card')!.setAttribute('hash', hash);
  // }

  render() {
    const [, , , hash] = Router.pathname.split('/');

    return h(
      'div.app',
      h('left-sidebar'),
      h(
        'div.posts',
        // this.renderParents(),
        h(`post-card`, {
          ...boolAttr('comfortable', true),
          ...boolAttr('displayparent', true),
          hash,
        }),
        // this.renderReplies(),
        h('div.posts__bottom'),
      ),
      h('div.sidebar'),
    );
  }

  renderReplies = () => {
    const [, creator, , hash] = Router.pathname.split('/');
    const repost = $node.getRepostRef(hash);
    const messageId = repost ? repost.messageId : creator + '/' + hash;
    const replies = $node.getReplies(messageId);

    return h(
      'div.replies',
      replies?.map((mid) => {
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
      }),
    );
  };
}

register('post-view', PostView);
