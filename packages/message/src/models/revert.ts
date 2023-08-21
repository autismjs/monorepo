import crypto from 'crypto';
import { Base, BaseJSON, MessageType } from './base';
import {
  encodeNumber,
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
  _hash: string = '';
  _reference: string;

  constructor(param: { [P in keyof RevertJSON]: RevertJSON[P] } | string) {
    super(param);

    if (typeof param === 'string') {
      const { values } = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xfff),
      ]);

      this._type = MessageType.Revert;
      this._subtype = values[1] as RevertSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._reference = values[4] as string;
    }

    if (typeof param === 'object') {
      this._type = MessageType.Revert;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
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

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.reference || '', 0xfff),
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
