import crypto from 'crypto';
import { Base, BaseJSON, MessageType } from './base';
import {
  encodeNumber,
  encodeString,
  decode,
  decodeNumber,
  decodeString,
} from '../utils/encoding';

export enum ConnectionSubtype {
  Follow = 0,
  Block,
}

export type ConnectionJSON = BaseJSON & {
  subtype: ConnectionSubtype;
  value: string;
};

export class Connection extends Base {
  _subtype: ConnectionSubtype;
  _hex: string = '';
  _hash: string = '';
  _value: string;

  constructor(
    param: { [P in keyof ConnectionJSON]: ConnectionJSON[P] } | string,
  ) {
    super(param);

    if (typeof param === 'string') {
      const { values } = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xfff),
      ]);

      this._type = MessageType.Connection;
      this._subtype = values[1] as ConnectionSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._value = values[4] as string;
    }

    if (typeof param === 'object') {
      this._type = MessageType.Connection;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
      this._value = param.value;
    }
  }

  get subtype(): ConnectionSubtype {
    return this._subtype;
  }

  get value() {
    return this._value;
  }

  get json(): ConnectionJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      value: this.value,
    };
  }

  get hex(): string {
    if (this._hex) return this._hex;

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.value || '', 0xfff),
    ].join('');

    return this._hex;
  }

  get hash(): string {
    if (this._hash) return this._hash;

    this._hash = crypto.createHash('sha256').update(this.hex).digest('hex');

    return this._hash;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
