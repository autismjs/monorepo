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
  _subtype: PostSubtype;
  _hex: string = '';
  _hash: string = '';
  _topic?: string;
  _title?: string;
  _content?: string;
  _reference?: string;
  _attachment?: string[];

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

      this._topic = values[6] as string;
      this._title = values[7] as string;
      this._content = values[8] as string;
      this._reference = values[9] as string;
      this._attachment = values[10] as string[];
    }

    if (typeof param === 'object') {
      this._topic = param.topic;
      this._title = param.title;
      this._content = param.content;
      this._reference = param.reference;
      this._attachment = param.attachment;
    }
  }

  get subtype(): PostSubtype {
    return this._subtype;
  }

  get topic() {
    return this._topic;
  }

  get title() {
    return this._title;
  }

  get content() {
    return this._content;
  }

  get reference() {
    return this._reference;
  }

  get attachment() {
    return this._attachment;
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
    if (this._hex) return this._hex;

    this._hex =
      super.hex +
      [
        encodeString(this.topic || '', 0xfff),
        encodeString(this.title || '', 0xfff),
        encodeString(this.content || '', 0xffff),
        encodeString(this.reference || '', 0xfff),
        encodeStrings(this.attachment || [], 0xfff),
      ].join('');

    return this._hex;
  }

  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
