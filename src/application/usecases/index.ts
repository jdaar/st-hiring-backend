import { EventsRepository, SettingsRepository } from '@st-hiring/shared';
import { createGetPaginatedEventsUseCase } from './get-paginated-events.usecase';

export interface Repositories {
  events: EventsRepository;
  settings: SettingsRepository;
}

export const createUseCases = ({ events }: Repositories) => ({
  getPaginatedEvents: createGetPaginatedEventsUseCase({ eventsRepository: events }),
});

export type UseCases = ReturnType<typeof createUseCases>;
