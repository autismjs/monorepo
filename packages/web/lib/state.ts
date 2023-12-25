export type StateOptions = { [key: string]: Store };

export type RPC<Params = any> = {
  method: string;
  params?: Params;
  error?: {
    code: number;
    message: string;
  };
};

export type RPCHandler = (rpc: RPC) => void | Promise<void>;
export type SubscriptionHandler = (
  prevState: Map<string, Store | any>,
  nextState: Map<string, Store | any>,
) => void | Promise<void>;

export default class Store {
  private states: Map<string, Store | any> = new Map();
  private handlers: Map<string, RPCHandler> = new Map();

  constructor(states?: StateOptions) {
    Object.entries(states || {}).forEach(([key, value]) => {
      this.states.set(key, value);
    });
  }

  get<RetType = Store | undefined>(key: string): RetType {
    return this.states.get(key);
  }

  rpc(rpcType: string, handler: RPCHandler) {
    this.handlers.set(rpcType, handler);
  }

  async dispatch(rpc: RPC) {
    const handler = this.handlers.get(rpc.method);

    if (handler) {
      await handler(rpc);
    }

    for (const [, state] of this.states) {
      if (state instanceof Store) {
        await state.dispatch(rpc);
      }
    }
  }
}

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

  get state() {
    return this.#state;
  }

  set state(state: ObservableValue) {
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
        sub(this.state);
      } else if (typeof sub !== 'function' && sub.next) {
        sub.next(this.state);
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
    return this.#map.get(key);
  }

  set(key: keyType, value: ValueType) {
    const post = this.get(key)!;
    post.state = value;
  }
}

export function obervable(target: any, key: string) {
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
      currentStore.state = newValue;
    },
    get: () => {
      return currentStore.state;
    },
  });
}
