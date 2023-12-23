import { CustomElement, Q, register } from '../../../lib/ui.ts';
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

  html = `
    <div class="post">
      <profile-image></profile-image>
      <div class="top">
        <div class="creator"></div>
        <div class="userId"></div>
        <div class="createAt-top"></div>
      </div>
      <div class="content"></div>
      <div class="bottom">
        <c-button class="comment-btn">
          <img src="${CommentIcon}" />
          <span></span>
        </c-button>
        <c-button class="repost-btn">
          <img src="${RepostIcon}" />
          <span></span>
        </c-button>
        <c-button class="like-btn">
          <img src="${LikeIcon}" />
          <span></span>
        </c-button>
      </div>
    </div>
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.loadPost();
  }

  async loadPost() {
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.dataset.hash!;
    const post = await node.$posts.get(hash);
    const q = Q(this.shadowRoot!)!;

    post!.subscribe(async (p) => {
      const user = await node.node.db.db.getProfile(p?.json.creator || '');
      const meta = await node.node.db.db.getPostMeta(p?.messageId || '');
      const displayName = user.name || userName(p?.json.creator) || 'Anonymous';
      const userHandle = userId(p?.json.creator);

      q.find('profile-image')!.attr('address', p?.json.creator || '');
      q.find('div.creator')!.content(displayName);
      q.find('div.userId')!.content(userHandle || '');
      q.find('div.content')!.content(p?.json.content || '');

      if (p?.json.createdAt) {
        q.find('div.createAt-top')!.html(`
          <span>&#183;</span>
          <span>${fromNow(p.json.createdAt)}</span>
        `);
      }

      if (typeof meta?.replies === 'number') {
        q.find('c-button.comment-btn')!
          .find('span')!
          .content('' + meta.replies);
      }

      q.find('c-button.repost-btn')!.find('span')!.content('0');
      q.find('c-button.like-btn')!.find('span')!.content('0');
    });
  }
}

register('post-card', Post);
