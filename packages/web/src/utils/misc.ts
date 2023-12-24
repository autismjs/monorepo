import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import console from 'console';
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
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const now = Date.now();
      if (now - lastExecution >= delay) {
        lastExecution = now;
        return originalMethod.apply(this, args);
      }

      // console.log(`Method ${key} throttled.`);
    };
  };
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function debugClass(ctr: any, ctx: ClassDecoratorContext) {
  const oldonupdate = ctr.prototype.onupdate;
  ctr.prototype.onupdate = async (): Promise<void> => {
    await oldonupdate();
    console.time(ctx.name);
  };

  const oldonupdated = ctr.prototype.onupdated;
  ctr.prototype.onupdated = async (): Promise<void> => {
    await oldonupdated();
    console.timeEnd(ctx.name);
  };
}
