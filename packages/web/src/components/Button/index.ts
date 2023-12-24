import { CustomElement, hx, register } from '../../../lib/ui.ts';
import css from './index.scss';

export default class Button extends CustomElement {
  css = css.toString();

  render() {
    return hx`
      <button>
        <slot></slot>
      </button>
    `;
  }
}

register('c-button', Button);
