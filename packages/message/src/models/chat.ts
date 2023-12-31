import { Base, BaseJSON } from './base';
import {
  encodeString,
  encodeStrings,
  decode,
  decodeNumber,
  decodeString,
  decodeStrings,
} from '../utils/encoding';

export enum ChatSubtype {
  DirectMessage = 0,
  GroupMessage,
  CustomGroupMessage,
}

export type ChatJSON = BaseJSON & {
  subtype: ChatSubtype;
  from?: {
    seed: string;
    key: string;
  };
  to?: {
    seed: string;
    key: string;
  };
  destination: string;
  reference?: string;
  content?: string;
  attachment?: string[];
};

export class Chat extends Base {
  #hex: string = '';
  #from?: {
    seed: string;
    key: string;
  };
  #to?: {
    seed: string;
    key: string;
  };
  #destination: string;
  #reference?: string;
  #content?: string;
  #attachment?: string[];

  constructor(param: { [P in keyof ChatJSON]: ChatJSON[P] } | string) {
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
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xfff),
        decodeString(0xfff),
        decodeString(0xff),
        decodeStrings(0xfff),
      ]);

      this.#from =
        values[6] || values[7]
          ? {
              key: values[6] as string,
              seed: values[7] as string,
            }
          : undefined;
      this.#to =
        values[8] || values[9]
          ? {
              key: values[8] as string,
              seed: values[9] as string,
            }
          : undefined;
      this.#destination = values[10] as string;
      this.#content = values[11] as string;
      this.#reference = values[12] as string;
      this.#attachment = values[13] as string[];
    }

    if (typeof param === 'object') {
      this.#from = param.from;
      this.#to = param.to;
      this.#destination = param.destination;
      this.#content = param.content;
      this.#reference = param.reference;
      this.#attachment = param.attachment;
    }
  }

  get subtype(): ChatSubtype {
    return super.subtype;
  }

  get from() {
    return this.#from;
  }

  get to() {
    return this.#to;
  }

  get destination() {
    return this.#destination;
  }

  get content() {
    return this.#content;
  }

  get reference() {
    return this.#reference;
  }

  get attachment() {
    return this.#attachment;
  }

  get json(): ChatJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      from: this.from,
      to: this.to,
      destination: this.destination,
      content: this.content,
      reference: this.reference,
      attachment: this.attachment,
    };
  }

  get hex(): string {
    this.#hex =
      super.hex +
      [
        // Content
        encodeString(this.from?.key || '', 0xff),
        encodeString(this.from?.seed || '', 0xff),
        encodeString(this.to?.key || '', 0xff),
        encodeString(this.to?.seed || '', 0xff),
        encodeString(this.destination || '', 0xfff),
        encodeString(this.content || '', 0xfff),
        encodeString(this.reference || '', 0xff),
        encodeStrings(this.attachment || [], 0xfff),
      ].join('');

    return this.#hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
