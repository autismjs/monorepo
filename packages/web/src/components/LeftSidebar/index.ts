import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';
import $signer from '../../state/signer.ts';
import '../Editor';
import { ProofType } from '@message';
import $node from '../../state/node.ts';

@connect(() => ({
  ecdsa: $signer.$ecdsa,
}))
export default class LeftSidebar extends CustomElement {
  css = css.toString();

  onSubmit = async (e: CustomEvent) => {
    const { post, reset } = e.detail;

    if (post) {
      if ($signer.$ecdsa.$?.privateKey) {
        post.commit({
          type: ProofType.ECDSA,
          value: $signer.$ecdsa.$.sign(post.hash),
        });

        await $node.node.publish(post);
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
