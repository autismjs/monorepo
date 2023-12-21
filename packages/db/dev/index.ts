import { LevelDBAdapter } from '../src';

(async () => {
  const db = new LevelDBAdapter();
  console.log(db);
})();
