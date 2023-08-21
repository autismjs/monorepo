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

export enum GroupSubtype {
  Create = 0,
  MemberRequest,
  MemberUpdate,
  Broadcast,
}

type GroupMemberJSON = BaseJSON & {
  subtype: GroupSubtype;
  groupId: string;
  data: string[];
};

type GroupBroadcastJSON = BaseJSON & {
  subtype: GroupSubtype;
  groupId: string;
  data: string;
};

export type GroupJSON = GroupMemberJSON | GroupBroadcastJSON;

export class Group extends Base {
  _subtype: GroupSubtype;
  _hex: string = '';
  _hash: string = '';
  _groupId: string;
  _data: string | string[];

  constructor(param: { [P in keyof GroupJSON]: GroupJSON[P] } | string) {
    super(param);

    if (typeof param === 'string') {
      const { values, next } = decode(param, [
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        decodeString(0xff),
      ]);

      this._type = MessageType.Group;
      this._subtype = values[1] as GroupSubtype;
      this._createdAt = new Date(values[2] as number);
      this._creator = values[3] as string;
      this._groupId = values[4] as string;

      this._data =
        values[1] === GroupSubtype.Broadcast
          ? (next as string)
          : (decodeStrings(0xfff)(next).value as string[]);
    }

    if (typeof param === 'object') {
      this._type = MessageType.Group;
      this._subtype = param.subtype;
      this._createdAt = param.createdAt;
      this._creator = param.creator;
      this._groupId = param.groupId;
      this._data = param.data;
    }
  }

  get subtype(): GroupSubtype {
    return this._subtype;
  }

  get groupId() {
    return this._groupId;
  }

  get data() {
    return this._data;
  }

  get json(): GroupJSON & { hash: string } {
    const json = super.json;
    return {
      ...json,
      hash: this.hash,
      subtype: this.subtype,
      groupId: this.groupId,
      data: this.data as string,
    };
  }

  get hex(): string {
    if (this._hex) return this._hex;

    this._hex = [
      encodeNumber(this.type, 0xff),
      encodeNumber(this.subtype, 0xff),
      encodeNumber(this.createdAt.getTime(), 0xffffffffffff),
      encodeString(this.creator, 0xff),
      encodeString(this.groupId || '', 0xff),
      this.subtype === GroupSubtype.Broadcast
        ? (this.data as string)
        : encodeStrings((this.data as string[]) || [], 0xfff),
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
