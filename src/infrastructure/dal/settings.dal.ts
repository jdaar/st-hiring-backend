import { Db, MongoServerError } from 'mongodb';
import { Setting, SettingsRepository, SettingValue, UpsertSettingInput } from '@st-hiring/shared';
import { SettingAlreadyExistsError, SettingNotFoundError, SettingVersionConflictError } from '../../errors/application-errors';

interface SettingDocument {
  _id: string;
  value: SettingValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const MONGODB_DUPLICATE_KEY = 11000;

const toSetting = ({ _id, ...rest }: SettingDocument): Setting => ({ id: _id, ...rest });

export const createSettingsRepository = (db: Db): SettingsRepository => {
  const settings = db.collection<SettingDocument>('settings');

  return {
    async getSettings() {
      const documents = await settings.find().sort({ _id: 1 }).toArray();
      return documents.map(toSetting);
    },

    async upsertSetting(input: UpsertSettingInput) {
      const now = new Date();

      if ('version' in input) {
        const updated = await settings.findOneAndUpdate(
          { _id: input.id, version: input.version },
          { $set: { value: input.value, updatedAt: now }, $inc: { version: 1 } },
          { returnDocument: 'after' },
        );
        if (updated) return toSetting(updated);

        const exists = await settings.countDocuments({ _id: input.id }, { limit: 1 });
        throw exists ? new SettingVersionConflictError(input.id, input.version) : new SettingNotFoundError(input.id);
      }

      const document: SettingDocument = { _id: input.id, value: input.value, version: 1, createdAt: now, updatedAt: now };
      try {
        await settings.insertOne(document);
        return toSetting(document);
      } catch (error) {
        if (error instanceof MongoServerError && error.code === MONGODB_DUPLICATE_KEY) {
          throw new SettingAlreadyExistsError(input.id);
        }
        throw error;
      }
    },
  };
};
