import { Base, BaseJSON } from './base';
import {
  encodeString,
  decode,
  decodeNumber,
  decodeString,
} from '../utils/encoding';

export enum RevertSubtype {
  Default = 0,
}

export type RevertJSON = BaseJSON & {
  subtype: RevertSubtype;
  reference: string;
};

export class Revert extends Base {
  _subtype: RevertSubtype;
  _hex: string = '';
  _reference: string;

  constructor(param: { [P in keyof RevertJSON]: RevertJSON[P] } | string) {
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

      this._reference = values[6] as string;
    }

    if (typeof param === 'object') {
      this._reference = param.reference;
    }
  }

  get subtype(): RevertSubtype {
    return this._subtype;
  }

  get reference() {
    return this._reference;
  }

  get json(): RevertJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      reference: this.reference,
    };
  }

  get hex(): string {
    if (this._hex) return this._hex;

    this._hex =
      super.hex + [encodeString(this.reference || '', 0xfff)].join('');

    return this._hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
