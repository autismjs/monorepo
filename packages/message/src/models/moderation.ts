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
  #hex: string = '';
  #reference: string;
  #value?: string;

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

      this.#reference = values[6] as string;
      this.#value = values[7] as string;
    }

    if (typeof param === 'object') {
      this.#reference = param.reference;
      this.#value = param.value;
    }
  }

  get subtype(): ModerationSubtype {
    return super.subtype;
  }

  get reference() {
    return this.#reference;
  }

  get value() {
    return this.#value;
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
    if (this.#hex) return this.#hex;

    this.#hex =
      super.hex +
      [
        encodeString(this.reference || '', 0xfff),
        encodeString(this.value || '', 0xff),
      ].join('');

    return this.#hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
