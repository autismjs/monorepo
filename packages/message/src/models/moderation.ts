import crypto from 'crypto';
import { Base, BaseJSON, MessageType } from './base';
import {
  encodeNumber,
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
      const values = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xfff),
        decodeString(0xff),
      ]);

      this._type = MessageType.Moderation;
      this._subtype = values[1] as ModerationSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._reference = values[4] as string;
      this._value = values[5] as string;
    }

    if (typeof param === 'object') {
      this._subtype = param.subtype;
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

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.reference || '', 0xfff),
      encodeString(this.value || '', 0xff),
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
