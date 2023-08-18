export enum MessageType {
  Null = 0,
  Post,
  Moderation,
}

export class Message {
  type: MessageType;

  constructor() {}
}
