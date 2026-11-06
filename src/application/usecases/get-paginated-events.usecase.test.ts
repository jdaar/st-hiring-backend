import { describe, expect, it, vi } from 'vitest';
import { EventsRepository } from '@st-hiring/shared';
import { createGetPaginatedEventsUseCase } from './get-paginated-events.usecase';

const createRepository = (total: number) =>
  ({ getPaginatedEvents: vi.fn().mockResolvedValue({ events: [{ id: 1 }], total }) }) as unknown as EventsRepository;

describe('getPaginatedEvents', () => {
  it('returns the page of events with its pagination', async () => {
    // Arrange
    const eventsRepository = createRepository(21);
    const getPaginatedEvents = createGetPaginatedEventsUseCase({ eventsRepository });

    // Act
    const result = await getPaginatedEvents({ page: 2, pageSize: 10 });

    // Assert
    expect(eventsRepository.getPaginatedEvents).toHaveBeenCalledWith(2, 10);
    expect(result).toEqual({ events: [{ id: 1 }], pagination: { page: 2, pageSize: 10, total: 21, totalPages: 3 } });
  });

  it('reports no pages when there are no events', async () => {
    // Arrange
    const getPaginatedEvents = createGetPaginatedEventsUseCase({ eventsRepository: createRepository(0) });

    // Act
    const result = await getPaginatedEvents({ page: 1, pageSize: 10 });

    // Assert
    expect(result.pagination).toEqual({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  });
});
