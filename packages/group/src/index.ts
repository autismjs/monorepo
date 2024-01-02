import IHttpServer, {
  HttpServerOptions,
  StatusCode,
} from './services/web/index.ts';
import IDatabase, { DatabaseOptions } from './services/db/index.ts';

const HttpServer = require('./services/web/worker.ts');
const Database = require('./services/db/worker.ts');

export default class GroupRegistry {
  #options?: HttpServerOptions & DatabaseOptions;
  #http?: IHttpServer;
  #db?: IDatabase;

  constructor(options?: HttpServerOptions & DatabaseOptions) {
    this.#options = options;
  }
  async start() {
    if (Database) {
      this.#db = new Database(this.#options) as IDatabase;
      if (!Database.injected && this.#db.start) {
        await this.#db.start();
      }
    }

    if (HttpServer) {
      this.#http = new IHttpServer(this.#options) as IHttpServer;
      if (!HttpServer.injected && this.#http.start) {
        await this.#http.start();
      }
    }

    this.#http!.on('/health', (_, res) => {
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'text' });
      res.end('ok');
    });

    this.#http!.on('/groups/:id', async (req, res) => {
      const { id } = req.params!;
      const result = await this.#db?.getGroupInfo(id);
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });

    this.#http!.on('/groups', async (req, res) => {
      console.time('groups');
      const result = await this.#db?.getGroups();
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      console.timeEnd('groups');
    });
  }
}
