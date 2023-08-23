import {
  Any,
  ModerationSubtype,
  ConnectionSubtype,
} from 'autism-message/build/index';

export type UserProfileData = {
  name: string;
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  meta: { [k: string]: string };
};

export interface BaseDBAdapter {
  insertMessage(message: Any): Promise<void>;
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
}
