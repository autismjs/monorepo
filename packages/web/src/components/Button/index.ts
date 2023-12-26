import { CustomElement, h, register } from '../../../lib/ui.ts';
import css from './index.scss';

export default class Button extends CustomElement {
  css = css.toString();

  render() {
    return h('button', h('slot'));
  }
}

register('c-button', Button);
