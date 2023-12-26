interface CustomElementConstructor {
  new (): CustomElement;
}

interface ICustomElement extends HTMLElement {
  state: any;
  render: () => VNode;
  onmount(): Promise<void>;
  onupdate(): Promise<void>;
  onupdated(): Promise<void>;
}

export class CustomElement extends HTMLElement implements ICustomElement {
  css: string;
  html: string;
  #tree?: VNode;
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

  render(): VNode {
    return h('div');
  }

  refresh() {
    if (this.shadowRoot) {
      this.#tree = this.render();
      this.shadowRoot.innerHTML = '';
      this.shadowRoot.appendChild(html(`<style>${this.css}</style>`));
      this.#tree.append(this.shadowRoot);
    }
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
    this.refresh();
    await this.onmount();
  }

  attributeChangedCallback(key: string, ov: string, nv: string) {
    if (nv === ov) return;

    requestAnimationFrame(async () => {
      const now = Date.now();
      const timeSince = now - this.#lastAttrUpdated;
      const wait = 100;

      const later = async () => {
        if (this.#attrUpdateTimeout) {
          clearTimeout(this.#attrUpdateTimeout);
          this.#attrUpdateTimeout = null;
        }
        this.#lastAttrUpdated = now;
        this.refresh();
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

  update = async () => {
    if (!this.shadowRoot) return;

    if (!this.#tree) {
      this.refresh();
    } else if (this.#tree) {
      await this.onupdate();
      this.#tree.update();
      this.onupdated();
    }
  };
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
  style?: CSSStyleDeclaration;
  content?: string;
  cache?: boolean;
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
  #patches: (() => any)[] = [];
  #updates: (() => any)[] = [];
  #el?: any;

  constructor(options: VNodeProps) {
    this.tagName = options.tagName;
    this.classList = options.classList || [];
    this.id = options.id;
    this.attributes = options.attributes || new Map();
    this.style = options.style;
    this.content = options.content;
    this.children = options.children || [];
    this.#updates = [];

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

  addPatch(patchFn: () => void) {
    this.#patches.push(patchFn);
  }

  append(root: ShadowRoot) {
    return new Promise(() => {
      const frag = this.createElement();
      root.append(frag);
      return frag;
    });
  }

  update() {
    for (const update of this.#updates) {
      update();
    }
  }

  createElement() {
    const frag = document.createDocumentFragment();

    const el = document.createElement(this.tagName);

    if (this.classList.length) el.classList.add(...this.classList);

    if (this.id) el.id = this.id;

    if (this.style) {
      for (const [k, v] of Object.entries(this.style)) {
        el.style[k as any] = v;
      }
    }

    if (this.attributes) {
      for (const [k, v] of this.attributes) {
        el.setAttribute(k, v);
      }
    }

    if (this.content) {
      el.textContent = this.content;
    }

    frag.append(el);

    for (const child of this.children) {
      const childFrag = child.createElement();

      el.appendChild(childFrag);
    }

    if (this.#patches.length) {
      const patch = () => {
        this.#patches.forEach((fn) => {
          fn();
        });
      };

      this.rootNode.#updates.push(patch);
    }

    this.#el = el;

    return frag;
  }
}

type DOMOptions = {
  style?: CSSStyleDeclaration;
  className?: string;
  children?: VNode[];
  cache?: boolean;
} & { [key: string]: string };

type VNodeOption = VNode | string | (() => VNode | VNode[]);
type VNodeOptions = VNodeOption | VNodeOption[];

export const h = (
  name: string,
  optionOrNodes?: DOMOptions | VNodeOptions,
  ...args: VNodeOption[]
) => {
  const tagName = name.match(/^[^.|#|\[]*/g);
  const classList = name.match(/(?<=[.*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const id = name.match(/(?<=[#*])([^.#\[\]]*)+?(?=[(#.\s\[)*])?/g);
  const attributes = name.match(/(?<=[\[])([^.#\[\]]*)+?(?=[\]*])?/g) || [];

  const patches: (() => { from: VNode | VNode[]; to: VNode | VNode[] })[] = [];

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

  for (const patch of patches) {
    vnode.addPatch(() => {
      if (!vnode.el) return;

      const { from, to } = patch();

      if (Array.isArray(to)) {
        vnode.el.append(...to.map((n) => n.createElement()));
      } else if (!Array.isArray(from)) {
        from.el.replaceWith(to.createElement());
      }
    });
  }

  return vnode;

  function reduceChildren(
    props: VNodeProps,
    nodeOrStrings: VNodeOptions,
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

  function mapNodeText(nodeOrText: VNodeOption): VNode[] {
    if (nodeOrText instanceof VNode) {
      return [nodeOrText];
    }

    if (typeof nodeOrText === 'string') {
      return [new VNode({ tagName: 'text', content: nodeOrText })];
    }

    const nodes = nodeOrText();
    let retNodes = nodes;

    if (!Array.isArray(nodes)) {
      retNodes = [nodes];
    }

    const oldNodes = nodes;

    patches.push(() => {
      const newNodes = nodeOrText();
      return {
        from: oldNodes,
        to: newNodes,
      };
    });

    return retNodes as VNode[];
  }

  function reduceOption(props: VNodeProps, opts: DOMOptions): VNodeProps {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content, cache, children, className, style, id, ...rest } = opts;

    const newProps = { ...props };

    newProps.classList = newProps.classList || [];
    newProps.attributes = newProps.attributes || new Map();

    if (className)
      newProps.classList = newProps.classList.concat(className.split(' '));
    if (style) newProps.style = style;
    if (id) newProps.id = id;
    if (children) newProps.children = children.concat(children);
    if (cache) newProps.cache = cache;
    if (content) newProps.content = content;

    for (const [key, value] of Object.entries(rest)) {
      newProps.attributes.set(key, value || '');
    }

    return newProps;
  }
};

export const xh = (
  name: string,
  optionOrNodes?: DOMOptions | string | VNode | VNode[],
  ...args: (VNode | string)[]
) => {
  return () => {
    return h(name, optionOrNodes, ...args);
  };
};
