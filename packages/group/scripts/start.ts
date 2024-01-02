import GroupRegistry from '../src';

(async () => {
  const registry = new GroupRegistry({
    user: 'postgres',
    password: 'password',
    host: 'localhost',
    pgPort: 5432,
    database: 'group-dev',
    max: 10,
    idleTimeoutMillis: 30000,
  });

  await registry.start();
  console.log(registry);
})();
