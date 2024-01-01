import { Observable } from './state.ts';

interface CustomElementConstructor {
  new (): CustomElement;
}

interface ICustomElement extends HTMLElement {
  state: any;
  render: () => VNode;
  onmount?(): Promise<void>;
  update?(): Promise<void>;
  subscribe?(): Promise<void>;
}

export class CustomElement extends HTMLElement implements ICustomElement {
  css: string;
  #tree?: VNode;
  #mounted = false;
  #lastAttrUpdated = 0;
  #attrUpdateTimeout: any;

  #lastPainted = 0;
  #paintTimeout: any;

  $?: any;
  effects: any[][] = [];
  #selectors = new Map<string, Element>();
  #unsubscribes: (() => void)[] = [];
  onmount?(): Promise<void>;
  update?(): Promise<void>;
  subscribe?(): Promise<void>;

  async connectedCallback() {
    if (this.#tree) {
      await this.#update();
      return;
    }
    this.attachShadow({ mode: 'open' });
    if (this.onmount) await this.onmount();
    this.create();
    await this.#subscribe();
  }

  get tree() {
    return this.#tree;
  }

  child(index: number) {
    return this.children[index];
  }

  listen(store: Observable, leading = false) {
    const cb = store.subscribe(this.#update, leading);
    this.#unsubscribes.push(cb);
  }

  unsubscribe = () => {
    for (const unsubscribe of this.#unsubscribes) {
      unsubscribe();
    }
    this.#unsubscribes = [];
  };

  query = (selector: string) => {
    if (!this.shadowRoot) {
      return null;
    }

    if (this.#selectors.has(selector)) {
      return this.#selectors.get(selector);
    }

    const el = this.shadowRoot!.querySelector(selector);

    if (el) {
      this.#selectors.set(selector, el);
    }

    return el;
  };

  render(): VNode {
    return h('div');
  }

  create = () => {
    if (!this.shadowRoot) return;

    this.#tree = this.render();
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(html(`<style>${this.css}</style>`));
    this.#tree.append(this.shadowRoot);
  };

  get state() {
    return Array.from(this.attributes).reduce(
      (map: { [key: string]: string }, { name, value }) => {
        map[name] = value;
        return map;
      },
      {},
    );
  }

  #subscribe = async () => {
    if (this.subscribe) await this.subscribe();
  };

  #update = async () => {
    const now = Date.now();

