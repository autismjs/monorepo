import { parse } from 'url';
import logger from '../../../../utilities/src/logger.ts';
import { testPath } from '../../../../utilities/src/encoding.ts';
import * as http from 'http';

export type HttpServerOptions = {
  port?: number;
};

export enum StatusCode {
  Ok = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
}

export type Request = http.IncomingMessage & {
  params?: { [key: string]: string };
};

export default class HttpServer {
  #port: number;
  #handlers: [string, (req: Request, res: http.ServerResponse) => void][] = [];
  #server: http.Server;

  constructor(options?: HttpServerOptions) {
    const { port = 11014 } = options || {};
    this.#port = port;
  }

  async start() {
    if (this.#server) return;
    new Promise((resolve) => {
      this.#server = http.createServer(this.#onRequest);
      this.#server.listen(this.#port, () => {
        logger.info(`Server is running on port ${this.#port}`);
        resolve(this.#server);
      });
    });
  }

  #onRequest = (req: Request, res: http.ServerResponse) => {
    const url = parse(req.url || '', true);

    for (const [pattern, handler] of this.#handlers) {
      const params = testPath(pattern, url.pathname);
      if (params) {
        req.params = params;
        handler(req, res);
        return;
      }
    }

    res.writeHead(StatusCode.NotImplemented, { 'Content-Type': 'text' });
    res.end('not implememted');
  };

  on = (
    path: string,
    handler: (req: Request, res: http.ServerResponse) => void,
  ) => {
    this.#handlers.push([path, handler]);
  };
}
