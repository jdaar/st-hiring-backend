import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { knex } from 'knex';
import { MongoClient } from 'mongodb';
import dbConfig from './knexfile';
import { createEventsRepository } from './dal/events.dal';
import { createSettingsRepository } from './dal/settings.dal';
import { createGetEventsController } from './controllers/get-events';
import { errorHandler } from './middleware/error-handler';

const main = async () => {
  const postgres = knex(dbConfig.development);
  const mongo = await new MongoClient(process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017').connect();

  const repositories = {
    events: createEventsRepository(postgres),
    settings: createSettingsRepository(mongo.db(process.env.MONGO_DB ?? 'seetickets')),
  };

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/events', createGetEventsController({ eventsRepository: repositories.events }));

  app.use('/', (_req, res) => {
    res.json({ message: 'Hello API' });
  });

  app.use(errorHandler);

  app.listen(3000, () => {
    console.log('Server Started');
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
