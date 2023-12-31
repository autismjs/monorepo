import { CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';

let i = 0;

export default class Button extends CustomElement {
  debug = i++;
  css = css.toString();

  render() {
    const { disabled, active } = this.state;
    const btnProps: any = {
      disabled,
      className: active ? 'button--active' : '',
    };

    if (!disabled) {
      delete btnProps.disabled;
      btnProps.onclick = this.onclick;
    }

    // @ts-ignore
    return h('button.button', btnProps, h('slot'));
  }
}

register('c-button', Button);
