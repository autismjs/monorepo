import { Pool } from 'pg';
import groups from '../../../static/groups.json';

export type DatabaseOptions = {
  host?: string;
  pgPort?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
};

export type GroupInfo = {
  groupId: string;
  title: string;
  description: string;
  iconUrl: string;
};

export default class Database {
  #pool: Pool;

  constructor(options?: DatabaseOptions) {
    this.#pool = new Pool(options);
  }

  async start() {
    await this.#pool.connect();
    await this.#prepareTables();
  }

  async #prepareTables() {
    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        commitment VARCHAR(66) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS users_group_idx ON users (group_id);
      
      CREATE TABLE IF NOT EXISTS groups (
        group_id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(4095) NOT NULL,
        icon_url VARCHAR(255)
      );
    `);

    for (const group of groups) {
      await this.#pool.query(
        `
        INSERT INTO groups(group_id, title, description)
        SELECT $1::text, $2, $3
        WHERE
        NOT EXISTS (
          SELECT * FROM groups WHERE group_id = $1::text
        );
      `,
        [group.id, group.title, group.description],
      );
    }
  }

  async insertCommitment(commitment: string, groupId: string) {
    await this.#pool.query(
      `
      INSERT INTO users(commitment, group_id)
      VALUES ($1, $2)
    `,
      [commitment, groupId],
    );
  }

  async updateCommitment(
    newCommitment: string,
    groupId: string,
    oldCommitment: string,
  ) {
    await this.#pool.query(
      `
      UPDATE users(commitment, group_id)
      SET commitment = $1
      WHERE group_id = $2 AND commitment = $3
    `,
      [newCommitment, groupId, oldCommitment],
    );
  }

  async getGroupInfo(groupId: string): Promise<GroupInfo | null> {
    const res = await this.#pool.query(
      `
      SELECT * FROM groups
      WHERE group_id = $1
    `,
      [groupId],
    );

    return res?.rows[0] || null;
  }

  async getGroups(): Promise<GroupInfo[]> {
    const res = await this.#pool.query(
      `
      SELECT * FROM groups
    `,
      [],
    );

    return res.rows;
  }
}
