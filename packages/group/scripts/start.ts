import GroupRegistry from '../src';

(async () => {
  const registry = new GroupRegistry();
  await registry.start();
  console.log(registry);
})();
