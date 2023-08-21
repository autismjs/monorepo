import crypto from 'crypto';
import {
  decode,
  decodeNumber,
  decodeString,
  encodeNumber,
  encodeString,
} from '../utils/encoding';

export enum MessageType {
  Null = 0,
  Post,
  Moderation,
  Connection,
  Profile,
  Chat,
  Group,
  Revert,
}

export enum ProofType {
  ECDSA = 0,
  Semaphore,
  RLN,
}

export type Proof = {
  type: ProofType;
  value: string;
};

export type BaseJSON = {
  type: MessageType;
  subtype: number;
  createdAt: Date;
  creator: string;
  proof?: Proof;
};

export class Base {
  _hash: string = '';
  _type: MessageType;
  _subtype: number;
  _createdAt: Date;
  _creator: string;
  _proof?: Proof;

  constructor(param: { [B in keyof BaseJSON]: BaseJSON[B] } | string) {
    if (typeof param === 'string') {
      const { values } = decode(param, [
        decodeNumber(0xff),
        decodeString(0xfff),
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
      ]);

      if (values[0] && values[1]) {
        this._proof = {
          type: values[0] as ProofType,
          value: values[1] as string,
        };
      }
      this._type = values[2] as number;
      this._subtype = values[3] as number;
      this._createdAt = new Date(values[4] as number);
      this._creator = values[5] as string;
    }

    if (typeof param === 'object') {
      this._proof = param.proof;
      this._type = param.type;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
    }
  }

  get type(): MessageType {
    return this._type;
  }

  get subtype(): number {
    return this._subtype;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get creator(): string {
    return this._creator;
  }

  get proof(): Proof | undefined {
    return this._proof;
  }

  get json(): BaseJSON {
    return {
      type: this.type,
      subtype: this.subtype,
      createdAt: this.createdAt,
      creator: this.creator,
      proof: this.proof,
    };
  }

  get hex(): string {
    return [
      encodeNumber(this.proof?.type || 0, 0xff),
      encodeString(this.proof?.value || '', 0xfff),
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
    ].join('');
  }

  get hash(): string {
    if (this._hash) return this._hash;

    const { next } = decode(this.hex, [
      decodeNumber(0xff),
      decodeString(0xfff),
    ]);

    this._hash = crypto.createHash('sha256').update(next).digest('hex');

    return this._hash;
  }
}
