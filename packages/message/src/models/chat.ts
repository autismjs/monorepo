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
  _subtype: ChatSubtype;
  _hex: string = '';
  _hash: string = '';
  _from?: {
    seed: string;
    key: string;
  };
  _to?: {
    seed: string;
    key: string;
  };
  _destination: string;
  _reference?: string;
  _content?: string;
  _attachment?: string[];

  constructor(param: { [P in keyof ChatJSON]: ChatJSON[P] } | string) {
    super(param);

    if (typeof param === 'string') {
      const { values } = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xff),
        decodeString(0xfff),
        decodeString(0xfff),
        decodeString(0xff),
        decodeStrings(0xfff),
      ]);

      this._type = MessageType.Chat;
      this._subtype = values[1] as ChatSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._from =
        values[4] || values[5]
          ? {
              key: values[4] as string,
              seed: values[5] as string,
            }
          : undefined;
      this._to =
        values[6] || values[7]
          ? {
              key: values[6] as string,
              seed: values[7] as string,
            }
          : undefined;
      this._destination = values[8] as string;
      this._content = values[9] as string;
      this._reference = values[10] as string;
      this._attachment = values[11] as string[];
    }

    if (typeof param === 'object') {
      this._type = MessageType.Chat;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
      this._from = param.from;
      this._to = param.to;
      this._destination = param.destination;
      this._content = param.content;
      this._reference = param.reference;
      this._attachment = param.attachment;
    }
  }

  get subtype(): ChatSubtype {
    return this._subtype;
  }

  get from() {
    return this._from;
  }

  get to() {
    return this._to;
  }

  get destination() {
    return this._destination;
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
    if (this._hex) return this._hex;

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.from?.key || '', 0xff),
      encodeString(this.from?.seed || '', 0xff),
      encodeString(this.to?.key || '', 0xff),
      encodeString(this.to?.seed || '', 0xff),
      encodeString(this.destination || '', 0xfff),
      encodeString(this.content || '', 0xfff),
      encodeString(this.reference || '', 0xff),
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
