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

export function equal(a: any, b: any) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    let length, i;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0; ) if (!equal(a[i], b[i])) return false;
      return true;
    }

    if (a.constructor === RegExp)
      return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf)
      return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString();

    const keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0; ) {
      const key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b;
}
