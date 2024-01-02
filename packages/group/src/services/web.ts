import * as http from 'http';
import { parse } from 'url';
import logger from '../../../utilities/src/logger';

export type HttpServerOptions = {
  port?: number;
};

export default class HttpServer {
  #port: number;

  constructor(options?: HttpServerOptions) {
    const { port = 11014 } = options || {};
    this.#port = port;
  }

  async start() {
    return new Promise((resolve) => {
      const server = http.createServer(this.#onServerStart);
      server.listen(this.#port, () => {
        logger.info(`Server is running on port ${this.#port}`);
        resolve(server);
      });
    });
  }

  #onServerStart = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = parse(req.url || '', true);
    console.log(url);
    res.end('a');
  };
}
