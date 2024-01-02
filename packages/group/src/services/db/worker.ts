import { Worker, isMainThread } from 'worker_threads';
import Database from './index.ts';

function initializeClass() {
  new Worker(__filename);
}

initializeClass.injected = true;

if (isMainThread) {
  module.exports = initializeClass;
} else {
  module.exports = Database;
}
