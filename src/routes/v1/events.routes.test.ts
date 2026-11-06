import { describe, expect, it, vi } from 'vitest';
import { GetPaginatedEventsEndpoint } from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';
import { createEventsRoutes } from './events.routes';

vi.mock('../create-route', () => ({ createRoute: vi.fn((contract, handler) => ({ contract, handler })) }));

describe('createEventsRoutes', () => {
  it('serves the paginated events endpoint', () => {
    // Arrange
    const useCases = { getPaginatedEvents: vi.fn() } as unknown as UseCases;

    // Act
    const routes = createEventsRoutes(useCases);

    // Assert
    expect(routes).toHaveLength(1);
    expect(createRoute).toHaveBeenCalledWith(GetPaginatedEventsEndpoint, expect.any(Function));
  });

  it('answers with the page of events for the query', async () => {
    // Arrange
    const page = { events: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
    const getPaginatedEvents = vi.fn().mockResolvedValue(page);
    createEventsRoutes({ getPaginatedEvents } as unknown as UseCases);
    const [, handler] = vi.mocked(createRoute).mock.calls[0];
    const req = { query: { page: 1, pageSize: 10 } };
    const res = { json: vi.fn() };

    // Act
    await handler(req as never, res as never);

    // Assert
    expect(getPaginatedEvents).toHaveBeenCalledWith(req.query);
    expect(res.json).toHaveBeenCalledWith({ isSuccess: true, body: page });
  });
});
