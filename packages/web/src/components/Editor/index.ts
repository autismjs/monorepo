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

    return h(
      'div.editor',
      !!$editor.reference.$ &&
        h('post-card', {
          hash: $editor.reference.$,
        }),
      h(
        'div.post',
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
