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

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export type Request = http.IncomingMessage & {
  params?: { [key: string]: string };
  body?: any;
};

export type Response = http.ServerResponse & {
  send(data?: any): void;
};

export type Next = (request?: Request) => void;

export type RouteHandler = (
  request: Request,
  response: Response,
  next: Next,
) => Promise<void> | void;

export default class HttpServer {
  #port: number;
  #handlers: [
    HttpMethod,
    string, // pattern
    RouteHandler[],
  ][] = [];
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

  #onRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = parse(req.url || '', true);

    for (const [method, pattern, handlers] of this.#handlers) {
      const params = testPath(pattern, url.pathname);

      if (params && req.method === method) {
        let request = requestify(req, params);
        const response = responsify(res);

        for (const handler of handlers) {
          request = await new Promise(async (resolve) => {
            try {
              await handler(
                request,
                response,
                // @ts-ignore
                resolve,
              );
            } catch (e) {
              response.writeHead(StatusCode.InternalServerError, {
                'Content-Type': 'application/json',
              });
              response.send(e.message);
              logger.error(e);
              return;
            }
          });
        }

        return;
      }
    }

    res.writeHead(StatusCode.NotImplemented, { 'Content-Type': 'text' });
    res.end('not implememted');
  };

  get = (path: string, ...handler: RouteHandler[]) => {
    this.#handlers.push([HttpMethod.GET, path, handler]);
  };

  post = (path: string, ...handler: RouteHandler[]) => {
    this.#handlers.push([HttpMethod.POST, path, handler]);
  };
}

function responsify(res: http.ServerResponse): Response {
  // @ts-ignore
  res.send = (data?: any) => {
    if (!data) {
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'text' });
      res.end('');
    } else if (typeof data === 'string') {
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'text' });
      res.end(data);
    } else {
      res.writeHead(StatusCode.Ok, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }
  };

  return res as Response;
}

function requestify(
  req: http.IncomingMessage,
  params?: { [key: string]: string },
): Request {
  // @ts-ignore
  req.params = params;
  return req as Request;
}

export function parseJsonBody(req: Request, res: Response, next: Next) {
  const requestBody: any[] = [];
  req.on('data', (chunks) => {
    requestBody.push(chunks);
  });

  req.on('end', () => {
    try {
      const parsedData = Buffer.concat(requestBody).toString();
      req.body = JSON.parse(parsedData);
      next(req);
    } catch (e) {}
  });

  req.on('error', () => {});
}
