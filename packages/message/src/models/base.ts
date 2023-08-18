import { decode, decodeNumber, decodeString } from '../utils/encoding';

export enum MessageType {
  Null = 0,
  Post,
  Moderation,
  Connection,
  Profile,
  Chat,
  Revert,
}

export type BaseJSON = {
  type: MessageType;
  createdAt: Date;
  creator: string;
};

export class Base {
  _type: MessageType;
  _createdAt: Date;
  _creator: string;

  constructor(param: { [B in keyof BaseJSON]: BaseJSON[B] } | string) {
    if (typeof param === 'string') {
      const values = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
      ]);

      this._type = MessageType.Post;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
    }

    if (typeof param === 'object') {
      this._type = param.type;
      this._createdAt = param.createdAt;
      if (param.creator) this._creator = param.creator;
    }
  }

  get type(): MessageType {
    return this._type;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get creator(): string {
    return this._creator;
  }

  get json(): BaseJSON {
    return {
      type: this.type,
      createdAt: this.createdAt,
      creator: this.creator,
    };
  }
}
