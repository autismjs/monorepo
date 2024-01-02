import HttpServer from './services/web.ts';

export default class GroupRegistry {
  #http: HttpServer;
  constructor() {
    this.#http = new HttpServer();
  }

  async start() {
    await this.#http.start();
    console.log('started');
  }
}
