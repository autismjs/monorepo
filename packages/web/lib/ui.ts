interface CustomElementConstructor {
  new (): CustomElement;
}
export class CustomElement extends HTMLElement {
  css: string;
  html: string;

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    const temp = document.createElement('template');
    temp.innerHTML = `<style>${this.css}</style>${this.html}`;
    this.shadowRoot?.appendChild(temp.content);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function html(htmlString: string) {
  const temp = document.createElement('template');
  temp.innerHTML = htmlString;
  return temp.content;
}

export function register(name: string, el: CustomElementConstructor) {
  window.customElements.define(name, el);
}

export const Q = (root: ShadowRoot | Element) => {
  return {
    find: (str: string) => E(root.querySelector(str)),
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
        E,
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
          const lastKey = last?.getAttribute('key');
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
};

const E = (el: Element | null) => {
  if (!el) return el;

  return {
    el: el,
    content: (content: string) => {
      el.textContent = content;
      return el;
    },
    attr: (key: string, value: string) => {
      el.setAttribute(key, value);
      return el;
    },
    getAttribute: el.getAttribute.bind(el),
  };
};
