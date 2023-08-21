import { MessageType } from './base';
import { decode, decodeNumber } from '../utils/encoding';
import { Post, PostJSON } from './post';
import { Moderation, ModerationJSON } from './moderation';
import { Connection, ConnectionJSON } from './connection';
import { Chat, ChatJSON } from './chat';
import { Profile, ProfileJSON } from './profile';
import { Group, GroupJSON } from './group';

export class Message {
  static getType(data: string): MessageType {
    const {
      values: [type],
    } = decode(data, [decodeNumber(0xff)]);
    return type as MessageType;
  }

  static fromJSON(
    json:
      | PostJSON
      | ModerationJSON
      | ConnectionJSON
      | ProfileJSON
      | ChatJSON
      | GroupJSON,
  ): Post | Moderation | Connection | Profile | Chat | Group | null {
    switch (json.type) {
      case MessageType.Post:
        return new Post(json as PostJSON);
      case MessageType.Moderation:
        return new Moderation(json as ModerationJSON);
      case MessageType.Connection:
        return new Connection(json as ConnectionJSON);
      case MessageType.Profile:
        return new Profile(json as ProfileJSON);
      case MessageType.Chat:
        return new Chat(json as ChatJSON);
      case MessageType.Group:
        return new Group(json as GroupJSON);
      default:
        return null;
    }
  }

  static fromHex(
    data: string,
  ): Post | Moderation | Connection | Profile | Chat | Group | null {
    switch (Message.getType(data)) {
      case MessageType.Post:
        return new Post(data);
      case MessageType.Moderation:
        return new Moderation(data);
      case MessageType.Connection:
        return new Connection(data);
      case MessageType.Profile:
        return new Profile(data);
      case MessageType.Chat:
        return new Chat(data);
      case MessageType.Group:
        return new Group(data);
      default:
        return null;
    }
  }
}
