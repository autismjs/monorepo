import crypto, { Hash } from 'crypto';

export const strip0x = (data: string | bigint): string => {
  if (typeof data === 'string') {
    if (/^(0x)[0-9a-fA-F]+$/.test(data)) {
      return BigInt(data).toString(16);
    }
    return BigInt('0x' + data).toString(16);
  }

  return data.toString(16);
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

export const sha256 = (
  data: string | Buffer | bigint,
  encodig?: 'hex',
): string | Hash => {
  let h = crypto.createHash('sha256');
  h = h.update(bufferify(data));
  return encodig ? h.digest(encodig) : h;
};