    requestAnimationFrame(async () => {
      const timeSince = now - this.#lastPainted;
      const wait = 100;

      const later = async () => {
        if (this.#paintTimeout) {
          clearTimeout(this.#paintTimeout);
          this.#paintTimeout = null;
        }
        this.#lastPainted = now;
        if (this.update) await this.update();
        this.unsubscribe();
        await this.#subscribe();
      };

      if (timeSince > wait) {
        await later();
      } else {
        if (this.#paintTimeout) {
          clearTimeout(this.#paintTimeout);
        }
        this.#paintTimeout = setTimeout(later, Math.max(0, wait - timeSince));
      }

      this.#lastPainted = now;
    });
  };

  attributeChangedCallback(key: string, ov: string, nv: string) {
    if (nv === ov) return;

    return requestAnimationFrame(async () => {
      const now = Date.now();
      const timeSince = now - this.#lastAttrUpdated;
      const wait = 100;

      const later = async () => {
        if (this.#attrUpdateTimeout) {
          clearTimeout(this.#attrUpdateTimeout);
          this.#attrUpdateTimeout = null;
        }
        this.#lastAttrUpdated = now;
        // console.log(key, ov, nv);
        await this.#update();
      };

      if (timeSince > wait) {
        await later();
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
}

export function html(htmlString: string) {
  const temp = document.createElement('template');
  temp.innerHTML = htmlString;
  return temp.content;
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
  content?: string;
  oninput?: () => void;
  onsubmit?: () => void;
  onclick?: () => void;
};

export class VNode {
  id?: string;
  tagName: string;
  classList: string[] = [];
  attributes = new Map<string, string>();
  children: VNode[] = [];
  oninput?: () => void;
  onsubmit?: () => void;
  onclick?: () => void;
  parentNode?: VNode;
  content?: string;
  #el?: any;

  constructor(options: VNodeProps) {
    this.tagName = options.tagName;
    this.classList = options.classList || [];
    this.id = options.id;
    this.attributes = options.attributes || new Map();
    this.content = options.content;
    this.oninput = options.oninput;
    this.onsubmit = options.onsubmit;
    this.onclick = options.onclick;
    this.children = options.children || [];

    for (const node of this.children) {
      node.parentNode = this;
    }
  }

  get el() {
    return this.#el;
  }

  get rootNode(): VNode {
    if (this.parentNode) {
      return this.parentNode;
    }

    return this;
  }

  append(root: ShadowRoot) {
    const frag = this.createElement();
    root.append(frag);
    return frag;
  }

  createElement() {
    const frag = document.createDocumentFragment();

    const el = document.createElement(this.tagName);

    if (this.classList.length) el.classList.add(...this.classList);

    if (this.id) el.id = this.id;

    if (this.attributes) {
      for (const [k, v] of this.attributes) {
        el.setAttribute(k, v);
      }
    }

    if (this.content) {
      el.textContent = this.content;
    }

    if (this.oninput) el.addEventListener('input', this.oninput);
    if (this.onclick) el.addEventListener('click', this.onclick);
    if (this.onsubmit) el.addEventListener('submit', this.onsubmit);

    frag.append(el);

    for (const child of this.children) {
      const childFrag = child.createElement();

      el.appendChild(childFrag);
    }

    this.#el = el;

    return frag;
  }
}

type DOMOptions = {
  className?: string;
  children?: VNode[];
  oninput?(): void;
  onsubmit?(): void;
  onclick?(): void;
} & { [key: string]: string };

type VNodeOption = VNode | string | (() => VNode | VNode[]) | boolean;
type VNodeOptions = VNodeOption | VNodeOption[];

export const h = (
  name: string,
  optionOrNodes?: DOMOptions | VNodeOptions,
  ...args: VNodeOptions[]
) => {
  const tagName = name.match(/^[^.|#|\[]*/g);
  const classList = name.match(/(?<=[.*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const id = name.match(/(?<=[#*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const attributes = name.match(/(?<=[\[])([^.#\[\]]*)+?(?=[\]*])?/g) || [];

  let options: VNodeProps = {
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

  if (optionOrNodes) {
    if (
      !(optionOrNodes instanceof VNode) &&
      !Array.isArray(optionOrNodes) &&
      typeof optionOrNodes === 'object'
    ) {
      options = reduceOption(options, optionOrNodes);
    } else {
      options = reduceChildren(options, optionOrNodes);
    }
  }

  if (args) {
    options = reduceChildren(options, args);
  }

  const vnode = new VNode({
    ...options,
  });

  return vnode;

  function reduceChildren(
    props: VNodeProps,
    nodeOrStrings: VNodeOptions | VNodeOptions[],
  ): VNodeProps {
    let newProps = { ...props };
    if (Array.isArray(nodeOrStrings)) {
      newProps = {
        ...options,
        children: (newProps.children || []).concat(
          nodeOrStrings
            .map(mapNodeText)
            .reduce((list, node) => list.concat(node), []),
        ),
      };
    } else if (nodeOrStrings) {
      newProps = {
        ...options,
        children: (newProps.children || []).concat(mapNodeText(nodeOrStrings)),
      };
    }

    return newProps;
  }

  function mapNodeText(nodeOrText: VNodeOptions): VNode[] {
    if (nodeOrText instanceof VNode) {
      return [nodeOrText];
    }

    if (typeof nodeOrText === 'string') {
      return [new VNode({ tagName: 'text', content: nodeOrText })];
    }

    if (typeof nodeOrText === 'boolean') {
      return [];
    }

    if (Array.isArray(nodeOrText)) {
      return nodeOrText.reduce((list: VNode[], n) => {
        list.concat(mapNodeText(n));
        return list;
      }, []);
    }

    const nodes = nodeOrText();
    let retNodes = nodes;

    if (!Array.isArray(nodes)) {
      retNodes = [nodes];
    }

    return retNodes as VNode[];
  }

  function reduceOption(props: VNodeProps, opts: DOMOptions): VNodeProps {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      onclick,
      oninput,
      onsubmit,
      content,
      children,
      className,
      id,
      ...rest
    } = opts;

    const newProps = { ...props };

    newProps.classList = newProps.classList || [];
    newProps.attributes = newProps.attributes || new Map();

    if (className)
      newProps.classList = newProps.classList.concat(className.split(' '));
    if (id) newProps.id = id;
    if (children) newProps.children = children.concat(children);
    if (content) newProps.content = content;

    if (oninput) newProps.oninput = oninput;
    if (onclick) newProps.onclick = onclick;
    if (onsubmit) newProps.onsubmit = onsubmit;

    for (const [key, value] of Object.entries(rest)) {
      newProps.attributes.set(key, value || '');
    }

    return newProps;
  }
};

/**
 *
 * @param getStore
 */
export function connect(
  getStore:
    | ((
        element: CustomElement,
      ) =>
        | { [key: string]: Observable | undefined | null }
        | (Observable | undefined | null))
    | Observable,
): any {
  return function (ctx: () => CustomElement) {
    const oldonmount = ctx.prototype.onmount;
    if (!oldonmount) return;
    ctx.prototype.onmount = function () {
      oldonmount.call(this);

      if (getStore instanceof Observable) {
        this.$ = getStore;
        getStore.subscribe(this.update);
      } else if (typeof getStore === 'function') {
        const stores = getStore(this);

        this.$ = stores;
        if (stores instanceof Observable) {
          stores?.subscribe(this.update);
        } else {
          for (const key in stores) {
            if (stores.hasOwnProperty(key)) {
              const store = stores[key];
              store?.subscribe(this.update);
            }
          }
        }
      }
    };
  };
}

export function disabled(bool?: any): { disabled?: 'true' } {
  const obj: { disabled?: 'true' } = {};
  if (!!bool) obj.disabled = 'true';
  return obj;
}

export function boolAttr(key: string, bool?: any): { [key: string]: 'true' } {
  const obj: { [key: string]: 'true' } = {};
  if (!!bool) obj[key.toLowerCase()] = 'true';
  return obj;
}

type UIRouterElement = (new () => CustomElement) | CustomElement;

class UIRouter {
  #hasInit = false;

  #routes: [RegExp, UIRouterElement][] = [];

  $pathname = new Observable('');

  #el?: CustomElement;

  #loaded = false;

  get pathname() {
    return this.$pathname.$;
  }

  constructor() {
    this.$pathname.subscribe(this.update);
  }

  #refreshPath = () => {
    this.$pathname.$ = window.location.pathname;
  };

  #init() {
    if (!this.#hasInit) {
      window.addEventListener('popstate', () => {
        this.#refreshPath();
      });
      window.addEventListener('DOMContentLoaded', () => {
        this.#refreshPath();
      });
      this.#hasInit = true;
    }
  }

  go = (url: string) => {
    this.#init();
    window.history.pushState({}, '', url);
    this.#refreshPath();
  };

  add = (path: RegExp, node: UIRouterElement) => {
    this.#init();
    this.#routes.push([path, node]);
  };

  update = () => {
    this.#init();
    for (const [path, element] of this.#routes) {
      if (path.test(this.pathname)) {
        const el = element instanceof CustomElement ? element : new element();

        if (this.#el && this.#el !== el) {
          this.#el.replaceWith(el);
          this.#el = el;
        } else if (!this.#el) {
          document.body.append(el);
          this.#el = el;
        }
        return;
      }
    }
  };
}

export const Router = new UIRouter();
