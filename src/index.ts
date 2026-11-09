import './tracing';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { knex } from 'knex';
import { MongoClient } from 'mongodb';
import { TRANSACTION_ID_HEADER } from '@st-hiring/shared';
import dbConfig from './knexfile';
import { createEventsRepository } from './dal/events.dal';
import { createSettingsRepository } from './dal/settings.dal';
import { createUseCases } from './application/usecases';
import { createV1Router } from './routes/v1';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { requireTransactionId } from './middleware/transaction-id';

const main = async () => {
  const postgres = knex(dbConfig.development);
  const mongo = await new MongoClient(process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017').connect();

  const useCases = createUseCases({
    events: createEventsRepository(postgres),
    settings: createSettingsRepository(mongo.db(process.env.MONGO_DB ?? 'seetickets')),
  });

  const app = express();
  // first, so error responses carry the headers too; a json api never loads resources or gets framed
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      frameguard: { action: 'deny' },
    }),
  );

  // cors answers preflight requests, which never carry custom headers, before the transaction id is required;
  // the vite dev server proxies the api, so only a separately hosted frontend needs to be allowed (comma separated)
  app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') ?? false, exposedHeaders: [TRANSACTION_ID_HEADER] }));
  app.use(requireTransactionId);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createV1Router(useCases));

  app.get('/', (_req, res) => {
    res.json({ message: 'Hello API' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(3000, () => {
    console.log('Server Started');
  });
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
