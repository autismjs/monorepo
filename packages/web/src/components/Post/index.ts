import { CustomElement, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeStore } from '../../state/node.ts';
import { fromNow, userId, userName } from '../../utils/misc.ts';
import CommentIcon from '../../../static/icons/comment.svg';
import RepostIcon from '../../../static/icons/repost.svg';
import LikeIcon from '../../../static/icons/like.svg';
import '../ProfileImage';
import '../Button';

export default class Post extends CustomElement {
  css = `
    .post {
      display: grid;
      background: var(--white);
      grid-template-columns: 3rem auto;
      grid-template-rows: auto auto auto;
      padding: .5rem;
      grid-gap: .5rem;
      font-size: var(--font-size, --root-size);
      border: var(--border, none);
      cursor: default;
    }
    
    profile-image {
      --display: inline-block;
      --width: 3rem;
      --height: 3rem;
      grid-column-start: 1;
      grid-column-end: 2;
      grid-row-start: 1;
      grid-row-end: 4;
    }
    
    .top {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      grid-column-start: 2;
      grid-column-end: 3;
      grid-row-start: 1;
      grid-row-end: 2;
      gap: .25rem;
    }
    
    .creator {
      font-weight: 700;
    }
    
    .userId {
      color: var(--slate-300);
    }
    
    .createAt-top {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      color: var(--slate-300);
      gap: 0.25rem;
    }
    
    .content {
      display: flex;
      flex-flow: row nowrap;
      grid-column-start: 2;
      grid-column-end: 3;
      grid-row-start: 2;
      grid-row-end: 3;
      padding-bottom: .25rem;
    }
    
    .bottom {
      display: flex;
      flex-flow: row nowrap;
      grid-column-start: 2;
      grid-column-end: 3;
      grid-row-start: 3;
      grid-row-end: 4;
      gap: .25rem;
    }
    
    .bottom > c-button {
      --gap: .5rem;
      --font-family: var(--font-mono);
      --font-size: var(--text-base);
    }
    
    .bottom > c-button > img {
      width: var(--text-base);
      height: var(--text-base);
    }
    
    .comment-btn {
      --color: var(--blue-500);
      --background-color: var(--blue-200);
      --border: 1px solid var(--blue-300);
    }
    
    .repost-btn {
      --color: var(--green-500);
      --background-color: var(--green-200);
      --border: 1px solid var(--green-300);
    }
    
    .like-btn {
      --color: var(--red-500);
      --background-color: var(--red-200);
      --border: 1px solid var(--red-300);
    }
  `;

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
