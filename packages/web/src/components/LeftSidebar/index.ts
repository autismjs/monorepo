import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';
import { Observable } from '../../../lib/state.ts';

@connect(() => {
  const content = new Observable('');
  return {
    content,
  };
})
export default class LeftSidebar extends CustomElement {
  css = css.toString();

  render() {
    const creator = '';
    const name = 'Anonymous';
    const handle = '0x1234';
    const content = this.$.content.$;

    return h(
      `div.left-sidebar`,
      h(
        'div.editor',
        h(
          'div.post',
          h('profile-image', {
            creator: creator,
          }),
          h('div.top', h('div.creator', name), h('div.userId', handle)),
          //@ts-ignore
          h('textarea.content', {
            content: content,
            rows: '6',
            placeholder: 'Say something here',
            onchange: (event: any) => {
              this.$.content.$ = event.target.value;
            },
          }),
          h('div.bottom', h('c-button', {}, 'Submit')),
        ),
      ),
      h('c-button', 'Import Private Key'),
      h('c-button', 'Generate Private Key'),
    );
  }
}

register('left-sidebar', LeftSidebar);
