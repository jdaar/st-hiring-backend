import { Db, MongoServerError } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingAlreadyExistsError, SettingNotFoundError, SettingVersionConflictError } from '@st-hiring/shared';
import { createSettingsRepository } from './settings.dal';

const NOW = new Date('2026-11-06T12:00:00Z');

const createDb = () => {
  const cursor = { sort: vi.fn(), toArray: vi.fn() };
  cursor.sort.mockReturnValue(cursor);
  const collection = {
    find: vi.fn(() => cursor),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    insertOne: vi.fn(),
  };
  const db = { collection: vi.fn(() => collection) } as unknown as Db;
  return { db, collection, cursor };
};

const document = { _id: 'theme', value: 'dark', version: 2, createdAt: NOW, updatedAt: NOW };
const setting = { id: 'theme', value: 'dark', version: 2, createdAt: NOW, updatedAt: NOW };

describe('settingsRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the settings collection', () => {
    // Arrange
    const { db } = createDb();

    // Act
    createSettingsRepository(db);

    // Assert
    expect(db.collection).toHaveBeenCalledWith('settings');
  });

  it('returns every setting sorted by id', async () => {
    // Arrange
    const { db, collection, cursor } = createDb();
    cursor.toArray.mockResolvedValue([document]);

    // Act
    const result = await createSettingsRepository(db).getSettings();

    // Assert
    expect(collection.find).toHaveBeenCalledWith();
    expect(cursor.sort).toHaveBeenCalledWith({ _id: 1 });
    expect(result).toEqual([setting]);
  });

  it('updates the setting when its version matches', async () => {
    // Arrange
    const { db, collection } = createDb();
    collection.findOneAndUpdate.mockResolvedValue(document);

    // Act
    const result = await createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'dark', version: 1 });

    // Assert
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'theme', version: 1 },
      { $set: { value: 'dark', updatedAt: NOW }, $inc: { version: 1 } },
      { returnDocument: 'after' },
    );
    expect(result).toEqual(setting);
  });

  it('rejects an update of a stale version', async () => {
    // Arrange
    const { db, collection } = createDb();
    collection.findOneAndUpdate.mockResolvedValue(null);
    collection.countDocuments.mockResolvedValue(1);

    // Act
    const result = createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'dark', version: 1 });

    // Assert
    await expect(result).rejects.toBeInstanceOf(SettingVersionConflictError);
    expect(collection.countDocuments).toHaveBeenCalledWith({ _id: 'theme' }, { limit: 1 });
  });

  it('rejects an update of a missing setting', async () => {
    // Arrange
    const { db, collection } = createDb();
    collection.findOneAndUpdate.mockResolvedValue(null);
    collection.countDocuments.mockResolvedValue(0);

    // Act
    const result = createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'dark', version: 1 });

    // Assert
    await expect(result).rejects.toBeInstanceOf(SettingNotFoundError);
  });

  it('creates a setting at version 1', async () => {
    // Arrange
    const { db, collection } = createDb();
    collection.insertOne.mockResolvedValue({ acknowledged: true });

    // Act
    const result = await createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'light' });

    // Assert
    expect(collection.insertOne).toHaveBeenCalledWith({
      _id: 'theme',
      value: 'light',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ id: 'theme', value: 'light', version: 1, createdAt: NOW, updatedAt: NOW });
  });

  it('rejects the creation of an existing setting', async () => {
    // Arrange
    const { db, collection } = createDb();
    collection.insertOne.mockRejectedValue(new MongoServerError({ message: 'duplicate key', code: 11000 }));

    // Act
    const result = createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'light' });

    // Assert
    await expect(result).rejects.toBeInstanceOf(SettingAlreadyExistsError);
  });

  it.each([
    ['another mongo server error', new MongoServerError({ message: 'write conflict', code: 112 })],
    ['any other error', new Error('connection lost')],
  ])('rethrows %s on creation', async (_name, error) => {
    // Arrange
    const { db, collection } = createDb();
    collection.insertOne.mockRejectedValue(error);

    // Act
    const result = createSettingsRepository(db).upsertSetting({ id: 'theme', value: 'light' });

    // Assert
    await expect(result).rejects.toBe(error);
  });
});
