import {
  connect,
  CustomElement,
  disabled,
  h,
  register,
  VNode,
} from '../../../lib/ui.ts';
import $signer from '../../state/signer.ts';
import { userId, userName } from '../../utils/misc.ts';
import { MessageType, Post, PostSubtype } from '@message';
import { Observable } from '../../../lib/state.ts';
import css from './index.scss';
import $editor from '../../state/editor.ts';
import XmarkIcon from '../../../static/icons/xmark.svg';

@connect(() => {
  const content = new Observable('');

  return {
    content,
    reference: $editor.reference,
  };
})
export default class Editor extends CustomElement {
  css = css.toString();
  onSubmit = () => {
    const creator = this.state.creator;
    const content = this.$.content.$;

    const post = new Post({
      type: MessageType.Post,
      subtype: PostSubtype.Default,
      content,
      creator,
      createdAt: new Date(),
    });

    this.dispatchEvent(
      new CustomEvent('submit', {
        detail: {
          post,
          reset: () => {
            this.$.content.$ = '';
            $editor.reference.$ = '';
          },
        },
      }),
    );
  };

  onInput = (event: any) => {
    this.$.content.$ = event.target.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { target: event.target },
      }),
    );
  };

  render(): VNode {
    const creator = this.state.creator;
    const name = userName(creator) || 'Anonymous';
    const handle = userId(creator) || '';
    const [_c, _h] = $editor.reference.$.split('/');
    const hash = _h || _c;
    const parentCreator = _h ? _c : '';
    const parentHandle = userId(parentCreator) || '';

    return h(
      'div.editor',
      h(
        'div.ref',
        {
          className: !hash ? 'ref--hidden' : '',
        },
        h('post-card.parent', {
          hash: hash,
        }),
        h(
          'div.ref__desc',
          // @ts-ignore
          {
            onclick: () => {
              $editor.reference.$ = '';
            },
          },
          h('img.xmark', {
            src: XmarkIcon,
          }),
          h(
            'span.ref__text.ref__text--cancel',
            `Cancel replying to ${parentHandle}`,
          ),
          h('span.ref__text.ref__text--reply', `Replying to ${parentHandle}`),
        ),
        h('div.ref__connector'),
      ),
      h(
        'div.post.editor__post',
        h('profile-image', {
          creator: creator,
        }),
        h('div.top', h('div.creator', name), h('div.userId', handle)),
        //@ts-ignore
        h('textarea.content', {
          content: this.$.content.$,
          value: this.$.content.$,
          rows: '6',
          placeholder: 'Say something here',
          oninput: this.onInput,
          ...disabled(!$signer.$ecdsa.$?.privateKey),
        }),
        h(
          'div.bottom',
          h(
            'c-button',
            // @ts-ignore
            {
              onclick: this.onSubmit,
              ...disabled(!this.$.content.$ || !$signer.$ecdsa.$?.privateKey),
            },
            'Submit',
          ),
        ),
      ),
    );
  }
}

register('post-editor', Editor);
