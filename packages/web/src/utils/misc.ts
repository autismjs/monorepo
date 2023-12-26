import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export function userId(pubkey?: string) {
  if (!pubkey) return null;
  return '@' + ellipsify(pubkey);
}

export function userName(pubkey?: string) {
  if (!pubkey) return null;
  return ellipsify(pubkey);
}

export function ellipsify(pubkey?: string, start = 6, end = 4) {
  if (!pubkey) return null;
  return pubkey.slice(0, start) + '...' + pubkey.slice(-end);
}

export function fromNow(date?: Date, withoutSuffix = true) {
  if (!date) return null;
  return dayjs(date).fromNow(withoutSuffix);
}

export function throttle(delay: number) {
  let lastExecution = 0;
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>,
  ) {
    let fn: any;
    let patchedFn: any;

    if (descriptor) {
      fn = descriptor.value;
    }

    return {
      configurable: true,
      enumerable: false,
      get() {
        if (!patchedFn) {
          patchedFn = (...args: any[]) => {
            const now = Date.now();
            if (now - lastExecution >= delay) {
              lastExecution = now;
              return fn.call(this, ...args);
            }
          };
        }
        return patchedFn;
      },
      set(newFn: any) {
        patchedFn = undefined;
        fn = newFn;
      },
    };
  };
}

export function debounce(delay: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function (...rootArgs: any[]): any {
    let fn: any;
    let patchedFn: any;

    if (rootArgs[2]) {
      fn = rootArgs[2].value;
    }

    return {
      configurable: true,
      enumerable: false,
      get() {
        if (!patchedFn) {
          let lastInvoked = 0;
          let timeout: any;
          patchedFn = function (...args: any[]) {
            const now = Date.now();
            const timeSinceLastInvoked = now - lastInvoked;

            lastInvoked = now;

            const later = () => {
              if (timeout) {
                clearTimeout(timeout);
              }
              // @ts-ignore
              fn.call(this, ...args);
              lastInvoked = now;
            };

            if (timeSinceLastInvoked > delay) {
              later();
            } else {
              if (timeout) {
                clearTimeout(timeout);
              }
              timeout = setTimeout(
                later,
                Math.max(0, delay - timeSinceLastInvoked),
              );
            }

            return;
          };
        }
        return patchedFn;
      },
      set(newFn: any) {
        patchedFn = undefined;
        fn = newFn;
      },
    };
  };
}

export function perf(...rootArgs: any[]): any {
  let fn: any;
  let patchedFn: any;

  if (rootArgs[2]) {
    fn = rootArgs[2].value;
  }

  return {
    configurable: true,
    enumerable: false,
    get() {
      if (!patchedFn) {
        patchedFn = async function (...args: any[]) {
          const t0 = performance.now();
          // @ts-ignore
          const res = await fn.call(this, ...args);
          const t1 = performance.now();
          console.log(
            `Execution time: ${t1 - t0} milliseconds (${rootArgs[1]})`,
          );
          return res;
        };
      }
      return patchedFn;
    },
    set(newFn: any) {
      patchedFn = undefined;
      fn = newFn;
    },
  };
}
