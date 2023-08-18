export function encodeNumber(num: number, max: number): string {
  if (num > max) throw new Error(`${num} should be less than ${max}`);
  const maxBytes = Math.ceil(Math.log(max + 1) / Math.log(16));
  return num.toString(16).padStart(maxBytes, '0');
}

export function encodeString(data: string, maxLength: number): string {
  const maxBytes = Math.ceil(Math.log(maxLength + 1) / Math.log(16));
  const hex = Buffer.from(data, 'utf-8').toString('hex');
  const len = hex.length;

  if (len >= maxLength) {
    throw new Error(`${hex} should be less than ${maxLength}`);
  }

  const hexlen = len.toString(16).padStart(maxBytes, '0');
  return hexlen + hex;
}

export function encodeStrings(data: string[], maxLength: number): string {
  if (data.length > 0xff) {
    throw new Error('expect array to have less than 255 items');
  }

  const parts = data.map((d) => encodeString(d, maxLength));
  const totalLen = parts.reduce((sum, p) => {
    sum = sum + p.length;
    return sum;
  }, 0);
  if (totalLen > 0xffff)
    throw new Error(
      `expect total length to be less than ${0xffff}; got ${totalLen}`,
    );
  const hexlen = totalLen.toString(16).padStart(4, '0');
  return hexlen + parts.join('');
}

type DecoderResult = {
  next: string;
  data: string;
};

export function decodeNumber(max = 0) {
  return (
    data: string,
  ): DecoderResult & {
    value: number;
  } => {
    const maxBytes = Math.ceil(Math.log(max + 1) / Math.log(16));
    const numhex = data.slice(0, maxBytes);

    if (numhex.length !== maxBytes) {
      throw new Error(`expect ${data} to be less than ${maxBytes}`);
    }

    return {
      data: numhex,
      next: data.slice(maxBytes),
      value: Number('0x' + numhex),
    };
  };
}

export function decodeString(maxLength = 0) {
  return (
    data: string,
  ): DecoderResult & {
    value: string;
  } => {
    const maxBytes = Math.ceil(Math.log(maxLength + 1) / Math.log(16));
    const { value: len } = decodeNumber(maxLength)(data);
    const bodyhex = data.slice(maxBytes, maxBytes + len);

    if (bodyhex.length !== len) {
      throw new Error(`expect ${bodyhex} to have a length of ${len}`);
    }

    return {
      data: bodyhex,
      next: data.slice(maxBytes + len),
      value: Buffer.from(bodyhex, 'hex').toString('utf-8'),
    };
  };
}

export function decode(
  data: string,
  decoders: ((
    data: string,
  ) => DecoderResult & { value: string | number | string[] })[],
): (string | number | string[])[] {
  let _data = data;
  const returnValue = [];

  for (const fn of decoders) {
    const { next, value } = fn(_data);
    returnValue.push(value);
    _data = next;
  }

  return returnValue;
}

export function decodeStrings(maxLength: number) {
  return (
    data: string,
  ): DecoderResult & {
    value: string[];
  } => {
    let _data = data;

    const { value: len, next } = decodeNumber(0xffff)(_data);

    const values = [];

    _data = next.slice(0, len);

    while (!!_data.length) {
      const { next, value } = decodeString(maxLength)(_data);
      _data = next;
      values.push(value);
    }

    return {
      next: data.slice(4 + len),
      data: data.slice(0),
      value: values,
    };
  };
}
