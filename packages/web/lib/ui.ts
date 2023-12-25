import vdom, { VText as VDText, VTree } from 'virtual-dom';
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
  #lastAttrUpdated = 0;
  #attrUpdateTimeout: any;

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

  attributeChangedCallback() {
    requestAnimationFrame(() => {
      const now = Date.now();
      const timeSince = now - this.#lastAttrUpdated;
      const wait = 100;

      const later = () => {
        if (this.#attrUpdateTimeout) {
          clearTimeout(this.#attrUpdateTimeout);
          this.#attrUpdateTimeout = null;
        }
        this.#lastAttrUpdated = now;
        this.patch();
      };

      if (timeSince > wait) {
        later();
      } else {
        if (this.#attrUpdateTimeout) {
          clearTimeout(this.#attrUpdateTimeout);
        }
        this.#attrUpdateTimeout = setTimeout(
          later,
          Math.max(0, wait - timeSince),
        );
      }
      this.#lastAttrUpdated = now;
    });
  }

  patch = async () => {
    await this.onupdate();

    if (!this.#approot) {
      this.#tree = this.render();
      this.#approot = createElement(this.#tree as VDText);
      this.shadowRoot?.appendChild(html(`<style>${this.css}</style>`));
      this.shadowRoot?.appendChild(this.#approot);
    } else if (this.#tree) {
      const newTree = this.render();
      const patches = diff(this.#tree!, newTree);
      this.#approot = patch(this.#approot, patches);
      this.#tree = newTree;
    }

    this.onupdated();
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

type VNodeProps = {
  tagName: string;
  classList?: string[];
  id?: string;
  attributes?: Map<string, string>;
  children?: VNode[];
  style?: CSSStyleDeclaration;
  content?: string;
};

export class VNode {
  id?: string;
  tagName: string;
  classList: string[] = [];
  attributes = new Map<string, string>();
  children: VNode[] = [];
  style?: CSSStyleDeclaration;
  parentNode?: VNode;
  content?: string;

  constructor(options: VNodeProps) {
    this.tagName = options.tagName;
    this.classList = options.classList || [];
    this.id = options.id;
    this.attributes = options.attributes || new Map();
    this.style = options.style;
    this.content = options.content;
    this.children = options.children || [];
    for (const node of this.children) {
      node.parentNode = this;
    }
  }
}

type DOMOptions = {
  style?: CSSStyleDeclaration;
  className?: string;
  children?: VNode[];
} & { [key: string]: string };

export const h = (
  name: string,
  optionOrNodes?: DOMOptions | string | VNode | VNode[],
  ...args: (VNode | string)[]
) => {
  const tagName = name.match(/^[^.|#|\[]*/g);
  const classList = name.match(/(?<=[.*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const id = name.match(/(?<=[#*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const attributes = name.match(/(?<=[\[])([^.#\[\]]*)+?(?=[\]*])?/g) || [];

  const nodeOpts: VNodeProps = {
    tagName: tagName![0],
    classList: classList || [],
    id: id ? id[0] : undefined,
    attributes: new Map(
      attributes.map((attr) => {
        const [key, value] = attr.split('=');
        return [key, value || ''];
      }),
    ),
  };

  nodeOpts.children = [];
  nodeOpts.classList = nodeOpts.classList || [];
  nodeOpts.attributes = nodeOpts.attributes || new Map();

  if (typeof optionOrNodes === 'object') {
    const opts = optionOrNodes as DOMOptions;
    const { children, className, style, id, ...rest } = opts;
    if (className)
      nodeOpts.classList = nodeOpts.classList.concat(className.split(' '));
    if (style) nodeOpts.style = style;
    if (id) nodeOpts.id = id;
    if (children) nodeOpts.children = children.concat(children);

    for (const [key, value] of Object.entries(rest)) {
      nodeOpts.attributes.set(key, value);
    }
  } else {
    if (Array.isArray(optionOrNodes)) {
      nodeOpts.children = nodeOpts.children.concat(
        optionOrNodes.map((o) => {
          if (typeof o === 'string') {
            return new VNode({
              tagName: 'text',
              content: o,
            });
          }
          return o;
        }),
      );
    } else if (optionOrNodes) {
      if (typeof optionOrNodes === 'string') {
        nodeOpts.children = nodeOpts.children.concat(
          new VNode({
            tagName: 'text',
            content: optionOrNodes,
          }),
        );
      } else {
        nodeOpts.children = nodeOpts.children.concat(optionOrNodes);
      }
    }
  }

  if (Array.isArray(args)) {
    nodeOpts.children = nodeOpts.children.concat(
      args.map((o) => {
        if (typeof o === 'string') {
          return new VNode({
            tagName: 'text',
            content: o,
          });
        }
        return o;
      }),
    );
  } else if (args) {
    if (typeof args === 'string') {
      nodeOpts.children = nodeOpts.children.concat(
        new VNode({
          tagName: 'text',
          content: args,
        }),
      );
    } else {
      nodeOpts.children = nodeOpts.children.concat(args);
    }
  }

  const vnode = new VNode(nodeOpts);

  return vnode;
};
