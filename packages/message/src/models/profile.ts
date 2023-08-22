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
  #hex: string = '';
  #key?: string;
  #value: string;

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

      this.#key = values[6] as string;
      this.#value = values[7] as string;
    }

    if (typeof param === 'object') {
      this.#key = param.key;
      this.#value = param.value;
    }
  }

  get subtype(): ProfileSubtype {
    return super.subtype;
  }

  get key() {
    return this.#key;
  }

  get value() {
    return this.#value;
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
    if (this.#hex) return this.#hex;

    this.#hex =
      super.hex +
      [
        encodeString(this.key || '', 0xff),
        encodeString(this.value || '', 0xfff),
      ].join('');

    return this.#hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
