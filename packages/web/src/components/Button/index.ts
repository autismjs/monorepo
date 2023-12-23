import { CustomElement, register } from '../../../lib/ui.ts';

export default class Button extends CustomElement {
  css = `
    button {
      transition: opacity 200ms;
      display: var(--display, flex);
      flex-flow: var(--flex-flow, row nowrap);
      align-items: var(--align-items, center);
      padding: var(--padding, .25rem .5rem);
      cursor: pointer;
      border: var(--border, 1px solid var(--slate-200));
      gap: var(--gap, 0);
      font-family: var(--font-family, --font-sans);
      font-size: var(--font-size, .875rem);
      color: var(--color, --black);
      background-color: var(--background-color, var(--slate-100));
      opacity: .9;
    }
    
    button:hover {
      opacity: .7;
    }
    
    button:active {
      opacity: 1;
    }
  `;

  html = `
    <button>
      <slot></slot>
    </button>
  `;
}

register('c-button', Button);
