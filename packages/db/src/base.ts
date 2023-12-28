import { Any, ModerationSubtype, ConnectionSubtype } from '@message';

export type UserProfileData = {
  name: string;
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  meta: { [k: string]: string };
};

export type PostMeta = {
  moderated: {
    [key in ModerationSubtype]?: boolean;
  };
  moderations: { [subtype: string]: number };
  replies: number;
};

export interface BaseDBAdapter {
  insertMessage(message: Any): Promise<Any | null>;
  getPosts(options?: {
    reverse?: boolean;
    limit?: number;
    offset?: string;
  }): Promise<Any[]>;
  getReplies(
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
    },
  ): Promise<Any[]>;
  getModerations(
    reference: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
      subtype?: ModerationSubtype;
    },
  ): Promise<Any[]>;
  getConnections(
    user: string,
    options?: {
      reverse?: boolean;
      limit?: number;
      offset?: string;
      subtype?: ConnectionSubtype;
    },
  ): Promise<Any[]>;
  getProfile(user: string): Promise<UserProfileData>;
  getPostMeta(reference: string): Promise<PostMeta>;
  getUserMeta(user: string): Promise<{
    outgoingConnections: { [subtype: string]: number };
    incomingConnections: { [subtype: string]: number };
    posts: number;
  }>;
}
