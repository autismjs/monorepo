import { CustomElement, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeStore } from '../../state/node.ts';

export default class Post extends CustomElement {
  css = `
    .post {
    
    }
  `;

  html = `
    <div class="post">
      <div id="creator"></div>
      <div id="content"></div>
      <div id="createdAt"></div>
    </div>
  `;

  async connectedCallback() {
    super.connectedCallback();
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.dataset.hash!;
    const post = await node.getPost(hash);
    const q = Q(this.shadowRoot!);
    q.find('div#creator')!.content(post?.json.creator || '');
    q.find('div#content')!.content(post?.json.content || '');
    q.find('div#createdAt')!.content(post?.json.createdAt.toDateString() || '');
  }
}

register('post-card', Post);
