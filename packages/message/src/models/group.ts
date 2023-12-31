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
  #hex: string = '';
  #groupId: string;
  #data: string | string[];

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

      this.#groupId = values[6] as string;

      this.#data =
        this.subtype === GroupSubtype.Broadcast
          ? (next as string)
          : (decodeStrings(0xfff)(next).value as string[]);
    }

    if (typeof param === 'object') {
      this.#groupId = param.groupId;
      this.#data = param.data;
    }
  }

  get subtype(): GroupSubtype {
    return super.subtype;
  }

  get groupId() {
    return this.#groupId;
  }

  get data() {
    return this.#data;
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
    this.#hex =
      super.hex +
      [
        encodeString(this.groupId || '', 0xff),
        this.subtype === GroupSubtype.Broadcast
          ? (this.data as string)
          : encodeStrings((this.data as string[]) || [], 0xfff),
      ].join('');

    return this.#hex;
  }
  get messageId(): string {
    return this.creator + '/' + this.hash;
  }
}
