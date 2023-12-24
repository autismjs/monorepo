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
  render: () => VTree;
  onmount(): Promise<void>;
  onupdate(): Promise<void>;
  onupdated(): Promise<void>;
}

export class CustomElement extends HTMLElement implements ICustomElement {
  css: string;
  html: string;
  #tree?: VTree;
  #approot?: any;

  onmount(): Promise<void> {
    return Promise.resolve();
  }

  onupdate(): Promise<void> {
    return Promise.resolve();
  }

  onupdated(): Promise<void> {
    return Promise.resolve();
  }

  render(): VTree {
    return hx`<div></div>`;
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

  async connectedCallback() {
    this.attachShadow({ mode: 'open' });
    await this.onmount();
    this.patch();
  }

  async attributeChangedCallback() {
    this.patch();
  }

  patch = () =>
    requestAnimationFrame(async () => {
      await this.onupdate();

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

      this.onupdated();
    });
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

type VNodeProps = {
  tagName: string;
  classList: string[];
  id?: string;
  attributes: Map<string, string>;
  children?: VNode[];
};

export class VNode {
  #id?: string;
  #tagName: string;
  #classList: string[] = [];
  #attributes = new Map<string, string>();
  #children: VNode[] = [];

  constructor(options: VNodeProps) {
    this.#tagName = options.tagName;
    this.#classList = options.classList;
    this.#id = options.id;
    this.#attributes = options.attributes;
    this.#children = options.children || [];
  }
}

export const $ = (name: string) => {
  const tagName = name.match(/^[^.|#|\[]*/g);
  const classList = name.match(/(?<=[.*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const id = name.match(/(?<=[#*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const attributes = name.match(/(?<=[\[])([^.#\[\]]*)+?(?=[\]*])?/g) || [];

  const vnode = new VNode({
    tagName: tagName![0],
    classList: classList || [],
    id: id ? id[0] : undefined,
    attributes: new Map(
      attributes.map((attr) => {
        const [key, value] = attr.split('=');
        return [key, value || ''];
      }),
    ),
  });

  return vnode;
};

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
