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
    this.loadPost();
  }

  async loadPost() {
    const store = getStore();
    const node = store.get<NodeStore>('node');
    const hash = this.dataset.hash!;
    const post = await node.$posts.get(hash);
    const q = Q(this.shadowRoot!);

    post!.subscribe((p) => {
      q.find('div#creator')!.content(p.json.creator || '');
      q.find('div#content')!.content(p.json.content || '');
      q.find('div#createdAt')!.content(p.json.createdAt.toDateString() || '');
    });
  }
}

register('post-card', Post);
