import { Base, BaseJSON } from './base';
import {
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
        // header
        decodeNumber(0xff),
        decodeString(0xfff),
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        // content
        decodeString(0xff),
        decodeString(0xfff),
      ]);

      this._key = values[6] as string;
      this._value = values[7] as string;
    }

    if (typeof param === 'object') {
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

    this._hex =
      super.hex +
      [
        encodeString(this.key || '', 0xff),
        encodeString(this.value || '', 0xfff),
      ].join('');

    return this._hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
