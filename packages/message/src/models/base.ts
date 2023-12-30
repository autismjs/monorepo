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
  #hex: string = '';
  #hash: string = '';
  #type: MessageType;
  #subtype: number;
  #createdAt: Date;
  #creator: string;
  #proof?: Proof;

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

      if (values[1]) {
        this.#proof = {
          type: values[0] as ProofType,
          value: values[1] as string,
        };
      }
      this.#type = values[2] as number;
      this.#subtype = values[3] as number;
      this.#createdAt = new Date(values[4] as number);
      this.#creator = values[5] as string;
    }

    if (typeof param === 'object') {
      this.#proof = param.proof;
      this.#type = param.type;
      this.#subtype = param.subtype;
      this.#createdAt =
        param.createdAt instanceof Date
          ? param.createdAt
          : new Date(param.createdAt);
      this.#creator = param.creator;
    }
  }

  get type(): MessageType {
    return this.#type;
  }

  get subtype(): number {
    return this.#subtype;
  }

  get createdAt(): Date {
    return this.#createdAt;
  }

  get creator(): string {
    return this.#creator;
  }

  get proof(): Proof | undefined {
    return this.#proof;
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
      encodeNumber(this.#type, 0xff),
      encodeNumber(this.#subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
    ].join('');
  }

  get buffer(): Buffer {
    return Buffer.from(this.hex, 'hex');
  }

  get hash(): string {
    if (this.#hash) return this.#hash;

    const { next } = decode(this.hex, [
      decodeNumber(0xff),
      decodeString(0xfff),
    ]);

    this.#hash = crypto.createHash('sha256').update(next).digest('hex');

    return this.#hash;
  }

  get signed() {
    return !!this.#proof;
  }

  commit(proof: Proof) {
    this.#hex = '';
    this.#proof = proof;
  }
}
