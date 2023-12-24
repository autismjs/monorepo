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
  static get observedAttributes() {
    return ['hash', 'creator', 'createat', 'content', 'name', 'handle'];
  }

  css = css.toString();

  render() {
    const { creator, name, handle, createat, content } = this.state;

    if (!creator) return hx`<div></div>`;

    return hx`
      <div class="post">
        ${hx`<profile-image id="${creator}" creator="${creator}"></profile-image>`}
        <div class="top">
          <div class="creator">${name}</div>
          <div class="userId">${handle}</div>
          <div class="createAt-top">
            <span>·</span>
            <span>${createat}</span>
          </div>
        </div>
        <div class="content">${content}</div>
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

  async onmount() {
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.state.id;
    const post = await node.$posts.get(hash);

    post!.subscribe(async (p) => {
      const user = await node.node.db.db.getProfile(p?.json.creator || '');

      const creator = p?.json.creator || '';
      const createat = fromNow(p?.json.createdAt);
      const content = p?.json.content || '';
      const name = user.name || userName(p?.json.creator) || 'Anonymous';
      const handle = userId(p?.json.creator);

      this.setAttribute('hash', hash);
      this.setAttribute('creator', creator);
      this.setAttribute('createat', createat || '');
      this.setAttribute('content', content);
      this.setAttribute('name', name);
      this.setAttribute('handle', handle || '');
    });
  }
}

register('post-card', Post);
