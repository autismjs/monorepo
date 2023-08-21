import { Base, BaseJSON } from './base';
import {
  encodeString,
  decode,
  decodeNumber,
  decodeString,
} from '../utils/encoding';

export enum ModerationSubtype {
  Like = 0,
  Dislike,
  Block,
  ThreadBanlist,
  THreadAllowlist,
  ThreadMentionOnly,
  NSFW,
  Emoji,
}

export type ModerationJSON = BaseJSON & {
  subtype: ModerationSubtype;
  reference: string;
  value?: string;
};

export class Moderation extends Base {
  _subtype: ModerationSubtype;
  _hex: string = '';
  _hash: string = '';
  _reference: string;
  _value?: string;

  constructor(
    param: { [P in keyof ModerationJSON]: ModerationJSON[P] } | string,
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
        decodeString(0xff),
      ]);

      this._reference = values[6] as string;
      this._value = values[7] as string;
    }

    if (typeof param === 'object') {
      this._reference = param.reference;
      this._value = param.value;
    }
  }

  get subtype(): ModerationSubtype {
    return this._subtype;
  }

  get reference() {
    return this._reference;
  }

  get value() {
    return this._value;
  }

  get json(): ModerationJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      reference: this.reference,
      value: this.value,
    };
  }

  get hex(): string {
    if (this._hex) return this._hex;

    this._hex =
      super.hex +
      [
        encodeString(this.reference || '', 0xfff),
        encodeString(this.value || '', 0xff),
      ].join('');

    return this._hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
