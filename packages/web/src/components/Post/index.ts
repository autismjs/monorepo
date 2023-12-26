import { CustomElement, h, register, xh } from '../../../lib/ui.ts';
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
    return h(
      'div.post',
      () => {
        return h('profile-image', {
          creator: this.state.creator,
        });
      },
      h(
        'div.top',
        xh('div.creator', this.state.name),
        xh('div.userId', this.state.handle),
        h('div.createAt-top', h('span', '·'), h('span', this.state.createat)),
      ),
      h('div.content', this.state.content),
      h(
        'div.bottom',
        h(
          'c-button.comment-btn',
          h('img', { src: CommentIcon }),
          h('span', '0'),
        ),
        h('c-button.repost-btn', h('img', { src: RepostIcon }), h('span', '0')),
        h('c-button.like-btn', h('img', { src: LikeIcon }), h('span', '0')),
      ),
    );
  }

  async onmount() {
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.state.id;
    const post = node.$posts.get(hash);

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
