import crypto from 'crypto';
import { Base, BaseJSON, MessageType } from './base';
import {
  encodeNumber,
  encodeString,
  decode,
  decodeNumber,
  decodeString,
} from '../utils/encoding';

export enum ProfileSubtype {
  Name = 0,
  Bio,
  ProfileImageUrl,
  CoverImageUrl,
  Custom,
}

export type ProfileJSON = BaseJSON & {
  subtype: ProfileSubtype;
  key?: string;
  value: string;
};

export class Profile extends Base {
  _subtype: ProfileSubtype;
  _hex: string = '';
  _hash: string = '';
  _key?: string;
  _value: string;

  constructor(param: { [P in keyof ProfileJSON]: ProfileJSON[P] } | string) {
    super(param);

    if (typeof param === 'string') {
      const { values } = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xfff),
      ]);

      this._type = MessageType.Profile;
      this._subtype = values[1] as ProfileSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._key = values[4] as string;
      this._value = values[5] as string;
    }

    if (typeof param === 'object') {
      this._type = MessageType.Profile;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
      this._key = param.key;
      this._value = param.value;
    }
  }

  get subtype(): ProfileSubtype {
    return this._subtype;
  }

  get key() {
    return this._key;
  }

  get value() {
    return this._value;
  }

  get json(): ProfileJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      key: this.key,
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
      encodeString(this.key || '', 0xff),
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
