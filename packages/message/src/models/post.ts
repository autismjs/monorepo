import { Base, BaseJSON } from './base';
import {
  encodeString,
  encodeStrings,
  decode,
  decodeNumber,
  decodeString,
  decodeStrings,
} from '../utils/encoding';

export enum PostSubtype {
  Default = 0,
  Comment,
  Repost,
  Cross,
}

export type PostJSON = BaseJSON & {
  subtype: PostSubtype;
  topic?: string;
  title?: string;
  content?: string;
  reference?: string;
  attachment?: string[];
};

export class Post extends Base {
  #hex: string = '';
  #topic?: string;
  #title?: string;
  #content?: string;
  #reference?: string;
  #attachment?: string[];

  constructor(param: { [P in keyof PostJSON]: PostJSON[P] } | string) {
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
        decodeString(0xfff),
        decodeString(0xffff),
        decodeString(0xfff),
        decodeStrings(0xfff),
      ]);

      this.#topic = values[6] as string;
      this.#title = values[7] as string;
      this.#content = values[8] as string;
      this.#reference = values[9] as string;
      this.#attachment = values[10] as string[];
    }

    if (typeof param === 'object') {
      this.#topic = param.topic;
      this.#title = param.title;
      this.#content = param.content;
      this.#reference = param.reference;
      this.#attachment = param.attachment;
    }
  }

  get subtype(): PostSubtype {
    return super.subtype;
  }

  get topic() {
    return this.#topic;
  }

  get title() {
    return this.#title;
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

  get json(): PostJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      topic: this.topic,
      title: this.title,
      content: this.content,
      reference: this.reference,
      attachment: this.attachment,
    };
  }

  get hex(): string {
    this.#hex =
      super.hex +
      [
        encodeString(this.topic || '', 0xfff),
        encodeString(this.title || '', 0xfff),
        encodeString(this.content || '', 0xffff),
        encodeString(this.reference || '', 0xfff),
        encodeStrings(this.attachment || [], 0xfff),
      ].join('');

    return this.#hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
