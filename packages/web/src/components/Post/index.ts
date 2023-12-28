import {
  boolAttr,
  connect,
  CustomElement,
  disabled,
  h,
  register,
} from '../../../lib/ui.ts';
import { fromNow, userId, userName } from '../../utils/misc.ts';
import CommentIcon from '../../../static/icons/comment.svg';
import RepostIcon from '../../../static/icons/repost.svg';
import LikeIcon from '../../../static/icons/like.svg';
import '../ProfileImage';
import '../Button';
import css from './index.scss';
import $node from '../../state/node.ts';
import $editor from '../../state/editor.ts';
import {
  MessageType,
  Moderation,
  ModerationSubtype,
  ProofType,
} from '@message';
import $signer from '../../state/signer.ts';

@connect((el) => {
  const hash = el.state.hash;
  const post = $node.$posts.get(hash);
  const user = $node.$users.get(post.$?.creator || '');

  return {
    post,
    user,
    ecdsa: $signer.$ecdsa,
    reference: $editor.reference,
    postmeta: $node.$postmetas.get(hash),
  };
})
export default class Post extends CustomElement {
  static get observedAttributes() {
    return ['hash', 'creator', 'createat', 'content', 'name', 'handle'];
  }

  css = css.toString();

  comment = () => {
    const p = $node.$posts.get(this.state.hash);
    $editor.reference.$ =
      $editor.reference.$.split('/')[1] === this.state.hash
        ? ''
        : p.$?.messageId || '';
  };

  toggleLike = () => {
    const p = $node.$posts.get(this.state.hash);

    if (!p.$?.messageId) return;

    if (!$signer.$ecdsa.$ || !$signer.$ecdsa.$.publicKey) return;

    const mod = new Moderation({
      type: MessageType.Moderation,
      subtype: ModerationSubtype.Like,
      reference: p.$.messageId,
      creator: $signer.$ecdsa.$.publicKey,
      createdAt: new Date(),
    });

    mod.commit({
      type: ProofType.ECDSA,
      value: $signer.$ecdsa.$.sign(mod.hash),
    });

    $node.node.publish(mod);
  };

  render() {
    const p = $node.$posts.get(this.state.hash);
    const u = $node.$users.get(p.$?.creator || '');
    const postmeta = $node.getPostMeta(
      this.state.hash,
      $signer.$ecdsa.$?.publicKey,
    );

    const creator = p.$?.json.creator || '';
    const createat = fromNow(p.$?.json.createdAt) || '';
    const content = p.$?.json.content || '';
    const name = u.$?.name || userName(p.$?.json.creator) || 'Anonymous';
    const handle = userId(p.$?.json.creator) || '';

    const refHash = $editor.reference.$.split('/')[1] || $editor.reference.$;

    return h(
      'div.post',
      h('profile-image', {
        creator: creator,
      }),
      h(
        'div.top',
        h('div.creator', name),
        h('div.userId', handle),
        h('div.createAt-top', h('span', '·'), h('span', createat)),
      ),
      h('div.content', content),
      h(
        'div.bottom',
        h(
          'c-button.comment-btn',
          // @ts-ignore
          {
            ...boolAttr('active', refHash === this.state.hash),
            ...disabled(!$signer.$ecdsa.$?.privateKey),
            onclick: this.comment,
          },
          h('img', { src: CommentIcon }),
          h('span', `${postmeta?.replies || 0}`),
        ),
        h(
          'c-button.repost-btn',
          {
            ...disabled(!$signer.$ecdsa.$?.privateKey),
          },
          h('img', { src: RepostIcon }),
          h('span', '0'),
        ),
        h(
          'c-button.like-btn',
          // @ts-ignore
          {
            ...boolAttr('active', postmeta?.moderated[ModerationSubtype.Like]),
            ...disabled(!$signer.$ecdsa.$?.privateKey),
            onclick: this.toggleLike,
          },
          h('img', { src: LikeIcon }),
          h('span', `${postmeta?.moderations[ModerationSubtype.Like] || 0}`),
        ),
      ),
    );
  }

  async onupdated() {
    const el = this.shadowRoot!.querySelector('div.content');
    if (el?.clientHeight && el.clientHeight >= 15 * 24) {
      el.classList.add('max-height');
    }
  }
}

register('post-card', Post);
