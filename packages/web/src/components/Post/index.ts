import {
  boolAttr,
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
  Reference,
  Revert,
  RevertSubtype,
} from '@message';
import $signer from '../../state/signer.ts';

export default class PostCard extends CustomElement {
  static get observedAttributes() {
    return ['hash', 'creator', 'createat', 'content', 'name', 'handle'];
  }

  css = css.toString();

  async subscribe(): Promise<void> {
    this.listen($signer.$ecdsa);

    if (!this.state.hash) return;

    const post = $node.$posts.get(this.state.hash);

    this.listen(post);

    if (post.$) {
      const user = $node.$users.get(post.$.creator);
      this.listen(user);
    }

    const repost = $node.getRepostRef(this.state.hash);
    const tpostHash = repost?.$?.hash || this.state.hash;
    const tpost = $node.$posts.get(tpostHash);
    const messageId = tpost.$?.messageId;

    if (!tpostHash || !messageId) return;

    this.listen($node.$posts.get(tpostHash));
    this.listen($node.$postmetas.get(messageId));
  }

  update = async () => {
    if (!this.shadowRoot) return;

    const post = $node.getPost(this.state.hash);
    const repost =
      post?.subtype === PostSubtype.Repost && post.reference
        ? $node.getPost(Reference.from(post.reference).hash)
        : null;
    const hash = repost?.hash || this.state.hash;
    const p = $node.getPost(hash);
    const u = $node.$users.get(p?.creator || '');
    const rpu = $node.$users.get(repost?.creator || '');
    const postmeta = $node.getPostMeta(
      p?.messageId,
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

    const rpname = rpu.$?.name || userName(post?.creator) || 'Anonymous';

    if (repost) {
      this.query('div.reposted')!.classList.remove('hidden');
      this.query('img.reposted-icon')!.classList.remove('hidden');
      this.query('div.reposted')!.textContent = `${rpname} reposted`;
    } else {
      this.query('div.reposted')!.classList.add('hidden');
      this.query('img.reposted-icon')!.classList.add('hidden');
    }

    this.query('profile-image')!.setAttribute('creator', creator);
    this.query('div.creator')!.textContent = name;
    this.query('div.userId')!.textContent = handle;
    this.query('span#createat_top')!.textContent = createat;
    this.query('div.content')!.textContent = content;
    this.query('div.createAt-bottom')!.setAttribute('title', fullCreateAt);

    if (this.state.comfortable) {
      this.query('div.createAt-bottom')!.classList.remove('hidden');
    } else {
      this.query('div.createAt-bottom')!.classList.add('hidden');
    }

    this.query('span#createat_bottom')!.textContent = fullCreateAt;

    // @ts-ignore
    this.query('.like-btn')!.child(1)!.textContent =
      postmeta?.moderations[ModerationSubtype.Like] || 0;

    if (postmeta?.moderated[ModerationSubtype.Like]) {
      this.query('c-button.like-btn')!.setAttribute('active', 'true');
    } else {
      this.query('c-button.like-btn')!.removeAttribute('active');
    }

    // @ts-ignore
    this.query('c-button.repost-btn')!.child(1)!.textContent =
      postmeta?.threads[PostSubtype.Repost] || 0;

    if (postmeta?.threaded[PostSubtype.Repost]) {
      this.query('c-button.repost-btn')!.setAttribute('active', 'true');
    } else {
      this.query('c-button.repost-btn')!.removeAttribute('active');
    }

    // @ts-ignore
    this.query('c-button.comment-btn')!.child(1)!.textContent =
      postmeta?.threads[PostSubtype.Comment] || 0;

    if (postmeta?.threaded[PostSubtype.Comment]) {
      this.query('c-button.comment-btn')!.setAttribute('active', 'true');
    } else {
      this.query('c-button.comment-btn')!.removeAttribute('active');
    }

    if ($signer.$ecdsa.$?.privateKey) {
      this.query('c-button.comment-btn')!.removeAttribute('disabled');
      this.query('c-button.like-btn')!.removeAttribute('disabled');
      this.query('c-button.repost-btn')!.removeAttribute('disabled');
    } else {
      this.query('c-button.comment-btn')!.setAttribute('disabled', 'true');
      this.query('c-button.like-btn')!.setAttribute('disabled', 'true');
      this.query('c-button.repost-btn')!.setAttribute('disabled', 'true');
    }

    const postAttrs = {
      ...boolAttr('hideactions', this.state.hideactions),
      ...boolAttr('comfortable', this.state.comfortable),
      ...boolAttr('parent', this.state.parent),
    };

    for (const [key, value] of Object.entries(postAttrs)) {
      this.query('div.post')!.setAttribute(key, value);
    }

    this.#fixMaxHeight();
  };

  comment = (evt: PointerEvent) => {
    evt.stopPropagation();
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.$?.hash || this.state.hash;
    const p = $node.$posts.get(hash);
    $editor.reference.$ =
      $editor.reference.$.split('/')[1] === hash ? '' : p.$?.messageId || '';
    return false;
  };

  toggleRepost = async (evt: PointerEvent) => {
    evt.stopPropagation();
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.$?.hash || this.state.hash;
    const p = $node.$posts.get(hash);

    if (!p.$?.messageId) return;

    if (!$signer.$ecdsa.$ || !$signer.$ecdsa.$.publicKey) return;

    const postmeta = await $node.node.db.db.getPostMeta(
      p.$.messageId,
      $signer.$ecdsa.$.publicKey,
    );

    let msg;

    if (!!postmeta.threaded[PostSubtype.Repost]) {
      msg = new Revert({
        type: MessageType.Revert,
        subtype: RevertSubtype.Default,
        reference: postmeta.threaded[PostSubtype.Repost],
        creator: $signer.$ecdsa.$.publicKey,
        createdAt: new Date(),
      });
    } else {
      msg = new AustismPost({
        type: MessageType.Post,
        subtype: PostSubtype.Repost,
        reference: p.$.messageId,
        creator: $signer.$ecdsa.$.publicKey,
        createdAt: new Date(),
      });
    }

    msg.commit({
      type: ProofType.ECDSA,
      value: $signer.$ecdsa.$.sign(msg.hash),
    });

    $node.node.publish(msg);
  };

  toggleLike = async (evt: PointerEvent) => {
    evt.stopPropagation();
    const repost = $node.getRepostRef(this.state.hash);
    const hash = repost?.$?.hash || this.state.hash;
    const p = $node.$posts.get(hash);

    if (!p.$?.messageId) return;

    if (!$signer.$ecdsa.$ || !$signer.$ecdsa.$.publicKey) return;

    const postmeta = await $node.node.db.db.getPostMeta(
      p.$.messageId,
      $signer.$ecdsa.$.publicKey,
    );

    let msg;

    if (!!postmeta.moderated[ModerationSubtype.Like]) {
      msg = new Revert({
        type: MessageType.Revert,
        subtype: RevertSubtype.Default,
        reference: postmeta.moderated[ModerationSubtype.Like],
        creator: $signer.$ecdsa.$.publicKey,
        createdAt: new Date(),
      });
    } else {
      msg = new Moderation({
        type: MessageType.Moderation,
        subtype: ModerationSubtype.Like,
        reference: p.$.messageId,
        creator: $signer.$ecdsa.$.publicKey,
        createdAt: new Date(),
      });
    }

    msg.commit({
      type: ProofType.ECDSA,
      value: $signer.$ecdsa.$.sign(msg.hash),
    });

    $node.node.publish(msg);
  };

  render() {
    return h(
      'div.post',
      {
        ...boolAttr('hideactions', this.state.hideactions),
        ...boolAttr('comfortable', this.state.comfortable),
        ...boolAttr('parent', this.state.parent),
      },
      h('img.reposted-icon', {
        className: 'hidden',
        src: RepostSlate300Icon,
      }),
      h('div.reposted', {
        className: 'hidden',
      }),
      h('profile-image'),
      h(
        'div.top',
        h('div.creator'),
        h('div.userId'),
        h('div.createAt-top', h('span', '·'), h('span#createat_top')),
      ),
      h('div.content'),
      h('div.createAt-bottom', h('span#createat_bottom')),
      h(
        'div.bottom',
        this.btn({
          title: 'Reply',
          className: 'comment-btn',
          active: !!'postmeta?.threaded[PostSubtype.Comment]',
          count: 0 && 'postmeta?.threads[PostSubtype.Comment]',
          onclick: this.comment,
          src: CommentIcon,
        }),
        this.btn({
          className: 'repost-btn',
          active: !!'postmeta?.threaded[PostSubtype.Repost]',
          count: 0 && 'postmeta?.threads[PostSubtype.Repost]',
          onclick: this.toggleRepost,
          src: RepostIcon,
          title: 'Repost',
        }),
        this.btn({
          className: 'like-btn',
          active: !!'postmeta?.moderated[ModerationSubtype.Like]',
          count: 0 && 'postmeta?.moderations[ModerationSubtype.Like]',
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
      h('span.count', `${count || 0}`),
    );
  }

  #fixMaxHeight = () => {
    const el = this.shadowRoot?.querySelector('div.content');
    if (el?.clientHeight && el.clientHeight >= 15 * 24) {
      el.classList.add('max-height');
    }
  };
}

register('post-card', PostCard);
