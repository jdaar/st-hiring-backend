import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { Db, MongoClient } from 'mongodb';
import { SettingDocument } from '../../dal/settings.dal';

const PROMOTIONAL_CODES = 5;

// replaces every setting with a random order limit and a ;-separated list of promotional codes
export const seedSettings = async (db: Db) => {
  const settings = db.collection<SettingDocument>('settings');
  const now = new Date();
  const document = (_id: string, value: SettingDocument['value']): SettingDocument => ({
    _id,
    value,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const documents = [
    document('maxTicketsPerOrder', faker.number.int({ min: 3, max: 10 })),
    document(
      'promotionalCodes',
      faker.helpers
        .multiple(() => faker.string.alphanumeric({ length: 8, casing: 'upper' }), { count: PROMOTIONAL_CODES })
        .join(';'),
    ),
  ];

  await settings.deleteMany({});
  await settings.insertMany(documents);
  return documents;
};

if (require.main === module) {
  void (async () => {
    const mongo = await new MongoClient(process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017').connect();
    try {
      const documents = await seedSettings(mongo.db(process.env.MONGO_DB ?? 'seetickets'));
      documents.forEach(({ _id, value }) => console.log(`${_id}: ${value}`));
    } finally {
      await mongo.close();
    }
  })();
}
