import { GetPaginatedEventsEndpoint, createSuccessResponse } from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';

export const createEventsRoutes = ({ getPaginatedEvents }: UseCases) => [
  createRoute(GetPaginatedEventsEndpoint, async (req, res) => {
    res.json(createSuccessResponse(await getPaginatedEvents(req.query)));
  }),
];
