import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';
import $signer from '../../state/signer.ts';
import '../Editor';
import { Post, PostSubtype, ProofType } from '@message';
import $node from '../../state/node.ts';
import $editor from '../../state/editor.ts';

@connect(() => ({
  ecdsa: $signer.$ecdsa,
  reference: $editor.reference,
}))
export default class LeftSidebar extends CustomElement {
  css = css.toString();

  onSubmit = async (e: CustomEvent) => {
    const { post, reset } = e.detail;

    const p = new Post({
      ...post.json,
      subtype: $editor.reference.$ ? PostSubtype.Comment : PostSubtype.Default,
      reference: $editor.reference.$ || '',
    });

    if (p) {
      if ($signer.$ecdsa.$?.privateKey) {
        p.commit({
          type: ProofType.ECDSA,
          value: $signer.$ecdsa.$.sign(p.hash),
        });

        await $node.node.publish(p);
        reset();
      }
    }
  };

  render() {
    return h(
      `div.left-sidebar`,
      // @ts-ignore
      h('post-editor', {
        creator: $signer.$ecdsa.$?.publicKey,
        onsubmit: this.onSubmit,
      }),
      h('c-button[disabled=true]', 'Import Private Key'),
      h(
        'c-button',
        // @ts-ignore
        {
          onclick: () => {
            $signer.generateRandomPrivateKey();
          },
        },
        'Generate Private Key',
      ),
    );
  }
}

register('left-sidebar', LeftSidebar);
