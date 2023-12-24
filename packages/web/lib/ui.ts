import vdom, { VText, VTree } from 'virtual-dom';
import createElement from 'virtual-dom/create-element';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
const hyperx = require('hyperx');
const hpx = hyperx(vdom.h);

interface CustomElementConstructor {
  new (): CustomElement;
}

interface ICustomElement extends HTMLElement {
  state: any;
  render(): void;
}

export class CustomElement extends HTMLElement implements ICustomElement {
  css: string;
  html: string;

  #tree?: VTree;
  #approot?: any;

  render(): VTree {
    return hpx``;
  }

  get state() {
    return Array.from(this.attributes).reduce(
      (map: { [key: string]: string }, { name, value }) => {
        map[name] = value;
        return map;
      },
      {},
    );
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.patch();
  }

  patch = () => {
    if (!this.#approot) {
      this.#tree = this.render();
      this.#approot = createElement(this.#tree as VText);
      this.shadowRoot?.appendChild(html(`<style>${this.css}</style>`));
      this.shadowRoot?.appendChild(this.#approot);
    } else if (this.#tree) {
      const newTree = this.render();
      const patches = diff(this.#tree!, newTree);
      this.#approot = patch(this.#approot, patches);
      this.#tree = newTree;
    }
  };
}

export function html(htmlString: string) {
  const temp = document.createElement('template');
  temp.innerHTML = htmlString;
  return temp.content;
}

export function hx(...args: any[]) {
  return hpx.apply(hpx, args);
}

export function register(name: string, el: CustomElementConstructor) {
  window.customElements.define(name, el);
}

export const Q = (root: ShadowRoot | Element | null) => {
  if (!root) return root;

  const q = {
    el: root,
    attr: (key: string, value: string) => {
      if (root instanceof Element) {
        root.setAttribute(key, value);
      }
      return q;
    },
    content: (content: string) => {
      root.textContent = content;
      return q;
    },
    html: (htmlStr: string) => {
      root.innerHTML = '';
      root.append(html(htmlStr));
      return q;
    },
    find: (str: string) => Q(root.querySelector(str)),
    findAll: (
      str: string,
    ): Element[] & {
      patch: (
        result: any[],
        mapKeyFn: (data: any) => string,
        renderFn: (data: any) => Element | DocumentFragment,
      ) => void;
    } => {
      const list: any[] = Array.prototype.map.call(
        root.querySelectorAll(str),
        Q,
      );

      // @ts-ignore
      list.patch = (
        result: any[],
        mapKeyFn: (data: any) => string,
        renderFn: (data: any) => Element,
      ) => {
        const max = Math.max(list.length, result.length);
        for (let i = 0; i < max; i++) {
          const data = result[i];
          const last = list[i];
          const lastKey = last?.el?.getAttribute('key');
          const currKey = mapKeyFn(data);

          if (!last && data) {
            root.append(renderFn(data));
          } else if (last && !data) {
            root.removeChild(last);
          } else if (last && lastKey !== currKey) {
            root.replaceChild(renderFn(data), last.el);
          }
        }
      };

      // @ts-ignore
      return list;
    },
  };
  return q;
};
