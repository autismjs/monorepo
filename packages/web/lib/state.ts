import { equal } from '../src/utils/misc.ts';

export type Subscription<ValueType = any> =
  | {
      next?: (value: ValueType) => void;
      error?: (err: Error) => void;
      complete?: () => void;
    }
  | ((value: ValueType) => void);

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
    this.#state = state;
    for (const sub of this.#subscriptions) {
      if (typeof sub === 'function') {
        sub(state);
      } else if (typeof sub !== 'function' && sub.next) {
        sub.next(state);
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

  subscribe(subscription: Subscription<ObservableValue>) {
    const currIndex = this.#subscriptions.indexOf(subscription);
    if (currIndex === -1) {
      this.#subscriptions.push(subscription);
      const sub = subscription;
      if (typeof sub === 'function') {
        sub(this.$);
      } else if (typeof sub !== 'function' && sub.next) {
        sub.next(this.$);
      }
    }
    return () => {
      const index = this.#subscriptions.indexOf(subscription);
      if (index !== -1) {
        this.#subscriptions.splice(index, 1);
      }
    };
  }
}

export class ObservableMap<keyType = string, ValueType = any> {
  #map: Map<keyType, Observable<ValueType | null>> = new Map();

  get(key: keyType) {
    const exist = this.#map.get(key);
    if (!exist) {
      this.#map.set(key, new Observable<ValueType | null>(null));
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
