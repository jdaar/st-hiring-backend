import { GetPaginatedEventsRequestSchema, GetPaginatedEventsResponseSchema, createSuccessResponse } from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';

export const createEventsRoutes = ({ getPaginatedEvents }: UseCases) => [
  createRoute({
    method: 'get',
    path: '/events',
    request: { query: GetPaginatedEventsRequestSchema },
    response: GetPaginatedEventsResponseSchema,
    handler: async (req, res) => {
      res.json(createSuccessResponse(await getPaginatedEvents(req.query)));
    },
  }),
];
