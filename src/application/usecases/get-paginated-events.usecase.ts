import { EventsRepository, GetPaginatedEventsRequest, GetPaginatedEventsResponse, ResponseBody } from '@st-hiring/shared';

export const createGetPaginatedEventsUseCase =
  ({ eventsRepository }: { eventsRepository: EventsRepository }) =>
  async ({ page, pageSize }: GetPaginatedEventsRequest): Promise<ResponseBody<GetPaginatedEventsResponse>> => {
    const { events, total } = await eventsRepository.getPaginatedEvents(page, pageSize);

    return {
      events,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  };
