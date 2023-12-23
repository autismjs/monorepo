import { CustomElement, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeStore } from '../../state/node.ts';
import { userId, userName } from '../../utils/misc.ts';
import '../ProfileImage';

export default class Post extends CustomElement {
  css = `
    .post {
      display: grid;
      grid-template-columns: 3rem auto;
      grid-template-rows: auto auto auto;
      padding: .5rem;
      grid-gap: .5rem;
      font-size: var(--font-size, 15px);
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
    
    .content {
      display: flex;
      flex-flow: row nowrap;
      grid-column-start: 2;
      grid-column-end: 3;
      grid-row-start: 2;
      grid-row-end: 3;
    }
    
    .bottom {
      display: flex;
      flex-flow: row nowrap;
      grid-column-start: 2;
      grid-column-end: 3;
      grid-row-start: 3;
      grid-row-end: 4;
    }
  `;

  html = `
    <div class="post">
      <profile-image></profile-image>
      <div class="top">
        <div class="creator"></div>
        <div class="userId"></div>
      </div>
      <div class="content"></div>
      <div class="bottom">
      <div class="createdAt"></div>
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
      const user = await node.node.db.db.getProfile(p!.json.creator || '');
      const displayName = user.name || userName(p?.json.creator) || 'Anonymous';
      const userHandle = userId(p?.json.creator);

      q.find('profile-image')?.attr('address', p?.json.creator || '');
      q.find('div.creator')!.content(displayName);
      q.find('div.userId')!.content(userHandle || '');
      q.find('div.content')!.content(p?.json.content || '');
      q.find('div.createdAt')!.content(p?.json.createdAt.toDateString() || '');
    });
  }
}

register('post-card', Post);
