import {
  boolAttr,
  connect,
  CustomElement,
  disabled,
  h,
  register,
} from '../../../lib/ui.ts';
import { format, fromNow, userId, userName } from '../../utils/misc.ts';
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
  PostSubtype,
  ProofType,
  Post as AustismPost,
} from '@message';
import $signer from '../../state/signer.ts';

@connect((el) => {
  const hash = el.state.hash;
  const post = $node.$posts.get(hash);
  const user = $node.$users.get(post.$?.creator || '');
  const parent = post.$?.reference && $node.$posts.get(post.$?.reference);

  return {
    post,
    user,
    ecdsa: $signer.$ecdsa,
    reference: $editor.reference,
    postmeta: $node.$postmetas.get(hash),
    parent: parent || null,
  };
})
export default class Post extends CustomElement {
  static get observedAttributes() {
    return ['hash', 'creator', 'createat', 'content', 'name', 'handle'];
  }

  css = css.toString();

  comment = (evt: PointerEvent) => {
    evt.stopPropagation();
    const p = $node.$posts.get(this.state.hash);
    $editor.reference.$ =
      $editor.reference.$.split('/')[1] === this.state.hash
        ? ''
        : p.$?.messageId || '';
    return false;
  };

  toggleRepost = (evt: PointerEvent) => {
    evt.stopPropagation();
    const p = $node.$posts.get(this.state.hash);

    if (!p.$?.messageId) return;

    if (!$signer.$ecdsa.$ || !$signer.$ecdsa.$.publicKey) return;

    const post = new AustismPost({
      type: MessageType.Post,
      subtype: PostSubtype.Repost,
      reference: p.$.messageId,
      creator: $signer.$ecdsa.$.publicKey,
      createdAt: new Date(),
    });

    post.commit({
      type: ProofType.ECDSA,
      value: $signer.$ecdsa.$.sign(post.hash),
    });

    $node.node.publish(post);
  };

  toggleLike = (evt: PointerEvent) => {
    evt.stopPropagation();
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
    const p = $node.getPost(this.state.hash);
    const u = $node.$users.get(p?.creator || '');
    const postmeta = $node.getPostMeta(
      this.state.hash,
      $signer.$ecdsa.$?.publicKey,
    );

    const creator = p?.json.creator || '';
    const createat = fromNow(p?.json.createdAt) || '';
    const content = p?.json.content || '';
    const name = u.$?.name || userName(p?.json.creator) || 'Anonymous';
    const handle = userId(p?.json.creator) || '';
    const fullCreateAt = p?.json.createdAt
      ? format(p?.json.createdAt, 'h:mm A · MMM D, YYYY')
      : '';

    return h(
      'div.post',
      {
        ...boolAttr('hideactions', this.state.hideactions),
        ...boolAttr('comfortable', this.state.comfortable),
        ...boolAttr('parent', this.state.parent),
      },
      h('profile-image', {
        creator: creator,
      }),
      h(
        'div.top',
        h('div.creator', name),
        h('div.userId', handle),
        h(
          'div.createAt-top',
          h('span', '·'),
          h('span', { title: fullCreateAt }, createat),
        ),
      ),
      h('div.content', content),
      !!this.state.comfortable &&
        h(
          'div.createAt-bottom',
          { title: fullCreateAt },
          h('span', fullCreateAt),
        ),
      h(
        'div.bottom',
        this.btn({
          title: 'Reply',
          className: 'comment-btn',
          active: false,
          count: postmeta?.replies,
          onclick: this.comment,
          src: CommentIcon,
        }),
        this.btn({
          className: 'repost-btn',
          active: false,
          count: 0,
          onclick: this.toggleRepost,
          src: RepostIcon,
          title: 'Repost',
        }),
        this.btn({
          className: 'like-btn',
          active: postmeta?.moderated[ModerationSubtype.Like],
          count: postmeta?.moderations[ModerationSubtype.Like],
          onclick: this.toggleLike,
          src: LikeIcon,
          title: 'Like',
        }),
      ),
    );
  }

  btn(props: {
    className: string;
    active?: boolean;
    count?: number;
    onclick: (evt: PointerEvent) => void;
    src: string;
    title: string;
  }) {
    const { title, className, active = false, count = 0, onclick } = props;

    return h(
      'c-button',
      // @ts-ignore
      {
        className: className,
        title: title,
        ...boolAttr('active', active),
        ...disabled(!$signer.$ecdsa.$?.privateKey),
        onclick: onclick,
      },
      h('img', { src: props.src }),
      h('span', `${count || 0}`),
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
