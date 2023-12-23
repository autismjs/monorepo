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
