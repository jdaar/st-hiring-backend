import { Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import { seedSettings } from './settings.seed';

const createDb = () => {
  const calls: string[] = [];
  const collection = {
    deleteMany: vi.fn(async () => calls.push('deleteMany')),
    insertMany: vi.fn(async () => calls.push('insertMany')),
  };
  const db = { collection: vi.fn(() => collection) } as unknown as Db;
  return { db, collection, calls };
};

describe('seedSettings', () => {
  it('removes every previous setting before inserting', async () => {
    const { db, collection, calls } = createDb();

    await seedSettings(db);

    expect(db.collection).toHaveBeenCalledWith('settings');
    expect(collection.deleteMany).toHaveBeenCalledWith({});
    expect(calls).toEqual(['deleteMany', 'insertMany']);
  });

  it('inserts an order limit between 3 and 10 and five promotional codes, at version 1', async () => {
    const { db, collection } = createDb();

    const documents = await seedSettings(db);
    const byId = Object.fromEntries(documents.map((document) => [document._id, document]));

    expect(collection.insertMany).toHaveBeenCalledWith(documents);
    expect(Object.keys(byId)).toEqual(['maxTicketsPerOrder', 'promotionalCodes']);
    expect(byId.maxTicketsPerOrder.value).toEqual(expect.any(Number));
    expect(byId.maxTicketsPerOrder.value).toBeGreaterThanOrEqual(3);
    expect(byId.maxTicketsPerOrder.value).toBeLessThanOrEqual(10);
    expect(String(byId.promotionalCodes.value).split(';')).toEqual([
      expect.stringMatching(/^[A-Z0-9]{8}$/),
      expect.stringMatching(/^[A-Z0-9]{8}$/),
      expect.stringMatching(/^[A-Z0-9]{8}$/),
      expect.stringMatching(/^[A-Z0-9]{8}$/),
      expect.stringMatching(/^[A-Z0-9]{8}$/),
    ]);
    documents.forEach((document) => expect(document).toMatchObject({ version: 1 }));
  });
});
