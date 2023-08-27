import crypto from 'crypto';

export const strip0x = (data: string | bigint): string => {
  return BigInt(data).toString(16);
};

export const bufferify = (data: string | bigint | Buffer): Buffer => {
  if (data instanceof Buffer) return data;
  return Buffer.from(hexify(data), 'hex');
};

export const hexify = (data: string | Buffer | bigint, prefix = ''): string => {
  let hex = prefix;

  if (typeof data === 'string') {
    if (/^(0x)?[0-9a-fA-F]+$/.test(data)) {
      hex += Buffer.from(strip0x(data), 'hex').toString('hex');
    } else {
      hex += Buffer.from(data, 'utf-8').toString('hex');
    }
  } else if (typeof data === 'bigint') {
    hex += data.toString(16);
  } else if (data instanceof Buffer) {
    hex += data.toString('hex');
  }

  return hex;
};

export const sha256 = (data: string | string[]): string => {
  let h = crypto.createHash('sha256');

  if (typeof data === 'string') {
    h = h.update(data);
  } else {
    data.forEach((d) => {
      h = h.update(d);
    });
  }

  return h.digest('hex');
};
