import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv/config', () => ({}));

const loadConfig = async () => (await import('./knexfile')).default;

describe('knexfile', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const name of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) vi.stubEnv(name, undefined);
  });

  it('connects to the local database by default', async () => {
    // Arrange
    const expected = {
      host: 'localhost',
      ssl: false,
      port: 5432,
      user: 'root',
      password: 'example',
      database: 'seetickets',
    };

    // Act
    const config = await loadConfig();

    // Assert
    expect(config.development).toMatchObject({
      client: 'postgresql',
      connection: expected,
      pool: { min: 2, max: 10 },
      migrations: { tableName: 'knex_migrations', directory: './database/migrations' },
      seeds: { directory: './database/seeds' },
    });
  });

  it('connects to the database given by the environment', async () => {
    // Arrange
    vi.stubEnv('DB_HOST', 'db.internal');
    vi.stubEnv('DB_PORT', '6543');
    vi.stubEnv('DB_USER', 'app');
    vi.stubEnv('DB_PASSWORD', 'secret');
    vi.stubEnv('DB_NAME', 'tickets');

    // Act
    const config = await loadConfig();

    // Assert
    expect(config.development.connection).toEqual({
      host: 'db.internal',
      ssl: false,
      port: 6543,
      user: 'app',
      password: 'secret',
      database: 'tickets',
    });
  });
});
