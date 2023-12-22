export type StateOptions = { [key: string]: BaseState };

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
  prevState: Map<string, BaseState | any>,
  nextState: Map<string, BaseState | any>,
) => void | Promise<void>;

export default class BaseState {
  private states: Map<string, BaseState | any> = new Map();
  private handlers: Map<string, RPCHandler> = new Map();
  private subscriptions: SubscriptionHandler[] = [];

  constructor(states?: StateOptions) {
    Object.entries(states || {}).forEach(([key, value]) => {
      this.states.set(key, value);
    });
  }

  get(key: string): BaseState | undefined {
    return this.states.get(key);
  }

  rpc(rpcType: string, handler: RPCHandler) {
    this.handlers.set(rpcType, handler);
  }

  async dispatch(rpc: RPC) {
    const prevState = new Map(this.states);

    const handler = this.handlers.get(rpc.method);

    if (handler) {
      await handler(rpc);
    }

    for (const [, state] of this.states) {
      if (state instanceof BaseState) {
        await state.dispatch(rpc);
      }
    }

    const nextState = this.states;

    for (const cb of this.subscriptions) {
      await cb(prevState, nextState);
    }
  }

  subscribe(callback: SubscriptionHandler) {
    this.subscriptions.push(callback);
  }
}
