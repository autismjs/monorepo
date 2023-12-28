import { CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';

export default class Button extends CustomElement {
  css = css.toString();

  render() {
    const { disabled } = this.state;
    const btnProps: any = { disabled };

    if (!disabled) {
      delete btnProps.disabled;
      btnProps.onclick = this.onclick;
    }

    // @ts-ignore
    return h('button', btnProps, h('slot'));
  }
}

register('c-button', Button);
