import { CustomElement, hx, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeStore } from '../../state/node.ts';
import { fromNow, userId, userName } from '../../utils/misc.ts';
import CommentIcon from '../../../static/icons/comment.svg';
import RepostIcon from '../../../static/icons/repost.svg';
import LikeIcon from '../../../static/icons/like.svg';
import '../ProfileImage';
import '../Button';
import css from './index.scss';

export default class Post extends CustomElement {
  css = css.toString();

  async connectedCallback() {
    super.connectedCallback();
    this.subscribe();
  }

  async render() {
    const node = getStore().get<NodeStore>('node');
    const hash = this.dataset.hash!;
    const post = await node.$posts.get(hash);
    const p = post?.state;
    const user = await node.node.db.db.getProfile(p?.json.creator || '');
    // const meta = await node.node.db.db.getPostMeta(p?.messageId || '');
    const displayName = user.name || userName(p?.json.creator) || 'Anonymous';
    const userHandle = userId(p?.json.creator);

    return hx`
      <div class="post">
        <profile-image address="${p?.json.creator || ''}"></profile-image>
        <div class="top">
          <div class="creator">${displayName}</div>
          <div class="userId">${userHandle || ''}</div>
          <div class="createAt-top">
            <span>&#183;</span>
            <span>${fromNow(p?.json.createdAt)}</span>
          </div>
        </div>
        <div class="content">${p?.json.content || ''}</div>
        <div class="bottom">
          <c-button class="comment-btn">
            <img src="${CommentIcon}" />
            <span>${0}</span>
          </c-button>
          <c-button class="repost-btn">
            <img src="${RepostIcon}" />
            <span>0</span>
          </c-button>
          <c-button class="like-btn">
            <img src="${LikeIcon}" />
            <span>0</span>
          </c-button>
        </div>
      </div>
    `;
  }

  async subscribe() {
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.dataset.hash!;
    const post = await node.$posts.get(hash);

    post!.subscribe(this.patch);
  }
}

register('post-card', Post);
