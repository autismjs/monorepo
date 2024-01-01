import { equal } from '../src/utils/misc.ts';
import { CustomElement } from './ui.ts';
import { types } from 'sass';
import Error = types.Error;

export type Subscription<ValueType = any> =
  | {
      next?: (oldValue: ValueType | null, newValue: ValueType) => void;
      error?: (err: Error) => void;
      complete?: () => void;
    }
  | ((oldValue: ValueType | null, newValue: ValueType) => void);

export class Observable<ObservableValue = any> {
  #state: ObservableValue;
  #error: Error | null = null;
  #subscriptions: Subscription<ObservableValue>[] = [];

  get $() {
    return this.#state;
  }

  set $(state: ObservableValue) {
    if (this.#state === state || equal(this.#state, state)) {
      return;
    }
    const oldState = this.#state;
    this.#state = state;

    for (const sub of this.#subscriptions) {
      if (typeof sub === 'function') {
        sub(oldState, state);
      } else if (typeof sub !== 'function' && sub.next) {
        sub.next(oldState, state);
      }
    }
  }

  get error(): Error | null {
    return this.#error;
  }

  set error(error: Error) {
    this.#error = error;
    for (const sub of this.#subscriptions) {
      if (typeof sub !== 'function' && sub.error) {
        sub.error(error);
      }
    }
  }

  constructor(state: ObservableValue) {
    this.#state = state;
  }

  done() {
    for (const sub of this.#subscriptions) {
      if (typeof sub !== 'function' && sub.complete) {
        sub.complete();
      }
    }
  }

  subscribe = (
    subscription: Subscription<ObservableValue>,
    leading = false,
  ) => {
    const currIndex = this.#subscriptions.indexOf(subscription);

    if (currIndex === -1) {
      this.#subscriptions.push(subscription);
      if (leading) {
        const sub = subscription;
        if (typeof sub === 'function') {
          sub(null, this.$);
        } else if (typeof sub !== 'function' && sub.next) {
          sub.next(null, this.$);
        }
      }
    }

    return () => {
      const index = this.#subscriptions.indexOf(subscription);
      if (index !== -1) {
        this.#subscriptions.splice(index, 1);
      }
    };
  };
}

export function useObserve<ValueType = any>(value: ValueType) {
  const store = new Observable(value);
  return [
    store.$,
    function setValue(newValue: ValueType) {
      store.$ = newValue;
    },
  ];
}

export function useEffect(
  callback: () => Promise<void>,
  dependencies: any[],
  element: CustomElement,
) {
  const oldlen = element.effects.length;

  if (!oldlen) {
    element.effects.push(dependencies);
    callback();
    return;
  }

  const old = element.effects.shift();

  if (old?.length !== dependencies.length) {
    throw new Error('Number of dependencies is different');
  }

  element.effects.push(dependencies);

  for (let i = 0; i < old.length; i++) {
    if (old[i] !== dependencies[i] && !equal(old[i], dependencies[i])) {
      callback();
      return;
    }
  }
}

export class ObservableMap<keyType = string, ValueType = any> {
  #onCreate: (key: keyType) => void;
  #map: Map<keyType, Observable<ValueType | null>> = new Map();

  constructor(onCreate: (key: keyType) => void) {
    this.#onCreate = onCreate;
  }

  get(key: keyType): Observable<ValueType | null> {
    const exist = this.#map.get(key);
    if (!exist) {
      this.#map.set(key, new Observable<ValueType | null>(null));
      this.#onCreate(key);
    }
    return this.#map.get(key) as Observable<ValueType | null>;
  }

  set(key: keyType, value: ValueType) {
    const post = this.get(key)!;
    if (post.$ !== value) {
      post.$ = value;
    }
  }
}

export function observable(target: any, key: string) {
  const currentValue = target[key];
  let currentStore = new Observable(currentValue);

  Object.defineProperty(target, `$${key}`, {
    set: (newValue: Observable<typeof currentValue>) => {
      currentStore = newValue;
    },
    get: () => {
      return currentStore;
    },
  });

  Object.defineProperty(target, key, {
    set: (newValue: string) => {
      currentStore.$ = newValue;
    },
    get: () => {
      return currentStore.$;
    },
  });
}
