import IHttpServer, {
  HttpServerOptions,
  parseJsonBody,
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

    this.#http!.get('/health', (_, res) => {
      res.send('ok');
    });

    this.#http!.get('/groups/:id/members', async (req, res) => {
      res.send(await this.#db?.getGroupMembers(req.params!.id));
    });

    this.#http!.get('/groups/:id', async (req, res) => {
      const { id } = req.params!;
      const result = await this.#db?.getGroupInfo(id);
      res.send(result);
    });

    this.#http!.get('/groups', async (req, res) => {
      const result = await this.#db?.getGroups();
      res.send(result);
    });

    this.#http!.get('/commitments/:commitment', async (req, res) => {
      const { commitment } = req.params!;
      const result = await this.#db?.getGroupsByCommitment(commitment);
      res.send(result);
    });

    this.#http!.post('/groups/:id/members', parseJsonBody, async (req, res) => {
      const { id } = req.params!;
      const { commitment } = req.body!;
      await this.#db!.insertCommitment(commitment, id);
      res.send('ok');
    });
  }
}
