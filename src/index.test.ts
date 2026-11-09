import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRANSACTION_ID_HEADER } from '@st-hiring/shared';

const mocks = vi.hoisted(() => {
  const app = { use: vi.fn(), get: vi.fn(), listen: vi.fn() };
  const mongo = { db: vi.fn(() => 'mongo db') };
  return {
    app,
    mongo,
    express: Object.assign(
      vi.fn(() => app),
      { json: vi.fn(() => 'json middleware') },
    ),
    cors: vi.fn(() => 'cors middleware'),
    helmet: vi.fn(() => 'helmet middleware'),
    knex: vi.fn(() => 'postgres'),
    connect: vi.fn(),
    MongoClient: vi.fn(),
    createEventsRepository: vi.fn(() => 'events repository'),
    createSettingsRepository: vi.fn(() => 'settings repository'),
    createUseCases: vi.fn(() => 'use cases'),
    createV1Router: vi.fn(() => 'v1 router'),
  };
});

vi.mock('./tracing', () => ({}));
vi.mock('express', () => ({ default: mocks.express }));
vi.mock('cors', () => ({ default: mocks.cors }));
vi.mock('helmet', () => ({ default: mocks.helmet }));
vi.mock('knex', () => ({ knex: mocks.knex }));
vi.mock('mongodb', () => ({ MongoClient: mocks.MongoClient }));
vi.mock('./knexfile', () => ({ default: { development: 'development config' } }));
vi.mock('./dal/events.dal', () => ({ createEventsRepository: mocks.createEventsRepository }));
vi.mock('./dal/settings.dal', () => ({ createSettingsRepository: mocks.createSettingsRepository }));
vi.mock('./application/usecases', () => ({ createUseCases: mocks.createUseCases }));
vi.mock('./routes/v1', () => ({ createV1Router: mocks.createV1Router }));
vi.mock('./middleware/error-handler', () => ({ errorHandler: 'error handler' }));
vi.mock('./middleware/not-found-handler', () => ({ notFoundHandler: 'not found handler' }));
vi.mock('./middleware/transaction-id', () => ({ requireTransactionId: 'transaction id middleware' }));

const startServer = async () => {
  await import('./index');
  await vi.waitFor(() => expect(mocks.app.listen).toHaveBeenCalled());
};

const routeHandler = (path: string) => mocks.app.get.mock.calls.find(([route]) => route === path)?.[1];

describe('server', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('MONGO_URI', undefined);
    vi.stubEnv('MONGO_DB', undefined);
    vi.stubEnv('CORS_ORIGINS', undefined);
    mocks.connect.mockResolvedValue(mocks.mongo);
    mocks.MongoClient.mockImplementation(() => ({ connect: mocks.connect }));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  it('connects to the local databases by default', async () => {
    // Arrange
    const expectedUri = 'mongodb://root:example@localhost:27017';

    // Act
    await startServer();

    // Assert
    expect(mocks.knex).toHaveBeenCalledWith('development config');
    expect(mocks.MongoClient).toHaveBeenCalledWith(expectedUri);
    expect(mocks.mongo.db).toHaveBeenCalledWith('seetickets');
  });

  it('connects to the mongo database given by the environment', async () => {
    // Arrange
    vi.stubEnv('MONGO_URI', 'mongodb://mongo.internal:27017');
    vi.stubEnv('MONGO_DB', 'tickets');

    // Act
    await startServer();

    // Assert
    expect(mocks.MongoClient).toHaveBeenCalledWith('mongodb://mongo.internal:27017');
    expect(mocks.mongo.db).toHaveBeenCalledWith('tickets');
  });

  it('builds the use cases from the repositories', async () => {
    // Arrange
    const expectedRepositories = { events: 'events repository', settings: 'settings repository' };

    // Act
    await startServer();

    // Assert
    expect(mocks.createEventsRepository).toHaveBeenCalledWith('postgres');
    expect(mocks.createSettingsRepository).toHaveBeenCalledWith('mongo db');
    expect(mocks.createUseCases).toHaveBeenCalledWith(expectedRepositories);
    expect(mocks.createV1Router).toHaveBeenCalledWith('use cases');
  });

  it('mounts the middleware in order', async () => {
    // Arrange
    const expectedOrder = [
      'helmet middleware',
      'cors middleware',
      'transaction id middleware',
      'json middleware',
      'v1 router',
      'not found handler',
      'error handler',
    ];

    // Act
    await startServer();

    // Assert
    expect(mocks.app.use.mock.calls.map(([middleware]) => middleware)).toEqual(expectedOrder);
    expect(mocks.helmet).toHaveBeenCalledWith({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      frameguard: { action: 'deny' },
    });
  });

  it('allows no cross origin requests by default', async () => {
    // Arrange
    const expectedOptions = { origin: false, exposedHeaders: [TRANSACTION_ID_HEADER] };

    // Act
    await startServer();

    // Assert
    expect(mocks.cors).toHaveBeenCalledWith(expectedOptions);
  });

  it('allows the cross origins given by the environment', async () => {
    // Arrange
    vi.stubEnv('CORS_ORIGINS', 'https://a.example,https://b.example');

    // Act
    await startServer();

    // Assert
    expect(mocks.cors).toHaveBeenCalledWith({
      origin: ['https://a.example', 'https://b.example'],
      exposedHeaders: [TRANSACTION_ID_HEADER],
    });
  });

  it.each([
    ['/health', { status: 'ok' }],
    ['/', { message: 'Hello API' }],
  ])('answers %s', async (path, body) => {
    // Arrange
    await startServer();
    const res = { json: vi.fn() };

    // Act
    routeHandler(path)({} as Request, res as unknown as Response);

    // Assert
    expect(res.json).toHaveBeenCalledWith(body);
  });

  it('answers /health without requiring a transaction id', async () => {
    // Arrange
    await startServer();
    const healthIndex = mocks.app.get.mock.calls.findIndex(([route]) => route === '/health');
    const transactionIdIndex = mocks.app.use.mock.calls.findIndex(([m]) => m === 'transaction id middleware');

    // Act
    const healthOrder = mocks.app.get.mock.invocationCallOrder[healthIndex];
    const transactionIdOrder = mocks.app.use.mock.invocationCallOrder[transactionIdIndex];

    // Assert
    expect(healthOrder).toBeLessThan(transactionIdOrder);
  });

  it('listens on port 3000', async () => {
    // Arrange
    await startServer();
    const [port, onListening] = mocks.app.listen.mock.calls[0];

    // Act
    onListening();

    // Assert
    expect(port).toBe(3000);
    expect(console.log).toHaveBeenCalledWith('Server Started');
  });

  it('exits with an error when a database is unreachable', async () => {
    // Arrange
    const error = new Error('mongo unreachable');
    mocks.connect.mockRejectedValue(error);

    // Act
    await import('./index');
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled());

    // Assert
    expect(console.error).toHaveBeenCalledWith(error);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mocks.app.listen).not.toHaveBeenCalled();
  });
});
