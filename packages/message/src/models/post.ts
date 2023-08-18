import crypto from 'crypto';
import { Base, BaseJSON, MessageType } from './base';
import {
  encodeNumber,
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
      const values = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xfff),
        decodeString(0xfff),
        decodeString(0xffff),
        decodeString(0xfff),
        decodeStrings(0xfff),
      ]);

      this._type = MessageType.Post;
      this._subtype = values[1] as PostSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._topic = values[4] as string;
      this._title = values[5] as string;
      this._content = values[6] as string;
      this._reference = values[7] as string;
      this._attachment = values[8] as string[];
    }

    if (typeof param === 'object') {
      this._subtype = param.subtype;
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

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.topic || '', 0xfff),
      encodeString(this.title || '', 0xfff),
      encodeString(this.content || '', 0xffff),
      encodeString(this.reference || '', 0xfff),
      encodeStrings(this.attachment || [], 0xfff),
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
