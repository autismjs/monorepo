import { CustomElement, register } from '../../../lib/ui.ts';
import css from './index.scss';

export default class Button extends CustomElement {
  css = css.toString();

  html = `
    <button>
      <slot></slot>
    </button>
  `;
}

register('c-button', Button);
