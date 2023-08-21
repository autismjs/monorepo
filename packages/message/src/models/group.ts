import { Base, BaseJSON } from './base';
import {
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
        // header
        decodeNumber(0xff),
        decodeString(0xfff),
        decodeNumber(0xff),
        decodeNumber(0xff),
        decodeNumber(0xffffffffffff),
        decodeString(0xff),
        // content
        decodeString(0xff),
      ]);

      this._groupId = values[6] as string;

      this._data =
        this.subtype === GroupSubtype.Broadcast
          ? (next as string)
          : (decodeStrings(0xfff)(next).value as string[]);
    }

    if (typeof param === 'object') {
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

    this._hex =
      super.hex +
      [
        encodeString(this.groupId || '', 0xff),
        this.subtype === GroupSubtype.Broadcast
          ? (this.data as string)
          : encodeStrings((this.data as string[]) || [], 0xfff),
      ].join('');

    return this._hex;
  }
  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
