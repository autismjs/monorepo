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
import RepostSlate300Icon from '../../../static/icons/repost-slate-300.svg';
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
  Post as AustismPost,
  PostSubtype,
  ProofType,
} from '@message';
import $signer from '../../state/signer.ts';
import { useEffect } from '../../../lib/state.ts';

@connect((el) => {
  const hash = el.state.hash;
  const post = $node.$posts.get(hash);
  const user = $node.$users.get(post.$?.creator || '');
  const repost = $node.getRepostRef(hash);

  $node.getPostMeta(post.$?.messageId);
  return {
    post,
    user,
    ecdsa: $signer.$ecdsa,
    reference: $editor.reference,
    postmeta: $node.$postmetas.get(hash),
    repost: repost ? $node.$posts.get(repost.hash) : null,
    repostmeta: repost ? $node.$postmetas.get(repost.hash) : null,
  };
})
export default class Post extends CustomElement {
  static get observedAttributes() {
    return ['hash', 'creator', 'createat', 'content', 'name', 'handle'];
  }

  css = css.toString();

  async onupdated() {
    this.#fixMaxHeight();

    const repost = $node.getRepostRef(this.state.hash);

    const postHash = repost?.hash || this.state.hash;

    useEffect(
      async () => {
        if (!postHash) return;
        $node.getPost(postHash);
        $node.getPostMeta(postHash);

        // console.log($node.$posts.get(postHash), $node.$postmetas.get(postHash));
        $node.$posts.get(postHash).subscribe(this.update);
        $node.$postmetas.get(postHash).subscribe(this.update);
      },
      [postHash],
      this,
    );
  }

  comment = (evt: PointerEvent) => {
    evt.stopPropagation();
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.hash || this.state.hash;
    const p = $node.$posts.get(hash);
    $editor.reference.$ =
      $editor.reference.$.split('/')[1] === hash ? '' : p.$?.messageId || '';
    return false;
  };

  toggleRepost = (evt: PointerEvent) => {
    evt.stopPropagation();
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.hash || this.state.hash;
    const p = $node.$posts.get(hash);

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
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.hash || this.state.hash;
    const p = $node.$posts.get(hash);

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
    const post = $node.getPost(this.state.hash);
    const repost =
      post?.subtype === PostSubtype.Repost
        ? $node.getPost(post.reference!.split('/')[1] || post.reference!)
        : null;
    const hash = repost?.hash || this.state.hash;
    const p = $node.getPost(hash);
    const u = $node.$users.get(p?.creator || '');
    const rpu = $node.$users.get(repost?.creator || '');
    const postmeta = $node.getPostMeta(hash, $signer.$ecdsa.$?.publicKey);

    const creator = p?.json.creator || '';
    const createat = fromNow(p?.json.createdAt) || '';
    const content = p?.json.content || '';
    const name = u.$?.name || userName(p?.json.creator) || 'Anonymous';
    const handle = userId(p?.json.creator) || '';
    const fullCreateAt = p?.json.createdAt
      ? format(p?.json.createdAt, 'h:mm A · MMM D, YYYY')
      : '';

    const rpname = rpu.$?.name || userName(post?.creator) || 'Anonymous';

    return h(
      'div.post',
      {
        ...boolAttr('hideactions', this.state.hideactions),
        ...boolAttr('comfortable', this.state.comfortable),
        ...boolAttr('parent', this.state.parent),
      },
      !!repost &&
        h('img.reposted-icon', {
          src: RepostSlate300Icon,
        }),
      !!repost && h('div.reposted', `${rpname} reposted`),
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
          active: postmeta?.threaded[PostSubtype.Comment],
          count: postmeta?.threads[PostSubtype.Comment],
          onclick: this.comment,
          src: CommentIcon,
        }),
        this.btn({
          className: 'repost-btn',
          active: postmeta?.threaded[PostSubtype.Repost],
          count: postmeta?.threads[PostSubtype.Repost],
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

  #fixMaxHeight() {
    const el = this.shadowRoot!.querySelector('div.content');
    if (el?.clientHeight && el.clientHeight >= 15 * 24) {
      el.classList.add('max-height');
    }
  }
}

register('post-card', Post);
