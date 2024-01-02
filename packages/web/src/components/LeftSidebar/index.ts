import { CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';
import $signer from '../../state/signer.ts';
import '../Editor';
import { Post, PostSubtype, ProofType } from '@message';
import $node from '../../state/node.ts';
import $editor from '../../state/editor.ts';
import { ECDSA, ZK } from '@crypto';

export default class LeftSidebar extends CustomElement {
  css = css.toString();

  async subscribe(): Promise<void> {
    this.listen($signer.$identity);
    this.listen($editor.reference);
  }

  onSubmit = async (e: CustomEvent) => {
    const { post, reset } = e.detail;

    const p = new Post({
      ...post.json,
      subtype: $editor.reference.$ ? PostSubtype.Comment : PostSubtype.Default,
      reference: $editor.reference.$ || '',
    });

    const identity = $signer.$identity.$;

    console.log(p, identity);
    if (p && identity) {
      if (identity instanceof ECDSA) {
        const signature = await identity.sign(p.hash);
        p.commit({
          type: ProofType.ECDSA,
          value: signature,
        });
      } else if (identity instanceof ZK) {
        // p.commit({
        //   type: ProofType.Semaphore,
        //   value: await identity.genSemaphoreProof({
        //     signal: p.hash,
        //     merkleProof: tree.createProof(0),
        //   }),
        // });
      }

      await $node.node.publish(p);
      reset();
    }
  };

  render() {
    return h(
      `div.left-sidebar`,
      // @ts-ignore
      h('post-editor', {
        onsubmit: this.onSubmit,
      }),
      h('c-button[disabled=true]', 'Import Private Key'),
      h(
        'c-button',
        // @ts-ignore
        {
          onclick: () => {
            $signer.generateRandomZKIdentity();
          },
        },
        'Generate Private Key',
      ),
    );
  }
}

register('left-sidebar', LeftSidebar);
