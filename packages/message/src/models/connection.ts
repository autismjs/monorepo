import { Base, BaseJSON } from './base';
import {
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
        // header
        decodeNumber(0xff),
        decodeString(0xfff),
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        // content
        decodeString(0xfff),
      ]);

      this._value = values[6] as string;
    }

    if (typeof param === 'object') {
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

    this._hex = super.hex + [encodeString(this.value || '', 0xfff)].join('');

    return this._hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
