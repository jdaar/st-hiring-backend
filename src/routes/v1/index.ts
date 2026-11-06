import { UseCases } from '../../application/usecases';
import { createRouter } from '../create-route';
import { createEventsRoutes } from './events.routes';

export const createV1Router = (useCases: UseCases) => createRouter([...createEventsRoutes(useCases)]);
