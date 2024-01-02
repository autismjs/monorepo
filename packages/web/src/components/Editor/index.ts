import {
  boolAttr,
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
import { ECDSA } from '@crypto';

export default class Editor extends CustomElement {
  css = css.toString();

  $content = new Observable('');

  async subscribe() {
    this.listen($editor.reference);
    this.listen($signer.$identity);
    this.listen(this.$content);
  }

  onSubmit = () => {
    const creator =
      $signer.$identity.$ instanceof ECDSA
        ? $signer.$identity.$.publicKey || ''
        : '';
    const content = this.$content.$;

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
            this.$content.$ = '';
          },
        },
      }),
    );
  };

  onInput = (event: any) => {
    this.$content.$ = event.target.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { target: event.target },
      }),
    );
  };

  async update() {
    await this.updateSigner();
    await this.updateReference();
  }

  async updateSigner() {
    const creator =
      $signer.$identity.$ instanceof ECDSA
        ? $signer.$identity.$.publicKey || ''
        : '';
    const name = userName(creator) || 'Anonymous';
    const handle = userId(creator) || '';
    this.query('profile-image')!.setAttribute('creator', creator);
    this.query('div.creator')!.textContent = name;
    this.query('div.userId')!.textContent = handle;

    this.query('textarea.content')!.setAttribute('content', this.$content.$);
    // @ts-ignore;
    this.query('textarea.content')!.value = this.$content.$;

    if (!$signer.$identity.$) {
      this.query('textarea.content')!.setAttribute('disabled', 'true');
    } else {
      this.query('textarea.content')!.removeAttribute('disabled');
    }

    if (!this.$content.$ || !$signer.$identity.$) {
      this.query('c-button#submit')!.setAttribute('disabled', 'true');
    } else {
      this.query('c-button#submit')!.removeAttribute('disabled');
    }
  }

  async updateReference() {
    const [_c, _h] = $editor.reference.$.split('/');
    const hash = _h || _c;
    const parentCreator = _h ? _c : '';
    const parentHandle = userId(parentCreator) || '';

    if (!!$editor.reference.$) {
      this.query('div.ref')!.classList.remove('ref--hidden');
    } else {
      this.query('div.ref')!.classList.add('ref--hidden');
    }

    this.query('post-card.parent')!.setAttribute('hash', hash);

    this.query('span.ref__text.ref__text--cancel')!.textContent =
      `Cancel replying to ${parentHandle}`;
    this.query('span.ref__text.ref__text--reply')!.textContent =
      `Replying to ${parentHandle}`;
  }

  render(): VNode {
    return h(
      'div.editor',
      h(
        'div.ref',
        {
          className: 'ref--hidden',
        },
        h('post-card.parent', {
          hash: '',
          ...boolAttr('hideactions', true),
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
          h('span.ref__text.ref__text--cancel'),
          h('span.ref__text.ref__text--reply'),
        ),
        h('div.ref__connector'),
      ),
      h(
        'div.post.editor__post',
        {
          ...boolAttr('comfortable', true),
        },
        h('profile-image', {
          creator: '',
        }),
        h('div.top', h('div.creator', ''), h('div.userId', '')),
        //@ts-ignore
        h('textarea.content', {
          content: this.$content.$,
          value: this.$content.$,
          rows: '6',
          placeholder: 'Say something here',
          oninput: this.onInput,
          ...disabled(!$signer.$identity.$),
        }),
        h(
          'div.bottom',
          h(
            'c-button#submit',
            // @ts-ignore
            {
              onclick: this.onSubmit,
              ...disabled(!this.$content.$ || !$signer.$identity.$),
            },
            'Submit',
          ),
        ),
      ),
    );
  }
}

register('post-editor', Editor);
