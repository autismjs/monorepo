import { Worker, isMainThread } from 'worker_threads';
import HttpServer from './index.ts';

function initializeClass() {
  const worker = new Worker(__filename);
}

initializeClass.injected = true;

if (isMainThread) {
  module.exports = initializeClass;
} else {
  module.exports = HttpServer;
}
