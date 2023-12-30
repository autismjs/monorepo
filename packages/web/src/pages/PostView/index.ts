import {
  boolAttr,
  connect,
  CustomElement,
  h,
  register,
  Router,
} from '../../../lib/ui.ts';
import css from './index.scss';
import $node from '../../state/node.ts';
import $editor from '../../state/editor.ts';

@connect(() => {
  return {
    pathname: Router.$pathname,
    reference: $editor.reference,
  };
})
export default class PostView extends CustomElement {
  css = css.toString();

  async onupdated() {
    const [, creator, , hash] = Router.pathname.split('/');

    const messageId = creator + '/' + hash;
    $node.$replies.get(messageId).subscribe(this.update);
  }

  render() {
    const [, , , hash] = Router.pathname.split('/');

    return h(
      'div.app',
      h('left-sidebar'),
      h(
        'div.posts',
        h(`post-card`, {
          ...boolAttr('comfortable', true),
          ...boolAttr('displayparent', true),
          hash,
        }),
        this.renderReplies(),
        h('div.posts__bottom'),
      ),
      h('div.sidebar'),
    );
  }

  renderReplies = () => {
    const [, creator, , hash] = Router.pathname.split('/');
    const messageId = creator + '/' + hash;
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
